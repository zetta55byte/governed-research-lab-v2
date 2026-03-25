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
        case "membrane_check":
        case "graph_update":
        case "delta_committed":
        case "stability_update":
        case "final_output":
        case "stream_end":
        case "error":
          dispatch(msg)
          break

        default:
          // ignore unknown event types
          break
      }

      if (msg.type === "stream_end" || msg.type === "error") {
        es.close()
      }
    }

    es.onerror = () => { es.close() }
    return () => { es.close() }

  }, [sessionId, dispatch])
}
