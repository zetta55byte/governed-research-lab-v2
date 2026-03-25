import React from "react"

export default function StabilityPanel({ history, current }) {
  const safeHistory = history || []

  return (
    <div style={{ fontSize: 12, fontFamily: "Space Grotesk, system-ui" }}>
      <div style={{ marginBottom: 6, opacity: 0.7 }}>Stability</div>

      <div style={{ marginBottom: 8 }}>
        Current: {current ?? "—"}
      </div>

      <div style={{ opacity: 0.7, marginBottom: 4 }}>History</div>
      <div style={{ maxHeight: 120, overflowY: "auto" }}>
        {safeHistory.map((h, i) => (
          <div key={i} style={{ opacity: 0.8 }}>
            {h}
          </div>
        ))}
      </div>
    </div>
  )
}


