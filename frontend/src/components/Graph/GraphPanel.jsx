import React, { useRef } from 'react';
import { useGraph } from '../../hooks/useGraph';

export default function GraphPanel({ graph }) {
  const svgRef = useRef(null);
  useGraph(svgRef, graph);

  return (
    <div style={{ height: '100%', background: '#07090f', position: 'relative', overflow: 'hidden', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {!graph?.nodes?.length && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10, color: '#334155', pointerEvents: 'none',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ fontSize: 48, opacity: .2 }}>◈</div>
          <div style={{ fontFamily: 'Syne', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
            Awaiting Research
          </div>
        </div>
      )}
    </div>
  );
}

