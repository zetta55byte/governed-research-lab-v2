import { useState, useEffect } from "react"
import { motionConfig } from "./motionConfig"
import { computeNodePosition } from "./nodeMath"

export default function useGraphStory(data) {
  const [phase, setPhase] = useState("idle")
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [showD3, setShowD3] = useState(false)

  useEffect(() => {
    if (!data) return

 const baseNodes = (data.nodes || []).map((n) => ({
      ...n,
      x: computeNodePosition().x,
      y: computeNodePosition().y,
    }))

    setNodes(baseNodes)
    setEdges(data.links || [])

    const seq = [
      ["idle", motionConfig.durations.idle],
      ["burst", motionConfig.durations.burst],
      ["drift", motionConfig.durations.drift],
      ["converge", motionConfig.durations.converge],
      ["complete", motionConfig.durations.complete],
    ]

    let i = 0
    const run = () => {
      const [p, t] = seq[i]
      setPhase(p)
      i++
      if (i < seq.length) {
        setTimeout(run, t)
      } else {
        setShowD3(true)
      }
    }

    run()
  }, [data])

  return { phase, nodes, edges, showD3 }
}
