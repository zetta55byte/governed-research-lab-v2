"""
grl_v2.core.curvature
======================
Curvature-aware Lyapunov analysis via exact Hessian computation.

This module bridges Constitutional OS / GRL v2 with hcderiv by:
  - exposing exact Hessian computation of V(t) w.r.t. [c, u, d]
  - computing the curvature signature (eigenvalues, max eigenvalue)
  - providing a curvature safety policy for governed steps
  - integrating with StabilityEngine via a drop-in extension

Architecture
------------
V(t) = α·c(t) + β·u(t) + γ·d(t)

For a linear V, the Hessian is identically zero. This is the expected
result for the baseline GRL v2 stability function — it means the potential
surface is flat and all directions are equally stable.

The curvature analysis becomes non-trivial when:
  1. V is extended to a nonlinear form (e.g. log-barrier penalties,
     interaction terms between c, u, d)
  2. The state vector is embedded in a higher-dimensional space
     (e.g. agent trajectories, claim graph features)

This module provides both:
  - lyapunov_hessian(): exact Hessian for the current linear V
  - lyapunov_hessian_nonlinear(): exact Hessian for an extended V
    that includes interaction and saturation terms

Usage
-----
    from core.curvature import CurvatureEngine

    engine = CurvatureEngine(alpha=0.4, beta=0.3, gamma=0.3)
    report = engine.analyse([c, u, d])

    if not report.is_safe:
        # reject or shrink the proposed delta
        ...

Requirements
------------
    pip install hcderiv          # NumPy backend (default)
    pip install "hcderiv[jax]"   # JAX backend (optional)

If hcderiv is not installed, the module degrades gracefully:
curvature checks are skipped and a warning is emitted.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field
from typing import Literal, Sequence

import numpy as np

# ── hcderiv import (graceful degradation) ────────────────────────────────────

try:
    # pip install hcderiv installs the 'hypercomplex' Python module
    try:
        from hypercomplex import hessian as _hc_hessian
    except ImportError:
        from hcderiv import hessian as _hc_hessian  # fallback for future rename

    _HCDERIV_AVAILABLE = True
except ImportError:
    _HCDERIV_AVAILABLE = False
    warnings.warn(
        "hcderiv not installed. Curvature analysis will be skipped. "
        "Install with: pip install hcderiv",
        ImportWarning,
        stacklevel=2,
    )


# ── Lyapunov functions ────────────────────────────────────────────────────────


def lyapunov_V(
    state_vec: Sequence[float],
    alpha: float,
    beta: float,
    gamma: float,
) -> float:
    """
    Baseline Lyapunov potential (linear):

        V(t) = α·c(t) + β·u(t) + γ·d(t)

    Parameters
    ----------
    state_vec : [c, u, d]
        Contradiction, uncertainty, drift — all in [0, 1].
    alpha, beta, gamma : float
        Weights (should sum to 1).

    Returns
    -------
    float
        V(t) in [0, 1].
    """
    c, u, d = state_vec
    return alpha * c + beta * u + gamma * d


def lyapunov_V_nonlinear(
    state_vec: Sequence[float],
    alpha: float,
    beta: float,
    gamma: float,
    kappa: float = 0.1,
) -> float:
    """
    Extended nonlinear Lyapunov potential with interaction and saturation:

        V_nl(t) = α·c + β·u + γ·d
                + κ·c·u          (contradiction-uncertainty coupling)
                + κ·u·d          (uncertainty-drift coupling)
                - κ·log(1 + c)   (log-barrier near c=0, penalises rapid rise)

    This gives a non-zero Hessian, making curvature analysis meaningful.
    κ controls the strength of nonlinear coupling (default 0.1).

    Parameters
    ----------
    state_vec : [c, u, d]
    alpha, beta, gamma : float
    kappa : float
        Nonlinear coupling strength.

    Returns
    -------
    float
    """
    c, u, d = state_vec

    # Hyper arithmetic in hcderiv uses method calls (.log(), etc.)
    # This function must use standard Python operators so it works
    # both with plain floats AND with Hyper objects from hcderiv.
    import math

    linear = alpha * c + beta * u + gamma * d
    coupling = kappa * c * u + kappa * u * d
    # Use .log() if c is a Hyper object, math.log if float
    # Handle three cases:
    # - Hyper object (hcderiv NumPy backend): use .log() method
    # - JAX array (hcderiv JAX backend): use jnp.log
    # - plain float: use math.log
    if hasattr(c, "log"):
        # Hyper object from hcderiv NumPy backend
        barrier = -kappa * c.log()
    else:
        try:
            import jax.numpy as jnp
            # Try JAX array path — jnp.log works with Hyper coefficients
            # but the c here may already be a plain float
            barrier = -kappa * jnp.log(1.0 + c)
        except (ImportError, TypeError):
            barrier = -kappa * math.log(1.0 + float(c))

    return linear + coupling + barrier


# ── Hessian computation ───────────────────────────────────────────────────────


def lyapunov_hessian(
    state_vec: Sequence[float],
    alpha: float,
    beta: float,
    gamma: float,
    backend: str = "numpy",
    nonlinear: bool = False,
    kappa: float = 0.1,
) -> np.ndarray | None:
    """
    Compute the exact 3×3 Hessian of V w.r.t. [c, u, d] using hcderiv.

    Parameters
    ----------
    state_vec : [c, u, d]
    alpha, beta, gamma : float
    backend : {"numpy", "jax"}
        Passed through to hcderiv. Use "jax" for XLA acceleration.
    nonlinear : bool
        If True, compute Hessian of V_nl (nonlinear form) instead of V.
        The linear V has H=0 by construction; set nonlinear=True to see
        non-trivial curvature.
    kappa : float
        Nonlinear coupling strength (only used when nonlinear=True).

    Returns
    -------
    np.ndarray of shape (3, 3), or None if hcderiv is not installed.
    """
    if not _HCDERIV_AVAILABLE:
        return None

    x = np.array(state_vec, dtype=float)

    if nonlinear:

        def V_fn(X):
            return lyapunov_V_nonlinear(X, alpha=alpha, beta=beta, gamma=gamma, kappa=kappa)

    else:

        def V_fn(X):
            return lyapunov_V(X, alpha=alpha, beta=beta, gamma=gamma)

    return _hc_hessian(V_fn, x, backend=backend)


# ── Curvature policy ──────────────────────────────────────────────────────────


def max_eigenvalue(H: np.ndarray) -> float:
    """Largest eigenvalue of a real symmetric matrix."""
    return float(np.max(np.linalg.eigvalsh(H)))


def min_eigenvalue(H: np.ndarray) -> float:
    """Smallest eigenvalue of a real symmetric matrix."""
    return float(np.min(np.linalg.eigvalsh(H)))


def is_curvature_safe(
    H: np.ndarray,
    max_eig_threshold: float = 2.0,
    min_eig_threshold: float = -1.0,
) -> bool:
    """
    Curvature safety policy based on eigenvalue bounds.

    A state is curvature-safe if:
      - max eigenvalue ≤ max_eig_threshold  (not too convex / explosive)
      - min eigenvalue ≥ min_eig_threshold  (not strongly concave / unstable)

    Parameters
    ----------
    H : np.ndarray
        3×3 Hessian matrix.
    max_eig_threshold : float
        Upper bound on the largest eigenvalue (default 2.0).
    min_eig_threshold : float
        Lower bound on the smallest eigenvalue (default -1.0).

    Returns
    -------
    bool
    """
    eigvals = np.linalg.eigvalsh(H)
    return float(np.max(eigvals)) <= max_eig_threshold and float(np.min(eigvals)) >= min_eig_threshold


# ── CurvatureReport ───────────────────────────────────────────────────────────


@dataclass
class CurvatureReport:
    """
    Full curvature analysis of a Lyapunov state vector.

    Attributes
    ----------
    state_vec : list[float]
        The [c, u, d] input.
    V : float
        Lyapunov potential at this state.
    H : np.ndarray or None
        3×3 Hessian (None if hcderiv unavailable).
    eigenvalues : list[float]
        Sorted eigenvalues of H (empty if H is None).
    max_eigenvalue : float
        Largest eigenvalue (0.0 if H is None).
    min_eigenvalue : float
        Smallest eigenvalue (0.0 if H is None).
    is_safe : bool
        True if curvature is within safe bounds.
    backend : str
        Which backend was used for Hessian computation.
    hcderiv_available : bool
        Whether hcderiv was installed and used.
    """

    state_vec: list[float]
    V: float
    H: np.ndarray | None
    eigenvalues: list[float] = field(default_factory=list)
    max_eigenvalue: float = 0.0
    min_eigenvalue: float = 0.0
    is_safe: bool = True
    backend: str = "numpy"
    hcderiv_available: bool = False

    def to_dict(self) -> dict:
        return {
            "state_vec": self.state_vec,
            "V": self.V,
            "H": self.H.tolist() if self.H is not None else None,
            "eigenvalues": self.eigenvalues,
            "max_eigenvalue": self.max_eigenvalue,
            "min_eigenvalue": self.min_eigenvalue,
            "is_safe": self.is_safe,
            "backend": self.backend,
            "hcderiv_available": self.hcderiv_available,
        }


# ── CurvatureEngine ───────────────────────────────────────────────────────────


class CurvatureEngine:
    """
    Drop-in extension for StabilityEngine that adds exact curvature analysis.

    Example
    -------
    ::

        from core.curvature import CurvatureEngine

        engine = CurvatureEngine(alpha=0.4, beta=0.3, gamma=0.3)

        # After each delta:
        report = engine.analyse([c, u, d])
        if not report.is_safe:
            reject_delta("Curvature unsafe: max_eig={:.3f}".format(
                report.max_eigenvalue))

    Parameters
    ----------
    alpha, beta, gamma : float
        Lyapunov weights (should match StabilityEngine configuration).
    backend : {"numpy", "jax"}
        Backend for hcderiv Hessian computation.
    nonlinear : bool
        Use the nonlinear V extension for non-trivial curvature.
    kappa : float
        Nonlinear coupling strength (only used when nonlinear=True).
    max_eig_threshold : float
        Curvature safety bound — max eigenvalue upper limit.
    min_eig_threshold : float
        Curvature safety bound — min eigenvalue lower limit.
    """

    def __init__(
        self,
        alpha: float = 0.4,
        beta: float = 0.3,
        gamma: float = 0.3,
        backend: Literal["numpy", "jax"] = "numpy",
        nonlinear: bool = True,
        kappa: float = 0.1,
        max_eig_threshold: float = 2.0,
        min_eig_threshold: float = -1.0,
    ):
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.backend = backend
        self.nonlinear = nonlinear
        self.kappa = kappa
        self.max_eig_threshold = max_eig_threshold
        self.min_eig_threshold = min_eig_threshold
        self._history: list[CurvatureReport] = []

    def analyse(self, state_vec: Sequence[float]) -> CurvatureReport:
        """
        Compute the Lyapunov potential and exact Hessian at state_vec.

        Parameters
        ----------
        state_vec : [c, u, d]
            Contradiction, uncertainty, drift — each in [0, 1].

        Returns
        -------
        CurvatureReport
        """
        sv = list(state_vec)
        V = lyapunov_V(sv, self.alpha, self.beta, self.gamma)

        H = lyapunov_hessian(
            sv,
            self.alpha,
            self.beta,
            self.gamma,
            backend=self.backend,
            nonlinear=self.nonlinear,
            kappa=self.kappa,
        )

        if H is not None:
            eigvals = sorted(np.linalg.eigvalsh(H).tolist())
            max_eig = eigvals[-1]
            min_eig = eigvals[0]
            safe = is_curvature_safe(H, self.max_eig_threshold, self.min_eig_threshold)
        else:
            eigvals, max_eig, min_eig, safe = [], 0.0, 0.0, True

        report = CurvatureReport(
            state_vec=sv,
            V=V,
            H=H,
            eigenvalues=eigvals,
            max_eigenvalue=max_eig,
            min_eigenvalue=min_eig,
            is_safe=safe,
            backend=self.backend,
            hcderiv_available=_HCDERIV_AVAILABLE,
        )
        self._history.append(report)
        return report

    def history(self) -> list[CurvatureReport]:
        """Return all curvature reports computed so far."""
        return self._history

    def tune(self, profile: str) -> None:
        """Tune weights to match a research profile (mirrors StabilityEngine.tune)."""
        profiles = {
            "ai_safety": (0.5, 0.3, 0.2),
            "evals": (0.3, 0.4, 0.3),
            "governance": (0.4, 0.3, 0.3),
            "planning": (0.3, 0.3, 0.4),
            "custom": (0.4, 0.3, 0.3),
        }
        self.alpha, self.beta, self.gamma = profiles.get(profile, (0.4, 0.3, 0.3))
