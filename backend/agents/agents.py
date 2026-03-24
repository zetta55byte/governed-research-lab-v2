"""
grl_v2.agents
==============
Five governed research agents for GRL v2.

Planner → [Researcher x3] → Critic → Synthesizer
Each produces typed, reversible deltas.
"""

import asyncio
import uuid
from core.types import DeltaOp, Claim
from agents.base import BaseGovernedAgentV2


# ─── Planner ──────────────────────────────────────────────────────────────────

PLANNER_PROMPT = """You are a research planner. Given the query below, produce a structured research plan.

Query: {query}

Output exactly:
1. 3 research questions to investigate
2. Key search terms
3. Expected output format

Be concise and precise."""


class PlannerAgent(BaseGovernedAgentV2):
    agent_id = "planner"
    agent_name = "Planner"
    agent_role = "planner"

    async def run(self, query: str) -> dict:
        await self.emit_agent_update("running", f"Planning research cycle for: {query}")

        prompt = PLANNER_PROMPT.format(query=query)
        plan_text = await self.llm_fn(prompt)

        delta = await self.governed_action(
            description="Generated research plan",
            stage="plan",
            forward_ops=[DeltaOp("add", "/findings/0", {
                "content": plan_text,
                "agent_id": self.agent_id,
                "type": "plan",
                "confidence": 0.9,
            })],
            inverse_ops=[DeltaOp("remove", "/findings/0")],
            metadata={"query": query},
        )

        self.add_graph_link("query_node", "planner", "message", "research query")

        await self.emit_agent_update("done", "Research plan committed")
        return {"plan": plan_text, "delta_id": delta.delta_id if delta else None}


# ─── Researcher ───────────────────────────────────────────────────────────────

RESEARCHER_PROMPT = """You are a research agent. Investigate the following question deeply.

Research question: {question}
Original query: {query}
Existing findings: {findings}

Produce:
1. 2-3 key findings with evidence
2. Confidence level for each (0.0-1.0)
3. Any conflicting evidence you found
4. Open questions this raises

Be specific. Cite reasoning."""


class ResearcherAgent(BaseGovernedAgentV2):

    def __init__(self, researcher_number: int, **kwargs):
        super().__init__(**kwargs)
        self.researcher_number = researcher_number
        self.agent_id = f"researcher_{researcher_number}"
        self.agent_name = f"Researcher #{researcher_number}"
        self.agent_role = "research"

    async def run(self, query: str, question: str, existing_findings: list) -> dict:
        await self.emit_agent_update("running", f"Investigating: {question[:60]}")

        findings_text = "\n".join(
            f"- {f.get('content', '')[:100]}" for f in existing_findings[:3]
        )

        prompt = RESEARCHER_PROMPT.format(
            question=question,
            query=query,
            findings=findings_text or "None yet",
        )

        findings_text = await self.llm_fn(prompt)
        findings = self._parse_findings(findings_text, question)

        forward_ops = []
        inverse_ops = []
        idx = len(self.state.findings)

        for i, finding in enumerate(findings):
            forward_ops.append(DeltaOp("add", f"/findings/{idx + i}", finding))
            inverse_ops.append(DeltaOp("remove", f"/findings/{idx + i}"))

            # Add as claim
            forward_ops.append(DeltaOp("add", f"/claims/{len(self.state.claims) + i}", {
                "text": finding["content"][:200],
                "agent_id": self.agent_id,
                "confidence": finding.get("confidence", 0.7),
                "tentative": finding.get("confidence", 0.7) < 0.5,
            }))

        delta = await self.governed_action(
            description=f"Researcher #{self.researcher_number}: {len(findings)} findings on '{question[:40]}'",
            stage="delta",
            forward_ops=forward_ops,
            inverse_ops=inverse_ops,
            metadata={"question": question, "finding_count": len(findings)},
        )

        self.add_graph_link("planner", self.agent_id, "message", "research task")
        if delta:
            self.add_graph_link(self.agent_id, "continuity_chain", "delta",
                               "findings", delta.verdict.value if hasattr(delta, 'verdict') else "allow")

        await self.emit_agent_update("done", f"Committed {len(findings)} findings")
        return {"findings": findings, "delta_id": delta.delta_id if delta else None}

    def _parse_findings(self, text: str, question: str) -> list[dict]:
        lines = [l.strip() for l in text.split("\n") if l.strip() and len(l.strip()) > 20]
        findings = []
        for i, line in enumerate(lines[:4]):
            confidence = 0.8 if i == 0 else 0.65
            if "uncertain" in line.lower() or "unclear" in line.lower():
                confidence = 0.4
            findings.append({
                "content": line,
                "agent_id": self.agent_id,
                "question": question,
                "confidence": confidence,
                "tentative": confidence < 0.5,
            })
        if not findings:
            findings = [{
                "content": f"Investigation of '{question}': {text[:300]}",
                "agent_id": self.agent_id,
                "question": question,
                "confidence": 0.7,
                "tentative": False,
            }]
        return findings


# ─── Critic ───────────────────────────────────────────────────────────────────

