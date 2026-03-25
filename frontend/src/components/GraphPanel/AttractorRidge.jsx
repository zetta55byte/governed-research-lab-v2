import React from "react"
import "./graphPanel.css"

export default function AttractorRidge({ phase, ridge }) {
  if (!ridge) return null

  return (
    <div className={`attractor-ridge ridge-${phase}`}>
      <svg width="600" height="120">
        <polyline
          points={ridge.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}