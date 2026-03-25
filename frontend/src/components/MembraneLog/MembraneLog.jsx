import React from "react"

export default function MembraneLog({ logs }) {
  const safe = logs || []

  return (
    <div style={{ fontSize: 12, fontFamily: "Space Grotesk, system-ui" }}>
      {safe.slice(-80).map((entry, i) => (
        <div key={i} style={{ marginBottom: 4, opacity: 0.85 }}>
          {entry}
        </div>
      ))}
    </div>
  )
}
