import { useEffect } from "react"

export function useSSE(sessionId, dispatch) {
  useEffect(() => {
    if (!sessionId) return
    const backend = import.meta.env.VITE_GRL_BACKEND_URL
    const url = `${backend}/stream/${sessionId}`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      if (!event.data) return
      let msg
      try { msg = JSON.parse(event.data) } catch { return }

      switch (msg.type) {

        case "agent_update":
          dispatch({ type: "AGENT_UPDATE", agentId: msg.agent_id, agentName: msg.agent_name, status: msg.status, message: msg.message })
          break

        case "membrane_check":
          dispatch({ type: "ADD_MEMBRANE_LOG", entry: { agentId: msg.agent_id, stage: msg.stage, membrane: msg.membrane, result: msg.result, reason: msg.reason, deltaId: msg.delta_id, timestamp: msg.timestamp } })
          break

        case "graph_update":
          dispatch({ type: "SET_GRAPH", graph: { nodes: msg.nodes, links: msg.links } })
          break

        case "delta_committed":
          dispatch({ type: "ADD_DELTA", delta: msg.delta })
          dispatch({ type: "ADD_CHAIN_ENTRY", entry: msg.delta })
          break

        case "stability_update":
          dispatch({ type: "SET_STABILITY", score: msg.score, components: msg.components })
          break

        case "final_output":
          dispatch({ type: "SET_FINAL_OUTPUT", brief: msg.brief, continuityChain: msg.continuity_chain, stabilityCurve: msg.stability_curve, finalStability: msg.final_stability })
          dispatch({ type: "SET_STATUS", status: "complete" })
          break

        case "stream_end":
          dispatch({ type: "SET_STATUS", status: "complete" })
          es.close()
          break

        case "error":
          dispatch({ type: "SET_STATUS", status: "error" })
          es.close()
          break

        default:
          break
      }
    }

    es.onerror = () => { es.close() }
    return () => { es.close() }
  }, [sessionId, dispatch])
}
