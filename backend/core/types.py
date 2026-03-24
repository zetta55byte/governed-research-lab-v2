"""
grl_v2.core.types
==================
The complete type system for GRL v2.

New ontology vs v1:
  - Deltas are first-class citizens with forward/inverse operations
  - Multi-agent continuity chain with observers + contested_by
  - Lyapunov stability V(t) = α·c(t) + β·u(t) + γ·d(t)
  - Stability score S(t) = 1 - V(t)
  - SSE events are the universal contract between backend and frontend
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Optional
import time
import uuid


# ─── Membranes ────────────────────────────────────────────────────────────────

class Membrane(str, Enum):
    M1_SAFETY = "M1_SAFETY"
    M2_REVERSIBILITY = "M2_REVERSIBILITY"
    M3_PLURALISM = "M3_PLURALISM"
    M4_HUMAN_PRIMACY = "M4_HUMAN_PRIMACY"


class MembraneVerdict(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    DEFER = "defer"


# ─── Delta (reversible state transition) ─────────────────────────────────────

@dataclass
class DeltaOp:
    """A single JSON-patch-style operation."""
    op: str          # "add" | "remove" | "replace"
    path: str        # e.g. "/claims/3"
    value: Any = None

    def to_dict(self) -> dict:
        d = {"op": self.op, "path": self.path}
        if self.value is not None:
            d["value"] = self.value
        return d


@dataclass
class Delta:
    """
    A reversible state transition proposed by an agent.
    State(t+1) = State(t) ⊕ Delta(t)
    """
    delta_id: str
    agent_id: str
    session_id: str
    stage: str                    # "plan" | "action" | "delta"
    description: str
    forward: list[DeltaOp]        # what to apply
    inverse: list[DeltaOp]        # how to undo it
    reversible: bool = True
    metadata: dict = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)

    # Filled in after membrane evaluation
    membrane_results: dict[str, str] = field(default_factory=dict)
    verdict: MembraneVerdict = MembraneVerdict.ALLOW
    observers: list[str] = field(default_factory=list)
    contested_by: list[str] = field(default_factory=list)
    stability_after: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "delta_id": self.delta_id,
            "agent_id": self.agent_id,
            "session_id": self.session_id,
            "stage": self.stage,
            "description": self.description,
            "forward": [op.to_dict() for op in self.forward],
            "inverse": [op.to_dict() for op in self.inverse],
            "reversible": self.reversible,
            "membrane_results": self.membrane_results,
            "verdict": self.verdict.value,
            "observers": self.observers,
            "contested_by": self.contested_by,
            "stability_after": self.stability_after,
            "timestamp": self.timestamp,
        }


# ─── Research state ───────────────────────────────────────────────────────────

@dataclass
class Claim:
    claim_id: str
    text: str
    agent_id: str
    confidence: float = 0.7
    tentative: bool = False
    conflicting_with: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ResearchState:
    """
    The mutable state of the research system.
    Transitions via committed deltas.
    """
    session_id: str
    query: str
    initial_query_embedding: list[float] = field(default_factory=list)
    current_embedding: list[float] = field(default_factory=list)
    claims: list[Claim] = field(default_factory=list)
    findings: list[dict] = field(default_factory=list)
    hypotheses: list[dict] = field(default_factory=list)
    critiques: list[dict] = field(default_factory=list)
    synthesis: Optional[str] = None
    delta_count: int = 0

    def claim_count(self) -> int:
        return len(self.claims)

    def conflict_count(self) -> int:
        return sum(1 for c in self.claims if c.conflicting_with)

    def uncertain_count(self) -> int:
        return sum(1 for c in self.claims if c.tentative or c.confidence < 0.5)


# ─── Stability (Lyapunov) ─────────────────────────────────────────────────────

@dataclass
class StabilityMetrics:
    """
    Components of the Lyapunov potential V(t).
    V(t) = α·c(t) + β·u(t) + γ·d(t)
    S(t) = 1 - V(t)
    """
    contradiction: float    # c(t): fraction of conflicting claims [0,1]
    uncertainty: float      # u(t): fraction of low-confidence claims [0,1]
    drift: float            # d(t): semantic distance from original query [0,1]
    alpha: float = 0.4
    beta: float = 0.3
    gamma: float = 0.3

    @property
    def V(self) -> float:
        return (self.alpha * self.contradiction
                + self.beta * self.uncertainty
                + self.gamma * self.drift)

    @property
    def S(self) -> float:
        return round(max(0.0, min(1.0, 1.0 - self.V)), 4)

    def to_dict(self) -> dict:
        return {
            "contradiction": round(self.contradiction, 4),
            "uncertainty": round(self.uncertainty, 4),
            "drift": round(self.drift, 4),
            "V": round(self.V, 4),
            "S": self.S,
        }


# ─── Graph (D3 data shape) ────────────────────────────────────────────────────

@dataclass
class GraphNode:
    id: str
    label: str
    role: str    # "query"|"planner"|"research"|"critic"|"synthesizer"|"human"|"tool"
    status: str = "idle"    # "idle"|"running"|"blocked"|"done"
    membrane_state: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class GraphLink:
    id: str
    source: str
    target: str
    kind: str    # "message"|"delta"|"tool_call"|"tool_result"
    label: str = ""
    membrane_stage: str = ""
    membrane_result: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


# ─── SSE Events (the universal contract) ─────────────────────────────────────

@dataclass
class SSEEvent:
    """Base SSE event. All six event types inherit from this."""
    type: str
    timestamp: float = field(default_factory=time.time)
    session_id: str = ""

    def to_dict(self) -> dict:
        return {"type": self.type, "timestamp": self.timestamp, "session_id": self.session_id}


@dataclass
class AgentUpdateEvent(SSEEvent):
    type: str = "agent_update"
    agent_id: str = ""
    agent_name: str = ""
    status: str = ""
    message: str = ""

    def to_dict(self) -> dict:
        return {**super().to_dict(), "agent_id": self.agent_id,
                "agent_name": self.agent_name, "status": self.status, "message": self.message}


@dataclass
class MembraneCheckEvent(SSEEvent):
    type: str = "membrane_check"
    agent_id: str = ""
    stage: str = ""
    membrane: str = ""
    result: str = ""
    reason: str = ""
    delta_id: str = ""

    def to_dict(self) -> dict:
        return {**super().to_dict(), "agent_id": self.agent_id, "stage": self.stage,
                "membrane": self.membrane, "result": self.result,
                "reason": self.reason, "delta_id": self.delta_id}


@dataclass
class GraphUpdateEvent(SSEEvent):
    type: str = "graph_update"
    nodes: list = field(default_factory=list)
    links: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {**super().to_dict(), "nodes": self.nodes, "links": self.links}


@dataclass
class DeltaCommittedEvent(SSEEvent):
    type: str = "delta_committed"
    delta: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {**super().to_dict(), "delta": self.delta}


@dataclass
class StabilityUpdateEvent(SSEEvent):
    type: str = "stability_update"
    score: float = 1.0
    components: dict = field(default_factory=dict)
    delta_id: str = ""

    def to_dict(self) -> dict:
        return {**super().to_dict(), "score": self.score,
                "components": self.components, "delta_id": self.delta_id}


@dataclass
class FinalOutputEvent(SSEEvent):
    type: str = "final_output"
    brief: str = ""
    continuity_chain: list = field(default_factory=list)
    stability_curve: list = field(default_factory=list)
    final_stability: float = 1.0

    def to_dict(self) -> dict:
        return {**super().to_dict(), "brief": self.brief,
                "continuity_chain": self.continuity_chain,
                "stability_curve": self.stability_curve,
                "final_stability": self.final_stability}
