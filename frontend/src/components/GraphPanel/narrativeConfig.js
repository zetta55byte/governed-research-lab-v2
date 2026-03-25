// narrativeConfig.js
// GRL v2 — entropy‑aware narrative sequences

export const narrativeConfig = {
  idle: {
    sequence: {
      low: [
        { text: "System standing by." },
        { text: "Awaiting initialization." },
      ],
      medium: [
        { text: "Membrane quiet. No active processes." },
        { text: "Ready for activation." },
      ],
      high: [
        { text: "Entropy rising despite inactivity." },
        { text: "Potential energy accumulating." },
      ],
    },
  },

  burst: {
    sequence: {
      low: [
        { text: "Initial burst detected." },
        { text: "Stability holding steady." },
      ],
      medium: [
        { text: "Burst phase engaged." },
        { text: "Graph nodes activating." },
        { text: "Membrane tension increasing." },
      ],
      high: [
        { text: "High‑entropy burst ignited." },
        { text: "Chaotic expansion underway." },
        { text: "Stability oscillating rapidly." },
      ],
    },
  },

  drift: {
    sequence: {
      low: [
        { text: "System drifting gently." },
        { text: "Minor adjustments propagating." },
      ],
      medium: [
        { text: "Drift phase active." },
        { text: "Graph topology shifting." },
        { text: "Continuity chain extending." },
      ],
      high: [
        { text: "High‑entropy drift detected." },
        { text: "Unstable attractors forming." },
        { text: "Membrane distortion increasing." },
      ],
    },
  },

  converge: {
    sequence: {
      low: [
        { text: "Convergence beginning." },
        { text: "Stability improving." },
      ],
      medium: [
        { text: "System converging." },
        { text: "Attractors stabilizing." },
        { text: "Graph coherence rising." },
      ],
      high: [
        { text: "High‑entropy convergence attempt." },
        { text: "Stability fluctuating." },
        { text: "System forcing alignment." },
      ],
    },
  },

  complete: {
    sequence: {
      low: [
        { text: "Process complete." },
        { text: "System at rest." },
      ],
      medium: [
        { text: "Run complete." },
        { text: "Membrane settling." },
        { text: "Residual energy dissipating." },
      ],
      high: [
        { text: "High‑entropy completion." },
        { text: "System stabilizing post‑run." },
        { text: "Membrane recovering from turbulence." },
      ],
    },
  },
}
