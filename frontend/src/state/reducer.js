import { initialState } from './initialState';

const PHASE_ORDER = ['idle', 'burst', 'drift', 'converge', 'complete'];

export function grlReducer(state, event) {
  switch (event.type) {

    // ── Phase control ──────────────────────────────────────────────────────
    case 'SET_PHASE':
      return { ...state, phase: event.phase };

    case 'ADVANCE_PHASE': {
      // Only advance if run is actually happening
      if (state.status !== 'running') return state;
      const i = PHASE_ORDER.indexOf(state.phase);
      const next = PHASE_ORDER[Math.min(i + 1, PHASE_ORDER.length - 2)]; // never auto-advance to complete
      return { ...state, phase: next };
    }

    // ── SSE events ────────────────────────────────────────────────────────
    case 'agent_update':
      return {
        ...state,
        agents: {
          ...state.agents,
          [event.agent_id]: {
            ...state.agents[event.agent_id],
            status: event.status,
            lastMessage: event.message,
          },
        },
      };

    case 'membrane_check':
      return {
        ...state,
        membraneLog: [...state.membraneLog, event],
        agents: {
          ...state.agents,
          [event.agent_id]: {
            ...state.agents[event.agent_id],
            membraneState: {
              last_stage: event.stage,
              last_result: event.result,
              last_membrane: event.membrane,
            },
          },
        },
      };

    case 'graph_update':
      return {
        ...state,
        graph: { nodes: event.nodes || [], links: event.links || [] },
        // NO phase change here — phase driven by SSE lifecycle only
      };

    case 'delta_committed':
      return {
        ...state,
        continuityChain: [...state.continuityChain, event.delta],
      };

    case 'stability_update':
      return {
        ...state,
        currentStability: event.score,
        stabilityHistory: [
          ...state.stabilityHistory,
          { score: event.score, components: event.components || {}, delta_id: event.delta_id },
        ],
      };

    case 'final_output':
      // Phase set to 'complete' by useSSE above, not here
      return {
        ...state,
        finalBrief: event.brief,
        continuityChain: event.continuity_chain || state.continuityChain,
        stabilityHistory: event.stability_curve
          ? event.stability_curve.map((score, i) => ({ score, delta_id: `d${i}` }))
          : state.stabilityHistory,
        currentStability: event.final_stability || state.currentStability,
        runComplete: true,
        status: 'complete',
      };

    case 'error':
      return { ...state, status: 'error' };

    case 'heartbeat':
    case 'stream_end':
      return state;

    // ── UI actions ────────────────────────────────────────────────────────
    case 'SET_SESSION':
      return { ...state, sessionId: event.sessionId, status: 'running' };

    case 'SET_QUERY':
      return { ...state, query: event.query };

    case 'SET_PROFILE':
      return { ...state, profile: event.profile };

    case 'SET_RUNTIME':
      return { ...state, runtime: event.runtime };

    case 'RESET':
      return {
        ...initialState,
        query: state.query,
        profile: state.profile,
        runtime: state.runtime,
      };

    default:
      return state;
  }
}
