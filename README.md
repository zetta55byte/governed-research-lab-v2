# governed-research-lab-v2

> A new ontology. Not a UI upgrade.

The second generation of the Constitutional OS flagship reference implementation.

[![Constitutional OS](https://img.shields.io/badge/governed%20by-Constitutional%20OS-blueviolet)](https://github.com/zetta55byte/constitutional-os)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What changed from v1

GRL v1 proved the substrate works. GRL v2 makes it *visible*.

| v1 | v2 |
|----|-----|
| Deltas as log entries | Deltas as first-class reversible state transitions |
| Single continuity chain | Multi-agent chain with `observers` + `contested_by` |
| Lyapunov as a number | Lyapunov as a live curve: V(t) = α·c(t) + β·u(t) + γ·d(t) |
| One runtime (LangChain) | Runtime selector: Claude / OpenAI / AutoGen |
| Static graph | D3 force graph with membrane-colored edges |
| Basic log stream | Filterable continuity chain viewer |
| Single profile | Profile-tunable constitutions (AI Safety, Evals, Governance, Planning) |

---

## The architecture

```
Query → Planner → [Researcher ×3] → Critic → Synthesizer → Human
          │              │               │           │
          └──────────────┴───────────────┴───────────┘
                                 │
                    Constitutional OS (M1–M4)
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
         Membrane           Continuity          Lyapunov
         Evaluation           Chain             V(t) → S(t)
         M1·M2·M3·M4      [Δ1→Δ2→…→ΔN]       1 − V(t)
              │                  │                  │
              └──────────────────┴──────────────────┘
                                 │
                          SSE Event Bus
                                 │
                         React Frontend
                    ┌────────────────────────┐
                    │  D3 Agent Graph        │
                    │  Membrane Log          │
                    │  Continuity Viewer     │
                    │  Stability Curve       │
                    └────────────────────────┘
```

---

## The five panels

```
┌──────────────────────────────────────────────────────────────────┐
│  Query · Profile · Runtime Selector · [Run Governed Cycle]       │
│  Agent Pipeline · Stats · Chain Filters                          │
├────────────────────────┬─────────────────────┬───────────────────┤
│  Control Panel         │  D3 Agent Graph      │  Membrane Log     │
│  (left)                │  (center)            │  M1·M2·M3·M4     │
│                        │  Nodes = agents      │  live stream      │
│                        │  Edges = governed    ├───────────────────┤
│                        │  interactions        │  Continuity Chain │
│                        │  Colors = membrane   │  Viewer           │
│                        │  outcomes            │  filterable       │
│                        │                      │  by agent/        │
│                        │                      │  membrane/        │
│                        │                      │  contested        │
├────────────────────────┴─────────────────────┴───────────────────┤
│  V(t) = α·c + β·u + γ·d   S(t) = {score}   [Lyapunov Curve]     │
└──────────────────────────────────────────────────────────────────┘
```

---

## The Lyapunov potential

After every committed delta, the system recomputes:

```
c(t) = contradiction level  (fraction of conflicting claims)
u(t) = uncertainty level    (fraction of low-confidence claims)
d(t) = drift from query     (cosine distance from original query)

V(t) = α·c(t) + β·u(t) + γ·d(t)
S(t) = 1 − V(t)
```

`S(t) ≈ 1.0` → agents aligned, low contradiction, low drift
`S(t) ≈ 0.0` → agents fighting, confused, or off-topic

Emitted as `stability_update` SSE event after every delta.

---

## SSE event contract

All six event types. The frontend never needs to know which runtime is running.

```json
{ "type": "agent_update",    "agent_id": "...", "status": "...", "message": "..." }
{ "type": "membrane_check",  "membrane": "M1_SAFETY", "result": "allow|block|defer" }
{ "type": "graph_update",    "nodes": [...], "links": [...] }
{ "type": "delta_committed", "delta": { "delta_id": "...", "forward": [...], "inverse": [...] } }
{ "type": "stability_update","score": 0.87, "components": { "contradiction": 0.1, ... } }
{ "type": "final_output",    "brief": "...", "continuity_chain": [...], "stability_curve": [...] }
```

---

## Runtime selector

```python
# The model is interchangeable. The governance is not.
if runtime == "claude":   use AnthropicRuntime
if runtime == "openai":   use OpenAIRuntime
if runtime == "autogen":  use AutoGenRuntime
```

All runtimes implement the same `GovernedRuntime.run_cycle()` interface.
All emit identical SSE events.
Same UI. Same governance. Different model underneath.

---

## Continuity chain (v2)

Every delta now includes:

```json
{
  "delta_id": "Δ42",
  "agent_id": "researcher_2",
  "forward":  [{ "op": "add", "path": "/claims/3", "value": "..." }],
  "inverse":  [{ "op": "remove", "path": "/claims/3" }],
  "membrane_results": { "M1_SAFETY": "allow", "M2_REVERSIBILITY": "allow", ... },
  "verdict": "allow",
  "observers": ["critic", "researcher_1"],
  "contested_by": ["critic"],
  "stability_after": 0.76
}
```

`State(t+1) = State(t) ⊕ Delta(t)` — the chain is the full trajectory.

---

## Quickstart

```bash
git clone https://github.com/zetta55byte/governed-research-lab-v2
cd governed-research-lab-v2

# Optional — works without keys (structured mock responses)
export ANTHROPIC_API_KEY=sk-ant-...
```

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install && npm start
# → http://localhost:3000
```

**Docker**
```bash
docker-compose up --build
```

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/run` | Start a governed research cycle |
| `GET`  | `/stream/{id}` | SSE live event stream |
| `GET`  | `/session/{id}` | Session status + summary |
| `GET`  | `/session/{id}/chain` | Full continuity chain + stability curve |
| `GET`  | `/session/{id}/graph` | D3 graph (nodes + links) |
| `GET`  | `/health` | System health |

```bash
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"query": "Constitutional AI safety", "profile": "ai_safety", "runtime": "claude"}'
```

---

## Research profiles

| Profile | M1 weight | M2 weight | M3 weight | M4 weight |
|---------|-----------|-----------|-----------|-----------|
| `ai_safety` | 0.6 | 0.2 | 0.1 | 0.1 |
| `evals` | 0.3 | 0.3 | 0.3 | 0.1 |
| `governance` | 0.4 | 0.3 | 0.2 | 0.1 |
| `planning` | 0.3 | 0.5 | 0.1 | 0.1 |

Each profile tunes the Lyapunov weights (α, β, γ) and membrane enforcement accordingly.

---

## Related

- [governed-research-lab](https://github.com/zetta55byte/governed-research-lab) — v1, stable reference
- [constitutional-os](https://github.com/zetta55byte/constitutional-os) — core substrate
- [constitutional-os-langchain](https://github.com/zetta55byte/constitutional-os-langchain) — SDK + integrations
- [Paper](https://zenodo.org/records/19075163) — formal proofs, DOI: 10.5281/zenodo.19075163

---

## License

MIT