CRITIC_PROMPT = """You are an adversarial research critic. Your job is to find flaws.

Query: {query}
Current findings:
{findings}

Produce:
1. Contradictions between findings (if any)
2. Missing evidence or gaps
3. Alternative explanations that fit the same data
4. Overall critique severity: LOW | MEDIUM | HIGH
5. Specific claims to flag as uncertain

Be ruthless. If findings are weak, say so."""


class CriticAgent(BaseGovernedAgentV2):
    agent_id = "critic"
    agent_name = "Critic"
    agent_role = "critic"

    async def run(self, query: str, findings: list) -> dict:
        await self.emit_agent_update("running", f"Critiquing {len(findings)} findings")

        findings_text = "\n".join(
            f"- [{f.get('agent_id', '?')}] {f.get('content', '')[:150]}"
            for f in findings[:8]
        )

        prompt = CRITIC_PROMPT.format(query=query, findings=findings_text or "No findings yet.")
        critique_text = await self.llm_fn(prompt)

        severity = self._extract_severity(critique_text)
        conflicts = self._extract_conflicts(critique_text, findings)

        forward_ops = [DeltaOp("add", f"/critiques/{len(self.state.critiques)}", {
            "content": critique_text,
            "agent_id": self.agent_id,
            "severity": severity,
            "conflict_count": len(conflicts),
        })]
        inverse_ops = [DeltaOp("remove", f"/critiques/{len(self.state.critiques)}")]

        # Flag conflicting claims
        for i, claim in enumerate(self.state.claims):
            for conflict_text in conflicts:
                if conflict_text.lower() in claim.text.lower():
                    claim.conflicting_with.append(f"critic_flag_{i}")
                    claim.tentative = True

        delta = await self.governed_action(
            description=f"Critique [{severity}]: {len(conflicts)} conflicts identified",
            stage="delta",
            forward_ops=forward_ops,
            inverse_ops=inverse_ops,
            metadata={"severity": severity, "conflicts": len(conflicts)},
        )

        # Critic contests recent researcher deltas if HIGH severity
        if severity == "HIGH":
            recent = self.chain.all()[-3:]
            for d in recent:
                if d.agent_id.startswith("researcher"):
                    self.chain.add_contest(d.delta_id, self.agent_id)

        for i in range(1, 4):
            self.add_graph_link(f"researcher_{i}", "critic", "message", "findings for review")

        await self.emit_agent_update("done", f"Critique committed [{severity}]")
        return {"critique": critique_text, "severity": severity, "delta_id": delta.delta_id if delta else None}

    def _extract_severity(self, text: str) -> str:
        for level in ["HIGH", "MEDIUM", "LOW"]:
            if level in text.upper():
                return level
        return "MEDIUM"

    def _extract_conflicts(self, text: str, findings: list) -> list[str]:
        conflicts = []
        lines = text.split("\n")
        for line in lines:
            if any(word in line.lower() for word in ["contradict", "conflict", "disagree", "inconsist"]):
                conflicts.append(line.strip()[:100])
        return conflicts[:3]


# ─── Synthesizer ──────────────────────────────────────────────────────────────

SYNTHESIS_PROMPT = """You are a master research synthesizer.

Query: {query}
Findings:
{findings}
Critiques:
{critiques}

Produce a structured research brief:
## Executive Summary
(3-4 sentences)

## Key Conclusions
(numbered, evidence-based)

## Confidence Assessment
(overall confidence 0.0-1.0 + reasoning)

## Open Questions
(what remains unresolved)

## Constitutional Safety Notes
(M1-M4 compliance summary)

Acknowledge uncertainty. Do not overstate conclusions."""


class SynthesizerAgent(BaseGovernedAgentV2):
    agent_id = "synthesizer"
    agent_name = "Synthesizer"
    agent_role = "synthesizer"

    async def run(self, query: str, findings: list, critiques: list) -> dict:
        await self.emit_agent_update("running", "Synthesizing all findings into final brief")

        findings_text = "\n".join(
            f"- {f.get('content', '')[:150]}" for f in findings[:8]
        )
        critiques_text = "\n".join(
            f"- [{c.get('severity', '?')}] {c.get('content', '')[:100]}" for c in critiques[:4]
        )

        prompt = SYNTHESIS_PROMPT.format(
            query=query,
            findings=findings_text or "No findings",
            critiques=critiques_text or "No critiques",
        )
        brief = await self.llm_fn(prompt)

        delta = await self.governed_action(
            description="Final synthesis brief",
            stage="delta",
            forward_ops=[DeltaOp("replace", "/synthesis", brief)],
            inverse_ops=[DeltaOp("replace", "/synthesis", self.state.synthesis or "")],
            reversible=True,
            metadata={"finding_count": len(findings), "critique_count": len(critiques)},
        )

        self.add_graph_link("critic", "synthesizer", "message", "reviewed findings")
        self.add_graph_link("synthesizer", "human", "delta", "final brief")

        await self.emit_agent_update("done", "Final brief committed")
        return {"brief": brief, "delta_id": delta.delta_id if delta else None}
