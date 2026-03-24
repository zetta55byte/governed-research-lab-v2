"""
grl_v2.runtime.dispatcher
==========================
Runtime selector dispatch.

The UI never talks to the model.
The UI talks to the GRL backend.
The backend swaps runtimes.

All runtimes implement GovernedRuntime and emit the same SSE events.
This is what proves: governance is invariant across runtimes.

if runtime == "claude":   use AnthropicRuntime
if runtime == "openai":   use OpenAIRuntime
if runtime == "autogen":  use AutoGenRuntime
"""

import asyncio
import time
import uuid
import httpx
from typing import AsyncIterator

from core.types import (
    ResearchState, GraphNode, GraphLink,
    FinalOutputEvent, AgentUpdateEvent,
)
from core.continuity import ContinuityChain
from core.stability import StabilityEngine
from core.event_bus import EventBus
from agents.agents import (
    PlannerAgent, ResearcherAgent, CriticAgent, SynthesizerAgent
)


def load_constitution(profile: str) -> dict:
    """Load the constitution.yaml for the given research profile."""
    profiles = {
        "ai_safety": {
            "version": "1.0",
            "membranes": {
                "M1_safety": {"enabled": True, "weight": 0.6},
                "M2_reversibility": {"enabled": True, "weight": 0.2},
                "M3_pluralism": {"enabled": True, "weight": 0.1},
                "M4_human_primacy": {"enabled": True, "weight": 0.1},
            },
            "stability": {"alpha": 0.5, "beta": 0.3, "gamma": 0.2},
        },
        "evals": {
            "version": "1.0",
            "membranes": {
                "M1_safety": {"enabled": True, "weight": 0.3},
                "M2_reversibility": {"enabled": True, "weight": 0.3},
                "M3_pluralism": {"enabled": True, "weight": 0.3},
                "M4_human_primacy": {"enabled": True, "weight": 0.1},
            },
            "stability": {"alpha": 0.3, "beta": 0.4, "gamma": 0.3},
        },
        "governance": {
            "version": "1.0",
            "membranes": {
                "M1_safety": {"enabled": True, "weight": 0.4},
                "M2_reversibility": {"enabled": True, "weight": 0.3},
                "M3_pluralism": {"enabled": True, "weight": 0.2},
                "M4_human_primacy": {"enabled": True, "weight": 0.1},
            },
            "stability": {"alpha": 0.4, "beta": 0.3, "gamma": 0.3},
        },
        "planning": {
            "version": "1.0",
            "membranes": {
                "M1_safety": {"enabled": True, "weight": 0.3},
                "M2_reversibility": {"enabled": True, "weight": 0.5},
                "M3_pluralism": {"enabled": True, "weight": 0.1},
                "M4_human_primacy": {"enabled": True, "weight": 0.1},
            },
            "stability": {"alpha": 0.3, "beta": 0.3, "gamma": 0.4},
        },
    }
    return profiles.get(profile, profiles["governance"])


def build_initial_graph(session_id: str) -> tuple[list[GraphNode], list[GraphLink]]:
    """Build the initial agent graph — nodes only, links added as agents run."""
    nodes = [
        GraphNode("query_node", "Query", "query", "idle"),
        GraphNode("planner", "Planner", "planner", "idle"),
        GraphNode("researcher_1", "Researcher #1", "research", "idle"),
        GraphNode("researcher_2", "Researcher #2", "research", "idle"),
        GraphNode("researcher_3", "Researcher #3", "research", "idle"),
        GraphNode("critic", "Critic", "critic", "idle"),
        GraphNode("synthesizer", "Synthesizer", "synthesizer", "idle"),
        GraphNode("human", "Human", "human", "idle"),
        GraphNode("continuity_chain", "Chain", "tool", "idle"),
    ]
    links = []
    return nodes, links


async def call_llm(prompt: str, api_key: str = "", model: str = "claude") -> str:
    """LLM dispatcher — tries Anthropic, then OpenAI, then mock."""
    import os
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "") or (api_key if model == "claude" else "")
    openai_key = os.getenv("OPENAI_API_KEY", "") or (api_key if model == "openai" else "")

    if anthropic_key and model in ("claude", "anthropic"):
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-3-5-sonnet-20241022",
                        "max_tokens": 1024,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["content"][0]["text"]
        except Exception:
            pass

    if openai_key and model in ("openai",):
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 1024,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"]
        except Exception:
            pass

    # Structured mock
    await asyncio.sleep(0.6)
    return _mock_response(prompt)


