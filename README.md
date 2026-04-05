# governed-research-lab-v2




> A new ontology. Not a UI upgrade.




The second generation of the Constitutional OS flagship reference implementation.




[![Constitutional OS](https://img.shields.io/badge/governed%20by-Constitutional%20OS-blueviolet)](https://github.com/zetta55byte/constitutional-os)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)




**[Live Demo](https://governed-research-lab-v2.vercel.app)** — run a governed research cycle in your browser. Watch membranes check, deltas commit, and the Lyapunov curve update in real time.




---





## Curvature-Aware Governance (hcderiv integration)

GRL v2 uses [hcderiv](https://github.com/zetta55byte/hypercomplex) to compute
**exact Hessians** of the Lyapunov potential V(t) at each proposed state update.
This gates delta commits based on local curvature, not just scalar value.

```python
from core.curvature import CurvatureEngine

engine = CurvatureEngine(alpha=0.4, beta=0.3, gamma=0.3, nonlinear=True)

# After each proposed delta:
report = engine.analyse([c, u, d])   # exact 3x3 Hessian via hcderiv
if not report.is_safe:
    reject_delta(f"max eigenvalue {report.max_eigenvalue:.3f} exceeds threshold")
```

**Why exact Hessians?**
- The scalar V(t) tells you *where* the system is on the stability surface.
- The Hessian tells you *how fast* curvature is changing — the second-order
  geometry that governs whether a proposed step moves toward or away from a
  stable attractor.
- Diagonal approximations (finite differences) miss off-diagonal coupling
  between contradiction, uncertainty, and drift.

**Install:**
```bash
pip install hcderiv           # NumPy backend
pip install "hcderiv[jax]"    # JAX/XLA backend
```

See [`backend/examples/curvature_governed_agent.py`](backend/examples/curvature_governed_agent.py)
for a full demo with 8 agent steps, 3 curvature-based rejections.


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
