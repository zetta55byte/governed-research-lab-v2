import React, { useState } from 'react';

const DEFAULT = {
  version: '1.0',
  membranes: {
    M1_safety:        { enabled: true, weight: 0.4 },
    M2_reversibility: { enabled: true, weight: 0.3 },
    M3_pluralism:     { enabled: true, weight: 0.2 },
    M4_human_primacy: { enabled: true, weight: 0.1 },
  },
  stability: { alpha: 0.4, beta: 0.3, gamma: 0.3 },
};

const MEMBRANE_COLORS = {
  M1_safety: '#ef4444', M2_reversibility: '#f59e0b',
  M3_pluralism: '#a855f7', M4_human_primacy: '#06b6d4',
};

function toYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  return Object.entries(obj).map(([k, v]) => {
    if (typeof v === 'object' && v !== null)
      return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
    return `${pad}${k}: ${v}`;
  }).join('\n');
}

export default function ConstitutionBuilder() {
  const [constitution, setConstitution] = useState(DEFAULT);
  const yaml = toYaml(constitution);

  const updateMembrane = (key, field, value) =>
    setConstitution(c => ({
      ...c,
      membranes: { ...c.membranes, [key]: { ...c.membranes[key], [field]: value } },
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #1e2a3a', fontSize: 9,
        color: '#334155', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Syne', fontWeight: 700 }}>
        Constitution Builder
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(constitution.membranes).map(([key, m]) => (
          <div key={key} style={{
            background: '#0d111a', border: `1px solid ${MEMBRANE_COLORS[key]}44`,
            borderRadius: 6, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: MEMBRANE_COLORS[key] }} />
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: MEMBRANE_COLORS[key] }}>
                {key.replace('_', ' ').toUpperCase()}
              </span>
              <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', cursor: 'pointer' }}>
                <input type="checkbox" checked={m.enabled}
                  onChange={() => updateMembrane(key, 'enabled', !m.enabled)} />
                enabled
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>weight</span>
              <input type="range" min="0" max="1" step="0.05" value={m.weight}
                onChange={e => updateMembrane(key, 'weight', parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: MEMBRANE_COLORS[key] }} />
              <span style={{ fontSize: 11, color: MEMBRANE_COLORS[key], width: 32, textAlign: 'right' }}>
                {m.weight.toFixed(2)}
              </span>
            </div>
          </div>
        ))}

        <div style={{ background: '#0d111a', border: '1px solid #1e2a3a', borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 9, color: '#334155',
            letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>YAML Preview</div>
          <pre style={{ fontSize: 10, color: '#10b981', lineHeight: 1.6, overflowX: 'auto' }}>{yaml}</pre>
        </div>

        <button onClick={() => navigator.clipboard?.writeText(yaml)} style={{
          background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)',
          borderRadius: 4, color: '#3b82f6', fontFamily: 'Space Mono', fontSize: 10,
          padding: '6px 12px', cursor: 'pointer',
        }}>
          Copy YAML
        </button>
      </div>
    </div>
  );
}
