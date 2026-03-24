# governed-research-lab-v2

> A new ontology. Not a UI upgrade.

The second generation of the Constitutional OS flagship reference implementation.

[![Constitutional OS](https://img.shields.io/badge/governed%20by-Constitutional%20OS-blueviolet)](https://github.com/zetta55byte/constitutional-os)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[Live Demo](https://governed-research-lab-v2.up.railway.app)** — run a governed research cycle in your browser. Watch membranes check, deltas commit, and the Lyapunov curve update in real time.

---

## Why v2 exists

GRL v1 proved the substrate works. GRL v2 makes it *visible*.

The shift is ontological, not cosmetic.

**v1: logs.** Agent actions were recorded as trace entries. You could read what happened, but you could not reason about it formally. The continuity chain was a history.

**v2: institution.** Every agent action is a proposed delta — a typed, reversible state transition with a forward operation and an inverse. The system maintains a trajectory:

    State(0) -> State(1) -> State(2) -> ... -> State(N)
    State(t+1) = State(t) + Delta(t)

This changes everything downstream:

| v1 | v2 |
|----|-----|
| Deltas as log entries | Deltas as reversible state transitions |
| Single continuity chain | Multi-agent chain with observers + contested_by |
| Governance checks | Membrane negotiation across agents |
| Lyapunov as a number | V(t) = a*c(t) + b*u(t) + g*d(t), computed after every delta |
| One runtime (LangChain) | Runtime selector: Claude / OpenAI / AutoGen |
| Static graph | D3 force graph, membrane-colored edges, live |
| Basic log stream | Filterable continuity chain viewer |
| Single profile | Profile-tunable constitutions |

The key insight: the continuity chain is not a log of what agents thought. It is the formal state of a governed institution. You can roll it back. You can filter it by agent, membrane outcome, or conflict. You can watch it destabilize and recover. Governance is not bolted on. It is the substrate.

---

## Architecture

```
                         Query
                           |
                           v
                       +---------+
                       | Planner |
                       +----+----+
                            |
            +---------------+---------------+
            v               v               v
     +-----------+   +-----------+   +-----------+
     |Researcher1|   |Researcher2|   |Researcher3|
     +-----+-----+   +-----+-----+   +-----+-----+
           +---------------+---------------+
                           |
                           v
                       +--------+
                       | Critic |  <- flags contradictions,
                       +---+----+     contests researcher deltas
                           |
                           v
                   +-------------+
                   | Synthesizer |
                   +------+------+
                          |
                          v
                       Human
                          |
             +------------+------------+
             v                        v
   Constitutional OS            Continuity Chain
   Membrane Engine              [D1 -> D2 -> ... -> DN]
   M1 * M2 * M3 * M4            observers + contested_by
             |                        |
             +------------+-----------+
                          v
                  Lyapunov Engine
                  V(t) = a*c(t) + b*u(t) + g*d(t)
                  S(t) = 1 - V(t)
                          |
                     SSE Event Bus
                          |
                   React Frontend
         +----------------------------------+
         | D3 Agent Graph                   |
         | Membrane Log (live stream)       |
         | Continuity Chain Viewer          |
         |   filter by agent                |
         |   filter by membrane             |
         |   filter by contested            |
         | Lyapunov Stability Curve         |
         +----------------------------------+
```

---

## Lyapunov potential

After every committed delta:

```
c(t) = contradiction level  (fraction of conflicting claims)
u(t) = uncertainty level    (fraction of low-confidence claims)
d(t) = drift from query     (cosine distance from original query)

V(t) = a*c(t) + b*u(t) + g*d(t)
S(t) = 1 - V(t)
```

S(t) near 1.0 means agents are aligned, low contradiction, low drift.
S(t) near 0.0 means agents are fighting, confused, or off-topic.

Tuned per profile. Emitted as stability_update SSE event after every delta.

---

## SSE event contract

Six event types. The frontend never needs to know which runtime is running.

```json
{ "type": "agent_update",    "agent_id": "...", "status": "running" }
{ "type": "membrane_check",  "membrane": "M1_SAFETY", "result": "allow" }
{ "type": "graph_update",    "nodes": [...], "links": [...] }
{ "type": "delta_committed", "delta": { "forward": [...], "inverse": [...] } }
{ "type": "stability_update","score": 0.87, "components": { "contradiction": 0.1 } }
{ "type": "final_output",    "brief": "...", "stability_curve": [...] }
```

---

## Runtime selector

```python
# The model is interchangeable. The governance is not.
if runtime == "claude":   use AnthropicRuntime
if runtime == "openai":   use OpenAIRuntime
if runtime == "autogen":  use AutoGenRuntime
```

All runtimes implement GovernedRuntime.run_cycle(). Same SSE events. Same UI. Same governance. Different model.

---

## Quickstart

```bash
git clone https://github.com/zetta55byte/governed-research-lab-v2
cd governed-research-lab-v2
export ANTHROPIC_API_KEY=sk-ant-...   # optional, falls back to mock
```

```bash
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
cd frontend && npm install && npm start
```

---

## Research profiles

| Profile | a (contradiction) | b (uncertainty) | g (drift) |
|---------|-------------------|-----------------|-----------|
| ai_safety | 0.5 | 0.3 | 0.2 |
| evals | 0.3 | 0.4 | 0.3 |
| governance | 0.4 | 0.3 | 0.3 |
| planning | 0.3 | 0.3 | 0.4 |

---

## Related

- [governed-research-lab](https://github.com/zetta55byte/governed-research-lab) -- v1, stable reference
- [constitutional-os](https://github.com/zetta55byte/constitutional-os) -- core substrate
- [constitutional-os-langchain](https://github.com/zetta55byte/constitutional-os-langchain) -- SDK + integrations
- [Paper](https://zenodo.org/records/19075163) -- DOI: 10.5281/zenodo.19075163

---

## License

MIT
