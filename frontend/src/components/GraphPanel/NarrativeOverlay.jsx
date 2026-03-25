import React, { useEffect, useState } from "react"
import { narrativeConfig } from "./narrativeConfig"
import "./graphPanel.css"

function bucketEntropy(entropy) {
  if (entropy == null) return "medium"
  if (entropy < 0.33) return "low"
  if (entropy < 0.66) return "medium"
  return "high"
}

export default function NarrativeOverlay({ phase, entropy }) {
  const entry = narrativeConfig[phase]
  if (!entry) return null

  const bucket = bucketEntropy(entropy)
  const sequence = entry.sequence?.[bucket] || entry.sequence || []
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [phase, bucket])

  useEffect(() => {
    if (sequence.length <= 1) return
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1 < sequence.length ? i + 1 : i))
    }, 1600)
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
