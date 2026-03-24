"""
grl_v2.core.continuity
========================
Multi-agent continuity chain.

v2 additions over v1:
  - observers: list of agents who saw the delta
  - contested_by: list of agents who flagged conflict
  - forward/inverse JSON-patch operations
  - stability_after: S(t) after this delta
  - per-agent filtering
  - conflict filtering
"""

import time
import uuid
from typing import Optional
from .types import Delta, DeltaOp, MembraneVerdict, ResearchState


class ContinuityChain:
    """
    Append-only multi-agent continuity chain.

    State(t+1) = State(t) ⊕ Delta(t)
    The chain is the full trajectory: State(0) → State(1) → … → State(N)
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self._deltas: list[Delta] = []
        self._rolled_back: set[str] = set()

    # ─── Core operations ──────────────────────────────────────────────────────

    def append(self, delta: Delta) -> Delta:
        """Append a committed delta to the chain."""
        self._deltas.append(delta)
        return delta

    def rollback(self, delta_id: str, reason: str) -> bool:
        """Mark a delta as rolled back."""
        for d in self._deltas:
            if d.delta_id == delta_id:
                self._rolled_back.add(delta_id)
                d.metadata["rollback_reason"] = reason
                d.metadata["rolled_back"] = True
                return True
        return False

    def rollback_last(self, reason: str) -> bool:
        if self._deltas:
            return self.rollback(self._deltas[-1].delta_id, reason)
        return False

    def apply_to_state(self, state: ResearchState, delta: Delta) -> ResearchState:
        """Apply a delta's forward operations to the research state."""
        for op in delta.forward:
            state = self._apply_op(state, op)
        state.delta_count += 1
        return state

    def revert_from_state(self, state: ResearchState, delta: Delta) -> ResearchState:
        """Apply a delta's inverse operations (rollback)."""
        for op in delta.inverse:
            state = self._apply_op(state, op)
        state.delta_count = max(0, state.delta_count - 1)
        return state

    def _apply_op(self, state: ResearchState, op: DeltaOp) -> ResearchState:
        """Apply a single JSON-patch-style operation to the research state."""
        path_parts = op.path.strip("/").split("/")

        if op.op == "add":
            if path_parts[0] == "claims" and len(path_parts) >= 2:
                from .types import Claim
                claim = Claim(
                    claim_id=str(uuid.uuid4()),
                    text=op.value.get("text", "") if isinstance(op.value, dict) else str(op.value),
                    agent_id=op.value.get("agent_id", "") if isinstance(op.value, dict) else "",
                    confidence=op.value.get("confidence", 0.7) if isinstance(op.value, dict) else 0.7,
                    tentative=op.value.get("tentative", False) if isinstance(op.value, dict) else False,
                )
                state.claims.append(claim)
            elif path_parts[0] == "findings":
                state.findings.append(op.value if isinstance(op.value, dict) else {"content": str(op.value)})
            elif path_parts[0] == "hypotheses":
                state.hypotheses.append(op.value if isinstance(op.value, dict) else {"content": str(op.value)})
            elif path_parts[0] == "critiques":
                state.critiques.append(op.value if isinstance(op.value, dict) else {"content": str(op.value)})
            elif path_parts[0] == "synthesis":
                state.synthesis = str(op.value)

        elif op.op == "remove":
            if path_parts[0] == "claims" and len(path_parts) >= 2:
                try:
                    idx = int(path_parts[1])
                    if 0 <= idx < len(state.claims):
                        state.claims.pop(idx)
                except (ValueError, IndexError):
                    pass

        elif op.op == "replace":
            if path_parts[0] == "synthesis":
                state.synthesis = str(op.value)

        return state

    # ─── Observer / contest tracking ──────────────────────────────────────────

    def add_observer(self, delta_id: str, agent_id: str):
        for d in self._deltas:
            if d.delta_id == delta_id and agent_id not in d.observers:
                d.observers.append(agent_id)

    def add_contest(self, delta_id: str, agent_id: str):
        for d in self._deltas:
            if d.delta_id == delta_id and agent_id not in d.contested_by:
                d.contested_by.append(agent_id)

    def set_stability(self, delta_id: str, score: float):
        for d in self._deltas:
            if d.delta_id == delta_id:
                d.stability_after = score

    # ─── Querying ─────────────────────────────────────────────────────────────

    def filter_by_agent(self, agent_id: str) -> list[Delta]:
        return [
            d for d in self._deltas
            if d.agent_id == agent_id
            or agent_id in d.observers
            or agent_id in d.contested_by
        ]

    def filter_by_membrane(self, membrane: str, result: str = None) -> list[Delta]:
        filtered = []
        for d in self._deltas:
            m_result = d.membrane_results.get(membrane)
            if result:
                if m_result == result:
                    filtered.append(d)
            elif m_result in ("block", "defer"):
                filtered.append(d)
        return filtered

    def filter_contested(self) -> list[Delta]:
        return [d for d in self._deltas if d.contested_by]

    def all(self) -> list[Delta]:
        return list(self._deltas)

    def to_list(self) -> list[dict]:
        return [d.to_dict() for d in self._deltas]

    def __len__(self) -> int:
        return len(self._deltas)

    def last(self) -> Optional[Delta]:
        return self._deltas[-1] if self._deltas else None

    def summary(self) -> dict:
        blocked = sum(1 for d in self._deltas if d.verdict == MembraneVerdict.BLOCK)
        deferred = sum(1 for d in self._deltas if d.verdict == MembraneVerdict.DEFER)
        contested = sum(1 for d in self._deltas if d.contested_by)
        rolled_back = len(self._rolled_back)
        return {
            "session_id": self.session_id,
            "total": len(self._deltas),
            "blocked": blocked,
            "deferred": deferred,
            "contested": contested,
            "rolled_back": rolled_back,
        }
