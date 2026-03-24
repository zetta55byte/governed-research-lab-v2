"""
grl_v2.core.stability
======================
Lyapunov stability engine.

V(t) = α·c(t) + β·u(t) + γ·d(t)
S(t) = 1 - V(t)

Computed after every committed delta.
Emitted as stability_update SSE event.
"""

import math
from typing import Optional
from .types import ResearchState, StabilityMetrics


def compute_contradiction(state: ResearchState) -> float:
    """
    c(t): fraction of claims flagged as conflicting.
    Returns [0, 1].
    """
    total = max(1, state.claim_count())
    conflicts = state.conflict_count()
    return min(1.0, conflicts / total)


def compute_uncertainty(state: ResearchState) -> float:
    """
    u(t): fraction of claims with low confidence or marked tentative.
    Returns [0, 1].
    """
    total = max(1, state.claim_count())
    uncertain = state.uncertain_count()
    return min(1.0, uncertain / total)


def compute_drift(state: ResearchState) -> float:
    """
    d(t): semantic distance between current working topics
    and the original query, normalized to [0, 1].

    Uses cosine distance if embeddings are available.
    Falls back to keyword overlap heuristic.
    """
    if state.initial_query_embedding and state.current_embedding:
        return _cosine_distance(
            state.initial_query_embedding,
            state.current_embedding,
        )
    # Fallback: keyword overlap heuristic
    return _keyword_drift(state)


def _cosine_distance(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    similarity = dot / (mag_a * mag_b)
    return max(0.0, min(1.0, 1.0 - similarity))


def _keyword_drift(state: ResearchState) -> float:
    """
    Simple keyword overlap between query terms and current findings.
    Lower overlap = higher drift.
    """
    query_words = set(state.query.lower().split())
    if not query_words:
        return 0.0

    all_text = " ".join(
        str(f.get("content", "")) for f in state.findings[-5:]
    ).lower()
    current_words = set(all_text.split())

    if not current_words:
        return 0.3  # small default drift when no findings yet

    overlap = len(query_words & current_words) / len(query_words)
    return max(0.0, min(1.0, 1.0 - overlap))


def compute_metrics(
    state: ResearchState,
    alpha: float = 0.4,
    beta: float = 0.3,
    gamma: float = 0.3,
) -> StabilityMetrics:
    """Compute all three metrics and return a StabilityMetrics object."""
    return StabilityMetrics(
        contradiction=compute_contradiction(state),
        uncertainty=compute_uncertainty(state),
        drift=compute_drift(state),
        alpha=alpha,
        beta=beta,
        gamma=gamma,
    )


def compute_lyapunov(metrics: StabilityMetrics) -> float:
    """V(t) = α·c(t) + β·u(t) + γ·d(t)"""
    return metrics.V


def stability_score(metrics: StabilityMetrics) -> float:
    """S(t) = 1 - V(t)"""
    return metrics.S


class StabilityEngine:
    """
    Tracks the stability trajectory over the full research session.
    Called after every committed delta.
    """

    def __init__(self, alpha: float = 0.4, beta: float = 0.3, gamma: float = 0.3):
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.history: list[dict] = []   # [{delta_id, score, components, timestamp}]

    def update(self, state: ResearchState, delta_id: str) -> StabilityMetrics:
        """Recompute V(t) and S(t) after a delta is committed."""
        import time
        metrics = compute_metrics(state, self.alpha, self.beta, self.gamma)
        self.history.append({
            "delta_id": delta_id,
            "score": metrics.S,
            "components": metrics.to_dict(),
            "timestamp": time.time(),
        })
        return metrics

    def current_score(self) -> float:
        if not self.history:
            return 1.0
        return self.history[-1]["score"]

    def stability_curve(self) -> list[float]:
        return [h["score"] for h in self.history]

    def full_history(self) -> list[dict]:
        return self.history

    def tune(self, profile: str):
        """Tune α, β, γ weights based on research profile."""
        profiles = {
            "ai_safety":    (0.5, 0.3, 0.2),
            "evals":        (0.3, 0.4, 0.3),
            "governance":   (0.4, 0.3, 0.3),
            "planning":     (0.3, 0.3, 0.4),
            "custom":       (0.4, 0.3, 0.3),
        }
        self.alpha, self.beta, self.gamma = profiles.get(profile, (0.4, 0.3, 0.3))
