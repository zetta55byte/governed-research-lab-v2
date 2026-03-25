import { useEffect, useState } from "react"
import { createSSEClient } from "../components/GraphPanel/sseClient"
import { PHASE_SEQUENCE } from "../components/GraphPanel/phases"

export function useGraphStore(sseUrl) {
  const [data, setData] = useState(null)
  const [phase, setPhase] = useState("idle")

  useEffect(() => {
    if (!sseUrl) return

    const client = createSSEClient(sseUrl, (msg) => {
      if (msg.type === "graph_update") {
        setData(msg.payload)
      }
      if (msg.type === "phase") {
        setPhase(msg.phase)
      }
    })

    return () => client.close()
  }, [sseUrl])

  // fallback: local phase progression if backend doesn’t drive it
  useEffect(() => {
    if (!data) return
    let i = 0
    const tick = () => {
      setPhase(PHASE_SEQUENCE[i])
      i = (i + 1) % PHASE_SEQUENCE.length
    }
    tick()
    const id = setInterval(tick, 2500)
    return () => clearInterval(id)
  }, [data])

  return { data, phase }
}