export const narrativeConfig = {
  idle: {
    sequence: [
      { text: "System initializing…" },
      { text: "Preparing agents…" },
      { text: "Stabilizing substrate…" }
    ]
  },

  burst: {
    sequence: [
      { text: "Agents generating hypotheses…" },
      { text: "Expanding the search frontier…" },
      { text: "Entropy rising at the boundary…" }
    ]
  },

  drift: {
    sequence: [
      { text: "Exploring the entropy landscape…" },
      { text: "Mapping attractor ridges…" },
      { text: "Tracking stability gradients…" }
    ]
  },

  converge: {
    sequence: [
      { text: "Stabilizing attractors…" },
      { text: "Collapsing entropy pockets…" },
      { text: "Aligning trajectories…" }
    ]
  },

  complete: {
    sequence: [
      { text: "Synthesis complete." },
      { text: "Attractors locked." },
      { text: "System ready for next cycle." }
    ]
  }
}