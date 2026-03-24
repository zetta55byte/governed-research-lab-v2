"""
grl_v2.agents.base
===================
BaseGovernedAgentV2 — base class for all five research agents.

v2 improvements over v1:
  - First-class Delta objects with forward/inverse ops
  - Multi-agent observer/contest tracking
  - Stability update after every committed delta
  - Graph update emitted with every agent action
"""

import asyncio
import time
import uuid
from typing import Callable, Optional

from core.types import (
    Delta, DeltaOp, GraphNode, GraphLink, MembraneVerdict,
    AgentUpdateEvent, MembraneCheckEvent, GraphUpdateEvent,
    DeltaCommittedEvent, StabilityUpdateEvent, ResearchState,
)
from core.membranes import evaluate_membranes
from core.continuity import ContinuityChain
from core.stability import StabilityEngine
from core.event_bus import EventBus


class BaseGovernedAgentV2:
    """
    Base class for GRL v2 agents.

    Every action goes through:
      1. propose_delta() — build the Delta object
      2. evaluate_membranes() — M1–M4 check
      3. commit or block/defer
      4. update continuity chain + stability
      5. emit SSE events
    """

    agent_id: str = "base"
    agent_name: str = "Base"
    agent_role: str = "base"
    agent_color: str = "#ffffff"

    def __init__(
        self,
        session_id: str,
        state: ResearchState,
        chain: ContinuityChain,
        stability: StabilityEngine,
        bus: EventBus,
        constitution: dict,
        llm_fn: Callable,
        graph_nodes: list[GraphNode],
        graph_links: list[GraphLink],
    ):
        self.session_id = session_id
        self.state = state
        self.chain = chain
        self.stability = stability
        self.bus = bus
        self.constitution = constitution
        self.llm_fn = llm_fn
        self.graph_nodes = graph_nodes
        self.graph_links = graph_links

    # ─── SSE helpers ──────────────────────────────────────────────────────────

    async def emit_agent_update(self, status: str, message: str):
        await self.bus.emit(AgentUpdateEvent(
            session_id=self.session_id,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status=status,
            message=message,
        ))
        # Update graph node status
        for node in self.graph_nodes:
            if node.id == self.agent_id:
                node.status = status
        await self.emit_graph_update()

    async def emit_graph_update(self):
        await self.bus.emit(GraphUpdateEvent(
            session_id=self.session_id,
            nodes=[n.to_dict() for n in self.graph_nodes],
            links=[l.to_dict() for l in self.graph_links],
        ))

    async def emit_membrane_check(
        self, stage: str, membrane: str, result: str, reason: str, delta_id: str
    ):
        await self.bus.emit(MembraneCheckEvent(
            session_id=self.session_id,
            agent_id=self.agent_id,
            stage=stage,
            membrane=membrane,
            result=result,
            reason=reason,
            delta_id=delta_id,
        ))

    # ─── Governed action ──────────────────────────────────────────────────────

    async def governed_action(
        self,
        description: str,
        stage: str,
        forward_ops: list[DeltaOp],
        inverse_ops: list[DeltaOp],
        reversible: bool = True,
        metadata: dict = None,
    ) -> Optional[Delta]:
        """
        The core governed action cycle:
          1. Build Delta
          2. Evaluate M1–M4
          3. Emit membrane check events
          4. Commit or block/defer
          5. Update stability
          6. Emit delta_committed + stability_update
        """
        delta = Delta(
            delta_id=str(uuid.uuid4()),
            agent_id=self.agent_id,
            session_id=self.session_id,
            stage=stage,
            description=description,
            forward=forward_ops,
            inverse=inverse_ops,
            reversible=reversible,
            metadata=metadata or {},
        )

        # Membrane evaluation
        aggregate, results = evaluate_membranes(delta, self.constitution)

        # Store results on delta
        delta.membrane_results = {k: v.value for k, (v, _) in results.items()}
        delta.verdict = aggregate

        # Emit per-membrane SSE events
        for membrane_key, (verdict, reason) in results.items():
            await self.emit_membrane_check(
                stage=stage,
                membrane=membrane_key,
                result=verdict.value,
                reason=reason,
                delta_id=delta.delta_id,
            )
            # Update graph node membrane state
            for node in self.graph_nodes:
                if node.id == self.agent_id:
                    node.membrane_state = {
                        "last_stage": stage,
                        "last_result": verdict.value,
                    }

        if aggregate == MembraneVerdict.BLOCK:
            await self.emit_agent_update("blocked", f"[BLOCKED] {description}")
            return None

        if aggregate == MembraneVerdict.DEFER:
            await self.emit_agent_update("deferred", f"[DEFERRED] {description}")
            # Still log to chain but mark as deferred
            self.chain.append(delta)
            return delta

        # ALLOW — commit the delta
        self.state = self.chain.apply_to_state(self.state, delta)
        self.chain.append(delta)

        # Update stability after delta
        metrics = self.stability.update(self.state, delta.delta_id)
        delta.stability_after = metrics.S
        self.chain.set_stability(delta.delta_id, metrics.S)

        # Add graph link for this delta
        link = GraphLink(
            id=delta.delta_id,
            source=self.agent_id,
            target="continuity_chain",
            kind="delta",
            label=description[:30],
            membrane_stage=stage,
            membrane_result=aggregate.value,
        )
        self.graph_links.append(link)

        # Emit delta_committed
        await self.bus.emit(DeltaCommittedEvent(
            session_id=self.session_id,
            delta=delta.to_dict(),
        ))

        # Emit stability_update
        await self.bus.emit(StabilityUpdateEvent(
            session_id=self.session_id,
            score=metrics.S,
            components=metrics.to_dict(),
            delta_id=delta.delta_id,
        ))

        await self.emit_graph_update()
        return delta

    def add_graph_link(self, source: str, target: str, kind: str, label: str = "", membrane_result: str = "allow"):
        self.graph_links.append(GraphLink(
            id=str(uuid.uuid4()),
            source=source,
            target=target,
            kind=kind,
            label=label,
            membrane_result=membrane_result,
        ))
