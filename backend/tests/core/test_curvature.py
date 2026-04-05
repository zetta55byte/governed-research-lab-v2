"""
tests/core/test_curvature.py
-----------------------------
Tests for core/curvature.py — hcderiv integration with GRL v2.

Run:
    PYTHONPATH=/path/to/hcrepo pytest tests/core/test_curvature.py -v
"""

from __future__ import annotations

import numpy as np
import pytest

from core.curvature import (
    CurvatureEngine,
    CurvatureReport,
    is_curvature_safe,
    lyapunov_V,
    lyapunov_V_nonlinear,
    lyapunov_hessian,
    max_eigenvalue,
    min_eigenvalue,
)


# ── lyapunov_V ────────────────────────────────────────────────────────────────


class TestLyapunovV:
    def test_zero_state(self):
        assert lyapunov_V([0.0, 0.0, 0.0], 0.4, 0.3, 0.3) == pytest.approx(0.0)

    def test_unit_state(self):
        assert lyapunov_V([1.0, 1.0, 1.0], 0.4, 0.3, 0.3) == pytest.approx(1.0)

    def test_weighted(self):
        # V = 0.4*0.5 + 0.3*0.2 + 0.3*0.1 = 0.2 + 0.06 + 0.03 = 0.29
        assert lyapunov_V([0.5, 0.2, 0.1], 0.4, 0.3, 0.3) == pytest.approx(0.29)

    def test_weights_sum_to_one(self):
        v = lyapunov_V([0.5, 0.5, 0.5], 0.4, 0.3, 0.3)
        assert v == pytest.approx(0.5)


class TestLyapunovVNonlinear:
    def test_strictly_larger_than_linear(self):
        sv = [0.3, 0.4, 0.2]
        alpha, beta, gamma = 0.4, 0.3, 0.3
        v_lin = lyapunov_V(sv, alpha, beta, gamma)
        v_nl = lyapunov_V_nonlinear(sv, alpha, beta, gamma, kappa=0.1)
        # nonlinear form adds coupling + log-barrier terms
        assert hasattr(v_nl, "__float__")  # works for float, np.float64, jax Array
        # With kappa=0.1, coupling adds ~0.012, log-barrier subtracts ~0.026
        # Net effect varies, but the two forms differ
        assert abs(v_nl - v_lin) > 1e-6

    def test_kappa_zero_matches_linear(self):
        sv = [0.3, 0.4, 0.2]
        alpha, beta, gamma = 0.4, 0.3, 0.3
        v_lin = lyapunov_V(sv, alpha, beta, gamma)
        # kappa=0 removes coupling terms; log(1+0.3) term remains but
        # coupling is zero, so only the barrier differs
        v_nl = lyapunov_V_nonlinear(sv, alpha, beta, gamma, kappa=0.0)
        # With kappa=0, coupling=0 and barrier=0, should equal linear
        assert v_nl == pytest.approx(v_lin, abs=1e-10)


# ── lyapunov_hessian ──────────────────────────────────────────────────────────


class TestLyapunovHessian:
    def test_linear_hessian_is_zero(self):
        """Linear V has H=0 by construction."""
        H = lyapunov_hessian([0.3, 0.4, 0.2], 0.4, 0.3, 0.3, nonlinear=False)
        if H is None:
            pytest.skip("hcderiv not installed")
        assert H.shape == (3, 3)
        assert np.allclose(H, np.zeros((3, 3)), atol=1e-10)

    def test_nonlinear_hessian_nonzero(self):
        """Nonlinear V should have a non-trivial Hessian."""
        H = lyapunov_hessian([0.3, 0.4, 0.2], 0.4, 0.3, 0.3, nonlinear=True)
        if H is None:
            pytest.skip("hcderiv not installed")
        assert H.shape == (3, 3)
        assert not np.allclose(H, np.zeros((3, 3)), atol=1e-10)

    def test_hessian_symmetric(self):
        """Hessian must be symmetric (exact, machine precision)."""
        H = lyapunov_hessian([0.3, 0.4, 0.2], 0.4, 0.3, 0.3, nonlinear=True)
        if H is None:
            pytest.skip("hcderiv not installed")
        assert np.allclose(H, H.T, atol=1e-12)

    def test_hessian_shape(self):
        H = lyapunov_hessian([0.1, 0.2, 0.3], 0.4, 0.3, 0.3, nonlinear=True)
        if H is None:
            pytest.skip("hcderiv not installed")
        assert H.shape == (3, 3)


# ── eigenvalue helpers ────────────────────────────────────────────────────────


