import React from "react"

export default function GraphBanner({ phase }) {
  const text = {
    idle: "System resting. Entropy stable.",
    burst: "Signal detected. Phase transition initiated.",
    drift: "Exploration underway. Patterns emerging.",
    converge: "Alignment increasing. Structure forming.",
    complete: "Synthesis achieved.",
  }[phase]

  return (
    <div className="graph-banner">
      {text}
    </div>
  )
}