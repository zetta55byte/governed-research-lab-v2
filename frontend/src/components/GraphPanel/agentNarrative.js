export const agentNarrative = {
  planner: {
    voice: "measured",
    tone: "strategic",
    sequence: {
      low: [
        { text: "Planner evaluating stable pathways." },
        { text: "Low‑entropy planning cycle engaged." },
      ],
      medium: [
        { text: "Planner synthesizing viable routes." },
        { text: "Rebalancing constraints and objectives." },
      ],
      high: [
        { text: "Planner under high‑entropy load." },
        { text: "Exploring unstable but promising trajectories." },
      ],
    },
  },

  researcher: {
    voice: "curious",
    tone: "analytical",
    sequence: {
      low: [
        { text: "Researcher scanning known surfaces." },
        { text: "Low‑entropy data acquisition." },
      ],
      medium: [
        { text: "Researcher probing new informational ridges." },
        { text: "Signal‑to‑noise ratio acceptable." },
      ],
      high: [
        { text: "Researcher encountering turbulent data flows." },
        { text: "Entropy spike detected in knowledge substrate." },
      ],
    },
  },

  critic: {
    voice: "sharp",
    tone: "skeptical",
    sequence: {
      low: [
        { text: "Critic reviewing outputs with calm precision." },
        { text: "Minimal deviations detected." },
      ],
      medium: [
        { text: "Critic identifying structural weaknesses." },
        { text: "Evaluating coherence and validity." },
      ],
      high: [
        { text: "Critic under high‑entropy strain." },
        { text: "Systemic inconsistencies surfacing rapidly." },
      ],
    },
  },

  synthesizer: {
    voice: "harmonic",
    tone: "integrative",
    sequence: {
      low: [
        { text: "Synthesizer aligning stable components." },
        { text: "Low‑entropy integration underway." },
      ],
      medium: [
        { text: "Synthesizer merging multi‑agent outputs." },
        { text: "Coherence rising across the membrane." },
      ],
      high: [
        { text: "Synthesizer stabilizing chaotic fragments." },
        { text: "High‑entropy synthesis in progress." },
      ],
    },
  },
}