import React from "react"
import "./graphPanel.css"

export default function ContinuityChain({ deltas }) {
  if (!deltas || deltas.length === 0) return null

  return (
    <div className="continuity-chain">
      {deltas.map((d, i) => (
        <div key={i} className="chain-item">
          <div className="chain-index">{i + 1}</div>
          <div className="chain-content">
            <div className="chain-title">{d.title}</div>
            <div className="chain-desc">{d.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}