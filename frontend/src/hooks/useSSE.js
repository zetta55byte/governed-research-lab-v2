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

      // Dispatch the raw event — reducer handles all types by name
      dispatch(msg)

      // Close on terminal events
      if (msg.type === "stream_end" || msg.type === "error") {
        es.close()
      }
    }

    es.onerror = () => { es.close() }
    return () => { es.close() }
  }, [sessionId, dispatch])
}
