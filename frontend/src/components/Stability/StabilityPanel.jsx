import React, { useRef } from 'react';
import { useStabilityChart } from '../../hooks/useStability';
import { stabilityColor } from '../../utils/formatStability';

export default function StabilityPanel({ history, current }) {
  const svgRef = useRef(null);
  useStabilityChart(svgRef, history);
  const color = stabilityColor(current);

  return (
    <div style={{
      background: '#0d111a', borderTop: '1px solid #1e2a3a',
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, height: 72, flexShrink: 0,
    }}>
      <div style={{ fontFamily: 'Syne', fontSize: 10, color: '#334155', whiteSpace: 'nowrap' }}>
        V(t) = α·c + β·u + γ·d
      </div>
      <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color, whiteSpace: 'nowrap' }}>
        {current.toFixed(3)}
      </div>
      <div style={{ fontFamily: 'Syne', fontSize: 10, color: '#334155', whiteSpace: 'nowrap' }}>
        S(t) = 1 − V(t)
      </div>
      <div style={{ flex: 1, height: 50 }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {history.length > 1 && (
        <span style={{ fontSize: 10, color: '#334155', whiteSpace: 'nowrap' }}>
          Δ{history.length} ·{' '}
          {history[history.length - 1].score > history[0].score ? '↑' : '↓'} trend
        </span>
      )}
    </div>
  );
}
