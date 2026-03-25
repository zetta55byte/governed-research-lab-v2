import React from "react"
import { getNodeStyle } from "./nodeMath"

export default function GraphNodes({ phase, nodes }) {
  return (
    <div className="graph-nodes">
      {nodes.map((n) => (
        <div
          key={n.id}
          className="graph-node"
          style={getNodeStyle(phase, n)}
        />
      ))}
    </div>
  )
}