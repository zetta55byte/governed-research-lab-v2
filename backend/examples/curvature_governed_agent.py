"""
Curvature-Governed Agent Demo
==============================
Demonstrates how exact Hessian computation (via hcderiv) gates state updates
in a GRL v2 governed research loop.

The scenario:
  - A research agent proposes sequential state updates (deltas).
  - Each proposed state is represented as [c, u, d]:
      c = contradiction fraction
      u = uncertainty fraction
      d = drift from original query
  - The CurvatureEngine computes the exact Hessian of V(t) at the proposed state.
  - If the max eigenvalue exceeds the threshold, the delta is REJECTED.
  - Otherwise it is ACCEPTED and the state advances.

This shows the difference between:
  - Ungoverned baseline: all deltas accepted, system drifts into unstable region.
  - Curvature-governed: high-curvature states rejected, system stays stable.

Run:
    pip install hcderiv
    python examples/curvature_governed_agent.py

Requirements:
    hcderiv  (pip install hcderiv)
    numpy    (included with hcderiv)
"""

from __future__ import annotations

import random
from dataclasses import dataclass

import numpy as np

# Path handling for running from the examples/ dir or backend/ dir
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.curvature import CurvatureEngine  # noqa: E402
from core.stability import compute_lyapunov, compute_metrics  # noqa: E402


# ── Toy state ─────────────────────────────────────────────────────────────────


@dataclass
class ToyState:
    """Minimal research state for the demo."""

    contradiction: float = 0.1
    uncertainty: float = 0.2
    drift: float = 0.1

    def as_vec(self) -> list[float]:
        return [self.contradiction, self.uncertainty, self.drift]

    def apply(self, delta: "ToyDelta") -> "ToyState":
        return ToyState(
            contradiction=max(0.0, min(1.0, self.contradiction + delta.dc)),
            uncertainty=max(0.0, min(1.0, self.uncertainty + delta.du)),
            drift=max(0.0, min(1.0, self.drift + delta.dd)),
        )


@dataclass
class ToyDelta:
    """A proposed change to [c, u, d]."""

    dc: float
    du: float
    dd: float
    label: str = ""


# ── Governed step ─────────────────────────────────────────────────────────────


def governed_step(
    state: ToyState,
    delta: ToyDelta,
    engine: CurvatureEngine,
    verbose: bool = True,
) -> tuple[ToyState, bool]:
    """
    Apply delta if curvature of proposed state is within safe bounds.

    Returns
    -------
    (new_state, accepted)
    """
    proposed = state.apply(delta)
    report = engine.analyse(proposed.as_vec())

    if verbose:
        print(f"  proposed [c={proposed.contradiction:.2f}, "
              f"u={proposed.uncertainty:.2f}, d={proposed.drift:.2f}]")
        if report.H is not None:
            print(f"  Hessian eigenvalues: {[round(e, 4) for e in report.eigenvalues]}")
            print(f"  max_eig={report.max_eigenvalue:.4f}  "
                  f"V={report.V:.3f}  safe={report.is_safe}")
        else:
            print("  (hcderiv not available — curvature check skipped)")

    if report.is_safe:
        return proposed, True
    else:
        return state, False  # reject, keep old state


# ── Scenario: sequential agent proposals ─────────────────────────────────────


def run_demo(seed: int = 42) -> None:
    random.seed(seed)
    np.random.seed(seed)

    print("\n" + "=" * 60)
    print("Curvature-Governed Agent Demo")
    print("=" * 60)
    print("V(t) = α·c + β·u + γ·d + κ·c·u + κ·u·d - κ·log(1+c)")
    print("Exact Hessian via hcderiv  |  max_eig threshold = 2.0")
    print("=" * 60 + "\n")

    engine = CurvatureEngine(
        alpha=0.4,
        beta=0.3,
        gamma=0.3,
        nonlinear=True,
        kappa=0.1,
        max_eig_threshold=2.0,
    )

    # Pre-defined sequence of agent proposals
    # Some are safe, some push into high-curvature regions
    proposals = [
        ToyDelta(dc=+0.05, du=+0.10, dd=+0.05, label="Initial research step"),
        ToyDelta(dc=+0.10, du=+0.05, dd=+0.10, label="Adding more sources"),
        ToyDelta(dc=-0.05, du=-0.10, dd=+0.20, label="Critic narrows claims"),
        ToyDelta(dc=+0.30, du=+0.40, dd=+0.30, label="Speculative leap (unsafe)"),
        ToyDelta(dc=-0.10, du=-0.05, dd=-0.05, label="Synthesiser consolidates"),
        ToyDelta(dc=+0.05, du=+0.05, dd=+0.50, label="Topic drift (borderline)"),
        ToyDelta(dc=-0.05, du=-0.05, dd=-0.10, label="Planner re-anchors query"),
        ToyDelta(dc=+0.05, du=+0.05, dd=+0.05, label="Final synthesis step"),
    ]

    state = ToyState()
    accepted = 0
    rejected = 0

    print(f"Initial state: {state.as_vec()}")
    initial_report = engine.analyse(state.as_vec())
    print(f"Initial V(t) = {initial_report.V:.3f}\n")

    for i, delta in enumerate(proposals):
        print(f"Step {i+1}: {delta.label}")
        state, ok = governed_step(state, delta, engine, verbose=True)
        if ok:
            print("  → ACCEPTED")
            accepted += 1
        else:
            print("  → REJECTED (curvature unsafe)")
            rejected += 1
        print()

    # Summary
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Steps:    {len(proposals)}")
    print(f"Accepted: {accepted}")
    print(f"Rejected: {rejected}")
    print(f"Final state: {state.as_vec()}")

    final_report = engine.analyse(state.as_vec())
    print(f"Final V(t):  {final_report.V:.3f}")
    print(f"Final max_eig: {final_report.max_eigenvalue:.4f}")
    print(f"System stable: {final_report.is_safe}")

    print("\nCurvature trajectory (V values):")
    Vs = [r.V for r in engine.history()]
    for j, v in enumerate(Vs):
        bar = "█" * int(v * 30)
        print(f"  step {j:2d}: V={v:.3f} {bar}")


if __name__ == "__main__":
    run_demo()
