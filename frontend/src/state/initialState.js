export const initialState = {
  // Session
  phase: "idle",
  sessionId: null,
  query: '',
  profile: 'governance',
  runtime: 'claude',
  status: 'idle', // idle | running | complete | error

  // Agents
  agents: {},

  // D3 graph
  graph: { nodes: [], links: [] },

  // Membrane log
  membraneLog: [],

  // Continuity chain
  continuityChain: [],

  // Stability
  stabilityHistory: [],
  currentStability: 1.0,

  // Final output
  finalBrief: null,
  runComplete: false,
};
