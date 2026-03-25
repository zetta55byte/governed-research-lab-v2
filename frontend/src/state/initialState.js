export const initialState = {
  sessionId: null,

  // run + phase
  status: "idle",
  phase: "idle",

  // graph + deltas
  graph: null,
  deltas: [],

  // stability
  currentStability: null,
  stabilityHistory: [],

  // logs
  membraneLog: [],

  // chain
  continuityChain: [],

  // agents
  agents: {},

  // misc
  query: "",                 // ⭐ add this
  profile: "governance",     // ⭐ backend default slug
  runtime: "claude",         // ⭐ backend default slug
};
