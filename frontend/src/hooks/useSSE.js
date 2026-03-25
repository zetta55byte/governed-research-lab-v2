import { useEffect } from "react"

export function useSSE(sessionId, dispatch) {
  useEffect(() => {
    if (!sessionId) return

    const url = `/api/sse?sessionId=${encodeURIComponent(sessionId)}`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      if (!event.data) return
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      // STATUS → PHASE
      if (msg.type === "status") {
        dispatch({ type: "SET_STATUS", status: msg.status })

        if (msg.status === "running") {
          dispatch({ type: "SET_PHASE", phase: "burst" })
        }

        if (msg.status === "complete") {
          dispatch({ type: "SET_PHASE", phase: "complete" })
        }
      }

      // GRAPH → DATA + PHASE PROGRESSION
      if (msg.type === "graph") {
        dispatch({ type: "SET_GRAPH", graph: msg.graph })
        dispatch({ type: "ADVANCE_PHASE" })
      }

      // ENTROPY
      if (msg.type === "entropy") {
        dispatch({ type: "SET_ENTROPY", value: msg.value })
      }

      // DELTAS
      if (msg.type === "delta") {
        dispatch({ type: "ADD_DELTA", delta: msg.delta })
      }

      // LOGS
      if (msg.type === "log") {
        dispatch({ type: "ADD_LOG", log: msg.log })
      }

      // AUDIT
      if (msg.type === "audit") {
        dispatch({ type: "ADD_AUDIT", entry: msg.entry })
      }

      // STABILITY
      if (msg.type === "stability") {
        dispatch({ type: "SET_STABILITY", value: msg.value })
      }

      // RUNTIME
      if (msg.type === "runtime") {
        dispatch({ type: "SET_RUNTIME", value: msg.value })
      }

      // AGENTS
      if (msg.type === "agents") {
        dispatch({ type: "SET_AGENTS", agents: msg.agents })
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.close()
    }
  }, [sessionId, dispatch])
}