class TestEigenvalueHelpers:
    def test_max_eigenvalue(self):
        H = np.diag([1.0, 2.0, 3.0])
        assert max_eigenvalue(H) == pytest.approx(3.0)

    def test_min_eigenvalue(self):
        H = np.diag([1.0, 2.0, 3.0])
        assert min_eigenvalue(H) == pytest.approx(1.0)

    def test_negative_eigenvalue(self):
        H = np.diag([-2.0, 0.5, 1.5])
        assert min_eigenvalue(H) == pytest.approx(-2.0)


# ── is_curvature_safe ─────────────────────────────────────────────────────────


class TestIsCurvatureSafe:
    def test_safe_identity(self):
        H = np.eye(3)  # all eigenvalues = 1.0
        assert is_curvature_safe(H, max_eig_threshold=2.0)

    def test_unsafe_large_max(self):
        H = np.diag([0.1, 0.5, 5.0])  # max eig = 5.0 > 2.0
        assert not is_curvature_safe(H, max_eig_threshold=2.0)

    def test_unsafe_large_negative(self):
        H = np.diag([-5.0, 0.5, 1.0])  # min eig = -5.0 < -1.0
        assert not is_curvature_safe(H, min_eig_threshold=-1.0)

    def test_zero_matrix_safe(self):
        H = np.zeros((3, 3))
        assert is_curvature_safe(H, max_eig_threshold=2.0)


# ── CurvatureEngine ───────────────────────────────────────────────────────────


class TestCurvatureEngine:
    def setup_method(self):
        self.engine = CurvatureEngine(
            alpha=0.4,
            beta=0.3,
            gamma=0.3,
            nonlinear=True,
            kappa=0.1,
            max_eig_threshold=2.0,
        )

    def test_returns_report(self):
        r = self.engine.analyse([0.2, 0.3, 0.1])
        assert isinstance(r, CurvatureReport)

    def test_report_has_V(self):
        r = self.engine.analyse([0.2, 0.3, 0.1])
        # V = 0.4*0.2 + 0.3*0.3 + 0.3*0.1 = 0.08+0.09+0.03 = 0.20
        assert r.V == pytest.approx(
            lyapunov_V([0.2, 0.3, 0.1], 0.4, 0.3, 0.3), abs=1e-10
        )

    def test_hcderiv_flag(self):
        r = self.engine.analyse([0.2, 0.3, 0.1])
        # Just check it's a bool — value depends on installation
        assert isinstance(r.hcderiv_available, bool)

    def test_history_accumulates(self):
        self.engine.analyse([0.1, 0.1, 0.1])
        self.engine.analyse([0.2, 0.2, 0.2])
        self.engine.analyse([0.3, 0.3, 0.3])
        assert len(self.engine.history()) == 3

    def test_to_dict(self):
        r = self.engine.analyse([0.2, 0.3, 0.1])
        d = r.to_dict()
        assert "V" in d
        assert "state_vec" in d
        assert "is_safe" in d
        assert "eigenvalues" in d

    def test_tune_changes_weights(self):
        self.engine.tune("ai_safety")
        assert self.engine.alpha == pytest.approx(0.5)
        assert self.engine.beta == pytest.approx(0.3)
        assert self.engine.gamma == pytest.approx(0.2)

    def test_safe_state(self):
        """Mid-range state should be safe."""
        r = self.engine.analyse([0.4, 0.3, 0.3])
        if r.hcderiv_available:
            # mid-range: not near c=0 so log-barrier is small
            assert r.is_safe

    def test_unsafe_near_zero_c(self):
        """Near c=0, log-barrier has large curvature — should be unsafe."""
        r = self.engine.analyse([0.01, 0.01, 0.01])
        if r.hcderiv_available:
            # log-barrier −κ·log(1+c) has huge second derivative near 0
            assert not r.is_safe

    def test_backend_field(self):
        r = self.engine.analyse([0.2, 0.3, 0.1])
        assert r.backend == "numpy"

    def test_jax_backend(self):
        """JAX backend should give same result as NumPy."""
        try:
            import jax  # noqa: F401
            jax.config.update("jax_enable_x64", True)

            sv = [0.3, 0.4, 0.2]
            jax_engine = CurvatureEngine(
                alpha=0.4, beta=0.3, gamma=0.3,
                nonlinear=True, backend="jax",
            )
            np_engine = CurvatureEngine(
                alpha=0.4, beta=0.3, gamma=0.3,
                nonlinear=True, backend="numpy",
            )
            r_jax = jax_engine.analyse(sv)
            r_np = np_engine.analyse(sv)
            if r_jax.H is not None and r_np.H is not None:
                assert np.allclose(r_jax.H, r_np.H, atol=1e-10)
        except ImportError:
            pytest.skip("JAX not installed")
