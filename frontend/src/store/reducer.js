// store/reducer.js
// The single reducer that is the entire UI brain.
// All six SSE event types flow through here.

export const INITIAL_STATE = {
  // Session
  sessionId: null,
  query: "",
  profile: "governance",
  runtime: "claude",
  status: "idle", // idle | running | complete | error

  // Agents
  agents: {
    query_node:    { id: "query_node",    name: "Query",        role: "query",       status: "idle", membraneState: {} },
    planner:       { id: "planner",       name: "Planner",      role: "planner",     status: "idle", membraneState: {} },
    researcher_1:  { id: "researcher_1",  name: "Researcher #1", role: "research",   status: "idle", membraneState: {} },
    researcher_2:  { id: "researcher_2",  name: "Researcher #2", role: "research",   status: "idle", membraneState: {} },
    researcher_3:  { id: "researcher_3",  name: "Researcher #3", role: "research",   status: "idle", membraneState: {} },
    critic:        { id: "critic",        name: "Critic",       role: "critic",      status: "idle", membraneState: {} },
    synthesizer:   { id: "synthesizer",   name: "Synthesizer",  role: "synthesizer", status: "idle", membraneState: {} },
    human:         { id: "human",         name: "Human",        role: "human",       status: "idle", membraneState: {} },
  },

  // D3 Graph
  graph: { nodes: [], links: [] },

  // Membrane log
  membraneLog: [],

  // Continuity chain
  continuityChain: [],

  // Stability
  stabilityHistory: [],   // [{ score, components, delta_id, timestamp }]
  currentStability: 1.0,

  // Final output
  finalBrief: null,
  runComplete: false,

  // Chain viewer filters
  filters: {
    agents: [],           // [] = all
    membranes: [],        // [] = all
    contestedOnly: false,
    selectedDeltaId: null,
  },

  // Logs
  eventLog: [],
};

export function grlReducer(state, action) {
  // Push to event log (last 500)
  const withLog = (newState) => ({
    ...newState,
    eventLog: [...state.eventLog.slice(-499), {
      type: action.type,
      timestamp: action.timestamp || Date.now() / 1000,
      agent_id: action.agent_id,
      message: action.message || action.type,
    }],
  });

  switch (action.type) {

    // ── SSE events ──────────────────────────────────────────────────────────

    case "agent_update":
      return withLog({
        ...state,
        agents: {
          ...state.agents,
          [action.agent_id]: {
            ...state.agents[action.agent_id],
            status: action.status,
            lastMessage: action.message,
          },
        },
      });

    case "membrane_check":
      return withLog({
        ...state,
        membraneLog: [...state.membraneLog, {
          id: `${action.delta_id}-${action.membrane}`,
          agent_id: action.agent_id,
          stage: action.stage,
          membrane: action.membrane,
          result: action.result,
          reason: action.reason,
          delta_id: action.delta_id,
          timestamp: action.timestamp,
        }],
        agents: {
          ...state.agents,
          [action.agent_id]: {
            ...state.agents[action.agent_id],
            membraneState: {
              last_stage: action.stage,
              last_result: action.result,
              last_membrane: action.membrane,
            },
          },
        },
      });

    case "graph_update":
      return withLog({
        ...state,
        graph: {
          nodes: action.nodes || [],
          links: action.links || [],
        },
      });

    case "delta_committed":
      return withLog({
        ...state,
        continuityChain: [...state.continuityChain, action.delta],
      });

    case "stability_update":
      return withLog({
        ...state,
        currentStability: action.score,
        stabilityHistory: [...state.stabilityHistory, {
          score: action.score,
          components: action.components || {},
          delta_id: action.delta_id,
          timestamp: action.timestamp,
        }],
      });

    case "final_output":
      return withLog({
        ...state,
        finalBrief: action.brief,
        continuityChain: action.continuity_chain || state.continuityChain,
        stabilityHistory: action.stability_curve
          ? action.stability_curve.map((score, i) => ({ score, delta_id: `delta_${i}` }))
          : state.stabilityHistory,
        currentStability: action.final_stability || state.currentStability,
        runComplete: true,
        status: "complete",
      });

    case "error":
      return withLog({ ...state, status: "error" });

    case "heartbeat":
      return state;

    // ── UI actions ──────────────────────────────────────────────────────────

    case "SET_SESSION":
      return { ...state, sessionId: action.sessionId, status: "running" };

    case "SET_QUERY":
      return { ...state, query: action.query };

    case "SET_PROFILE":
      return { ...state, profile: action.profile };

    case "SET_RUNTIME":
      return { ...state, runtime: action.runtime };

    case "SET_FILTER_AGENTS":
      return { ...state, filters: { ...state.filters, agents: action.agents } };

    case "SET_FILTER_MEMBRANES":
      return { ...state, filters: { ...state.filters, membranes: action.membranes } };

    case "SET_FILTER_CONTESTED":
      return { ...state, filters: { ...state.filters, contestedOnly: action.value } };

    case "SELECT_DELTA":
      return { ...state, filters: { ...state.filters, selectedDeltaId: action.delta_id } };

    case "RESET":
      return {
        ...INITIAL_STATE,
        query: state.query,
        profile: state.profile,
        runtime: state.runtime,
      };

    default:
      return state;
  }
}

// ── Derived selectors ────────────────────────────────────────────────────────

export function filteredChain(chain, filters) {
  return chain.filter(delta => {
    if (filters.agents.length > 0) {
      const agentMatch = filters.agents.includes(delta.agent_id)
        || (delta.observers || []).some(o => filters.agents.includes(o))
        || (delta.contested_by || []).some(c => filters.agents.includes(c));
      if (!agentMatch) return false;
    }
    if (filters.membranes.length > 0) {
      const membraneMatch = filters.membranes.some(m => {
        const result = (delta.membrane_results || {})[m];
        return result === "block" || result === "defer";
      });
      if (!membraneMatch) return false;
    }
    if (filters.contestedOnly && (!delta.contested_by || delta.contested_by.length === 0)) {
      return false;
    }
    return true;
  });
}
