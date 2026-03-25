import React, { useEffect, useState } from "react"
import "./graphPanel.css"

export default function AgentNarrativeOverlay({ sequence }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [sequence])

  useEffect(() => {
    if (sequence.length <= 1) return
    const t = setTimeout(() => {
      setIndex((i) => (i + 1 < sequence.length ? i + 1 : i))
    }, 1500)
    return () => clearTimeout(t)
  }, [index, sequence.length])

  const current = sequence[index]
  if (!current) return null

  return (
    <div className="agent-narrative-overlay">
      <div className="narrative-text narrative-fade">
        {current.text}
      </div>
    </div>
  )
}