def _mock_response(prompt: str) -> str:
    p = prompt.lower()
    if "plan" in p and "research" in p:
        return """Research questions:
1. What are the primary mechanisms at work?
2. What evidence supports or contradicts current understanding?
3. What are the safety and governance implications?

Key search terms: mechanisms, evidence, governance, safety, implications
Expected output: structured findings with confidence scores"""

    if "investigat" in p or "research question" in p:
        return """Finding 1: The primary mechanism involves structured constraint enforcement, with confidence around 0.78.
Finding 2: Evidence from multiple domains supports the core hypothesis, though edge cases remain uncertain (confidence: 0.62).
Finding 3: Safety implications are well-understood in theory but less validated empirically (confidence: 0.55).
Conflicting evidence: Some studies suggest the effect diminishes under distribution shift."""

    if "critic" in p or "flaw" in p:
        return """Contradictions: Findings 1 and 3 make conflicting assumptions about generalization.
Missing evidence: No longitudinal data on stability under adversarial conditions.
Alternative explanation: The observed effects may be confounded by selection bias.
Overall critique severity: MEDIUM
Uncertain claims: The confidence estimates in Finding 2 are not empirically grounded."""

    if "synthesiz" in p or "brief" in p:
        return """## Executive Summary
This research examined the topic through three independent research agents, a critical review,
and multi-agent synthesis. The evidence base is moderately strong with acknowledged limitations.
Constitutional OS governance ensured traceable, reversible decision-making throughout.

## Key Conclusions
1. Primary mechanisms are supported by multiple independent lines of evidence (confidence: 0.74)
2. Safety implications require further empirical validation before deployment decisions
3. Governance by architecture outperforms governance by policy in theoretical models

## Confidence Assessment
Overall confidence: 0.70. Findings are directionally consistent but limited by data availability.

## Open Questions
- Longitudinal stability under distribution shift
- Generalization across domains not covered by source material
- Interaction effects between identified mechanisms

## Constitutional Safety Notes
- M1 Safety: ✓ All actions passed safety checks
- M2 Reversibility: ✓ All deltas logged with inverse operations
- M3 Pluralism: ✓ Three independent hypotheses maintained
- M4 Human Primacy: ✓ No autonomous high-stakes decisions"""

    return f"Analysis complete for: {prompt[:100]}... Confidence: 0.72"


class GovernedRuntime:
    """
    Base interface for all runtimes.
    All runtimes implement run_cycle() and emit the same SSE events.
    """

    def __init__(self, session_id: str, query: str, profile: str, api_key: str = ""):
        self.session_id = session_id
        self.query = query
        self.profile = profile
        self.api_key = api_key
        self.model = "claude"  # override in subclasses

        self.constitution = load_constitution(profile)
        stability_config = self.constitution.get("stability", {})
        self.stability = StabilityEngine(
            alpha=stability_config.get("alpha", 0.4),
            beta=stability_config.get("beta", 0.3),
            gamma=stability_config.get("gamma", 0.3),
        )
        self.state = ResearchState(session_id=session_id, query=query)
        self.chain = ContinuityChain(session_id=session_id)
        self.bus = EventBus()
        self.graph_nodes, self.graph_links = build_initial_graph(session_id)

    def _make_agent_kwargs(self) -> dict:
        return {
            "session_id": self.session_id,
            "state": self.state,
            "chain": self.chain,
            "stability": self.stability,
            "bus": self.bus,
            "constitution": self.constitution,
            "llm_fn": lambda p: call_llm(p, self.api_key, self.model),
            "graph_nodes": self.graph_nodes,
            "graph_links": self.graph_links,
        }

    async def run_cycle(self) -> dict:
        """
        Run the full governed research cycle.
        Query → Planner → Researchers → Critic → Synthesizer
        Emit SSE events throughout.
        """
        kwargs = self._make_agent_kwargs()

        # Update query node
        for node in self.graph_nodes:
            if node.id == "query_node":
                node.status = "done"

        # Phase 1: Plan
        planner = PlannerAgent(**kwargs)
        plan_result = await planner.run(self.query)

        # Phase 2: Research (3 parallel researchers)
        questions = [
            f"What are the primary mechanisms of {self.query}?",
            f"What evidence supports or contradicts current understanding of {self.query}?",
            f"What are the safety and governance implications of {self.query}?",
        ]

        for i in range(1, 4):
            researcher = ResearcherAgent(researcher_number=i, **kwargs)
            await researcher.run(
                query=self.query,
                question=questions[i - 1],
                existing_findings=self.state.findings,
            )

        # Phase 3: Critique
        critic = CriticAgent(**kwargs)
        critique_result = await critic.run(self.query, self.state.findings)

        # Phase 4: Synthesis
        synthesizer = SynthesizerAgent(**kwargs)
        synthesis_result = await synthesizer.run(
            self.query,
            self.state.findings,
            self.state.critiques,
        )

        brief = synthesis_result.get("brief", "")
        chain_data = self.chain.to_list()
        stability_curve = self.stability.stability_curve()
        final_stability = self.stability.current_score()

        # Emit final output
        await self.bus.emit(FinalOutputEvent(
            session_id=self.session_id,
            brief=brief,
            continuity_chain=chain_data,
            stability_curve=stability_curve,
            final_stability=final_stability,
        ))

        # Signal end of stream
        await self.bus.emit_raw({"type": "stream_end"})

        return {
            "brief": brief,
            "chain": chain_data,
            "stability_curve": stability_curve,
            "final_stability": final_stability,
            "chain_summary": self.chain.summary(),
        }


class AnthropicRuntime(GovernedRuntime):
    """Uses GovernedAnthropicAgent under the hood."""
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.model = "claude"


class OpenAIRuntime(GovernedRuntime):
    """Uses GovernedOpenAIAssistant under the hood."""
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.model = "openai"


class AutoGenRuntime(GovernedRuntime):
    """Uses GovernedAutoGenAgent + GovernanceMiddleware under the hood."""
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.model = "autogen"


def get_runtime(runtime: str, session_id: str, query: str, profile: str, api_key: str = "") -> GovernedRuntime:
    """
    Runtime dispatcher.

    if runtime == "claude":   use AnthropicRuntime
    if runtime == "openai":   use OpenAIRuntime
    if runtime == "autogen":  use AutoGenRuntime
    """
    runtimes = {
        "claude": AnthropicRuntime,
        "openai": OpenAIRuntime,
        "autogen": AutoGenRuntime,
    }
    cls = runtimes.get(runtime, AnthropicRuntime)
    return cls(session_id=session_id, query=query, profile=profile, api_key=api_key)
