// DeltaCard.jsx
import React from 'react';
import { formatDeltaId, getDeltaBorderColor } from '../../utils/formatDelta';
import { MEMBRANE_COLORS, verdictIcon, membraneShortName } from '../../utils/formatMembrane';

export function DeltaCard({ delta, selected, onSelect }) {
  const verdict = delta.verdict || 'allow';
  const isContested = delta.contested_by?.length > 0;
  const borderColor = isContested ? '#a855f7' : getDeltaBorderColor(verdict);

  return (
    <div
      onClick={() => onSelect?.(delta.delta_id)}
      style={{
        borderRadius: 6, border: `1px solid ${selected ? '#3b82f6' : '#1e2a3a'}`,
        borderLeft: `3px solid ${borderColor}`,
        padding: '8px 10px', cursor: 'pointer', marginBottom: 6,
        background: selected ? 'rgba(59,130,246,.05)' : 'transparent',
        transition: 'border-color .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: '#334155', fontWeight: 700 }}>{formatDeltaId(delta.delta_id)}</span>
        <span style={{ fontSize: 9, color: '#3b82f6' }}>{delta.agent_id}</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: borderColor, textTransform: 'uppercase', letterSpacing: 1 }}>
          {verdict}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#e2e8f0', marginBottom: 4, lineHeight: 1.4 }}>
        {delta.description}
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {Object.entries(delta.membrane_results || {}).map(([m, r]) => (
          <span key={m} style={{
            fontSize: 8, padding: '1px 4px', borderRadius: 8,
            background: `${MEMBRANE_COLORS[m] || '#666'}22`,
            color: MEMBRANE_COLORS[m] || '#fff',
            border: `1px solid ${MEMBRANE_COLORS[m] || '#666'}44`,
          }}>
            {membraneShortName(m)} {verdictIcon(r)}
          </span>
        ))}
      </div>
      {delta.stability_after != null && (
        <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>
          S(t): {delta.stability_after != null ? delta.stability_after.toFixed(3) : "—"}
        </div>
      )}
      {isContested && (
        <div style={{ fontSize: 9, color: '#a855f7', marginTop: 2 }}>
          ⚡ Contested by: {delta.contested_by.join(', ')}
        </div>
      )}
    </div>
  );
}
