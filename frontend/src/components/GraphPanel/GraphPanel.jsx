import React from "react"
import GraphNodes from "./GraphNodes"
import GraphBanner from "./GraphBanner"
import GraphOverlay from "./GraphOverlay"
import GraphD3View from "./GraphD3View"
import AttractorRidge from "./AttractorRidge"
import NarrativeOverlay from "./NarrativeOverlay"
import { useGraphStory } from "./useGraphStory"
import { useAgentNarrative } from "./useAgentNarrative"
import AgentNarrativeOverlay from "./AgentNarrativeOverlay"
import "./graphPanel.css"

export default function GraphPanel({ data, phaseOverride, entropy }) {
  const { phase, nodes, edges, showD3 } = useGraphStory(data)
  const effectivePhase = phaseOverride || phase
  const agent = data?.activeAgent || null
  const agentStory = useAgentNarrative(agent, effectivePhase, entropy)

  return (
    <div className="graph-panel">
      <GraphBanner phase={effectivePhase} />

      <NarrativeOverlay
        phase={effectivePhase}
        entropy={entropy}
      /> 

      <AgentNarrativeOverlay sequence={agentStory.sequence} />
      <GraphOverlay phase={effectivePhase} />

      <AttractorRidge
        phase={effectivePhase}
        nodes={nodes}
      />

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
