import React from "react";
import GraphNodes from "./GraphNodes";
import GraphBanner from "./GraphBanner";
import GraphOverlay from "./GraphOverlay";
import GraphD3View from "./GraphD3View";
import AttractorRidge from "./AttractorRidge";
import { useGraphStory } from "./useGraphStory";
import "./graphPanel.css";

export default function GraphPanel({ data, phaseOverride }) {
  const safe = data || { nodes: [], edges: [] };

  const { phase, nodes, edges, showD3 } = useGraphStory(safe);
  const effectivePhase = phaseOverride || phase;

  return (
    <div className="graph-panel">
      <GraphBanner phase={effectivePhase} />
      <GraphOverlay phase={effectivePhase} />

      <AttractorRidge phase={effectivePhase} nodes={nodes} />

      {!showD3 && (
        <GraphNodes phase={effectivePhase} nodes={nodes} />
      )}

      {showD3 && (
        <GraphD3View nodes={nodes} edges={edges} />
      )}
    </div>
  );
}
