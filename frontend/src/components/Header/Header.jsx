import React from 'react';
import { stabilityColor } from '../../utils/formatStability';

export default function Header({ stability, runtime, status }) {
  const color = stabilityColor(stability);
  return (
    <header style={{
      background: '#0d111a', borderBottom: '1px solid #1e2a3a',
      display: 'flex', alignItems: 'center', padding: '0 16px',
      height: 48, gap: 16, position: 'relative', zIndex: 100,
    }}>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, letterSpacing: -0.5 }}>
        ◈ <span style={{ color: '#3b82f6' }}>GRL</span> v2
      </div>
      <span style={{ color: '#334155', fontSize: 10, letterSpacing: 1 }}>
        Constitutional OS · Multi-Agent · {runtime?.toUpperCase()}
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 20, border: '1px solid #1e2a3a', fontSize: 11 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color,
          animation: 'pulse 2s infinite' }} />
        S(t) = {typeof stability === "number" ? stability.toFixed(3) : "—"}
      </div>
      {status === 'complete' && (
        <div style={{ fontSize: 11, color: '#10b981', padding: '3px 10px',
          border: '1px solid rgba(16,185,129,.3)', borderRadius: 4 }}>
          ✓ Complete
        </div>
      )}
    </header>
  );
}
