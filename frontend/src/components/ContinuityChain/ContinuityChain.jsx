import React from "react"

export default function ContinuityChain({ deltas, phase }) {
  const safe = deltas || []

  return (
    <div style={{ fontSize: 12, fontFamily: "Space Grotesk, system-ui" }}>
      <div style={{ marginBottom: 6, opacity: 0.7 }}>
        Continuity — phase: {phase}
      </div>

      {safe.length === 0 && (
        <div style={{ opacity: 0.5 }}>No chain entries yet.</div>
      )}

      {safe.map((d, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          {typeof d === "string" ? d : JSON.stringify(d)}
        </div>
      ))}
    </div>
  )
}
