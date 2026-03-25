import React from "react"
import "./graphPanel.css"

export default function ContinuityChain({ deltas, finalBrief }) {
  return (
    <div className="continuity-chain">
      {finalBrief && (
        <div style={{
          marginBottom: 12, padding: "8px 10px",
          background: "#0f172a", borderRadius: 6,
          border: "1px solid #1e2a3a", fontSize: 11,
          color: "#94a3b8", fontFamily: "Space Mono, monospace",
          lineHeight: 1.6, whiteSpace: "pre-wrap",
        }}>
          <div style={{
            color: "#a855f7", fontSize: 9, letterSpacing: 2,
            textTransform: "uppercase", marginBottom: 4,
          }}>Executive Summary</div>
          {finalBrief}
        </div>
      )}
      {(!deltas || deltas.length === 0) && !finalBrief && (
        <div style={{ color: "#334155", fontSize: 11, fontFamily: "Space Mono" }}>
          Awaiting run...
        </div>
      )}
      {(deltas || []).map((d, i) => (
        <div key={i} className="chain-item">
          <div className="chain-index">{i + 1}</div>
          <div className="chain-content">
            <div className="chain-title">{d.agent_id || d.title || ""}</div>
            <div className="chain-desc">{d.description || d.stage || ""}</div>
          </div>
        </div>
      ))}
    </div>
  )
}