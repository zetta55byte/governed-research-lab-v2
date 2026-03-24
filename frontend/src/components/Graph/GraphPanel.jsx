import React, { useRef } from "react";
import { useGraph } from "../../hooks/useGraph";

export default function GraphPanel({ graph }) {
  const svgRef = useRef(null);
  useGraph(svgRef, graph);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#07090f", overflow: "hidden" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      {!graph?.nodes?.length && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#334155", gap: 10, pointerEvents: "none" }}>
          <div style={{ fontSize: 48, opacity: .2 }}>?</div>
          <div style={{ fontFamily: "Syne", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>Awaiting Research</div>
        </div>
      )}
    </div>
  );
}
