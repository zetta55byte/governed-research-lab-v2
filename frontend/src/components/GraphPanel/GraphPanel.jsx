import React from "react"
import GraphNodes from "./GraphNodes"
import GraphBanner from "./GraphBanner"
import GraphOverlay from "./GraphOverlay"
import GraphD3View from "./GraphD3View"
import AttractorRidge from "./AttractorRidge"
import NarrativeOverlay from "./NarrativeOverlay"
import { useGraphStory } from "./useGraphStory"
import "./graphPanel.css"

export default function GraphPanel({ data, phaseOverride }) {
  const { phase, nodes, edges, showD3, entropy } = useGraphStory(data)
  const effectivePhase = phaseOverride || phase

  return (
    <div className="graph-panel">
      <GraphBanner phase={effectivePhase} />

      <NarrativeOverlay
        phase={effectivePhase}
        entropy={entropy}
      />

      <GraphOverlay phase={effectivePhase} />
      <AttractorRidge phase={effectivePhase} nodes={nodes} />

      {!showD3 && (
        <GraphNodes
          phase={effectivePhase}
          nodes={nodes}
        />
      )}

      {showD3 && (
        <GraphD3View
          nodes={nodes}
          edges={edges}
        />
      )}
    </div>
  )
}