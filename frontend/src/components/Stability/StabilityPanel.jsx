import React, { useRef } from 'react';
import { useStabilityChart } from '../../hooks/useStability';
import { stabilityColor } from '../../utils/formatStability';

function Sparkline({ values }) {
  if (!values.length) return null;
  const w = 60, h = 20;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const last = values[values.length - 1];
  const color = stabilityColor(last);
  return (
    <svg width={w} height={h} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(values.length - 1) / Math.max(values.length - 1, 1) * w}
        cy={h - ((last - min) / range) * h} r="3" fill={color} />
    </svg>
  );
}

export default function StabilityPanel({ history, current }) {
  const svgRef = useRef(null);
  useStabilityChart(svgRef, history);
  const color = stabilityColor(current);
  const scores = history.map(h => h.score);

  const trend = scores.length > 1
    ? scores[scores.length - 1] - scores[scores.length - 2]
    : 0;
  const trendIcon = trend > 0.02 ? '↑' : trend < -0.02 ? '↓' : '→';
  const trendColor = trend > 0.02 ? '#10b981' : trend < -0.02 ? '#ef4444' : '#64748b';

  const lastComponents = history.length
    ? (history[history.length - 1]?.components || {}) : {};

  return (
    <div style={{
      background: '#0d111a', borderTop: '1px solid #1e2a3a',
      display: 'flex', alignItems: 'center', padding: '0 16px',
      gap: 20, height: 72, flexShrink: 0,
    }}>
      {/* Formula */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Syne', fontSize: 9, color: '#334155', letterSpacing: 1 }}>
          V(t) = α·c + β·u + γ·d
        </span>
        <span style={{ fontFamily: 'Syne', fontSize: 9, color: '#334155', letterSpacing: 1 }}>
          S(t) = 1 − V(t)
        </span>
      </div>

      {/* Big score */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, color,
          transition: 'color .3s', lineHeight: 1 }}>
          {current.toFixed(3)}
        </span>
        <span style={{ fontSize: 14, color: trendColor, fontFamily: 'Syne', fontWeight: 700 }}>
          {trendIcon}
        </span>
      </div>

      {/* Component breakdown */}
      {(lastComponents?.contradiction != null) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          {[
            ['c', lastComponents?.contradiction, '#ef4444'],
            ['u', lastComponents?.uncertainty,   '#f59e0b'],
            ['d', lastComponents?.drift,          '#3b82f6'],
          ].map(([k, v, c]) => v != null ? (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, color: '#334155', fontFamily: 'Space Mono', width: 8 }}>{k}</span>
              <div style={{ width: 40, height: 3, background: '#1e2a3a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${v * 100}%`, height: '100%', background: c, borderRadius: 2,
                  transition: 'width .3s' }} />
              </div>
              <span style={{ fontSize: 8, color: c, fontFamily: 'Space Mono', width: 28 }}>
                {v?.toFixed(2)}
              </span>
            </div>
          ) : null)}
        </div>
      )}

      {/* Sparkline */}
      {scores.length > 1 && (
        <div style={{ flexShrink: 0 }}>
          <Sparkline values={scores.slice(-20)} />
        </div>
      )}

      {/* D3 line chart */}
      <div style={{ flex: 1, height: 50 }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Delta count */}
      {history.length > 0 && (
        <span style={{ fontSize: 10, color: '#334155', whiteSpace: 'nowrap', fontFamily: 'Space Mono' }}>
          Δ{history.length}
        </span>
      )}
    </div>
  );
}
