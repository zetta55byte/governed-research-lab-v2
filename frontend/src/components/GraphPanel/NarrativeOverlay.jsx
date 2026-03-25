import React, { useEffect, useState } from "react"
import { narrativeConfig } from "./narrativeConfig"
import "./graphPanel.css"

export default function NarrativeOverlay({ phase }) {
  const entry = narrativeConfig[phase]
  const sequence = entry?.sequence || []

  const [index, setIndex] = useState(0)

  // Reset sequence when phase changes
  useEffect(() => {
    setIndex(0)
  }, [phase])

  // Advance through lines
  useEffect(() => {
    if (sequence.length <= 1) return

    const timer = setTimeout(() => {
      setIndex((i) => (i + 1 < sequence.length ? i + 1 : i))
    }, 1600) // 1.6s per line (tweakable)

    return () => clearTimeout(timer)
  }, [index, sequence.length])

  const current = sequence[index]
  if (!current) return null

  return (
    <div className="narrative-overlay">
      <div className="narrative-text narrative-fade">
        {current.text}
      </div>
    </div>
  )
}