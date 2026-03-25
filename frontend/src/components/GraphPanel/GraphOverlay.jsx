import React from "react"

export default function GraphOverlay({ phase }) {
  return (
    <div className={`graph-overlay phase-${phase}`}>
      <div className="overlay-gradient" />
    </div>
  )
}