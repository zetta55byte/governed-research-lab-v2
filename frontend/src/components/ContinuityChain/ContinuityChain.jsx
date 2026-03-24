import React, { useState } from 'react';
import { DeltaCard } from './DeltaCard';

const AGENTS = ['planner', 'researcher_1', 'researcher_2', 'researcher_3', 'critic', 'synthesizer'];
const MEMBRANES = ['M1_SAFETY', 'M2_REVERSIBILITY', 'M3_PLURALISM', 'M4_HUMAN_PRIMACY'];
const M_LABELS = { M1_SAFETY: 'M1', M2_REVERSIBILITY: 'M2', M3_PLURALISM: 'M3', M4_HUMAN_PRIMACY: 'M4' };

export default function ContinuityChain({ deltas }) {
  const [filters, setFilters] = useState({ agents: new Set(), membranes: new Set(), contestedOnly: false });
  const [selectedId, setSelectedId] = useState(null);

  const toggle = (key, value) => setFilters(f => {
    const next = new Set(f[key]);
    next.has(value) ? next.delete(value) : next.add(value);
    return { ...f, [key]: next };
  });

  const filtered = deltas.filter(d => {
    if (filters.agents.size > 0) {
      const involved = new Set([d.agent_id, ...(d.observers || []), ...(d.contested_by || [])]);
      if (![...filters.agents].some(a => involved.has(a))) return false;
    }
    if (filters.membranes.size > 0) {
      const keys = Object.keys(d.membrane_results || {});
      if (![...filters.membranes].some(m => keys.includes(m))) return false;
    }
    if (filters.contestedOnly && !d.contested_by?.length) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #1e2a3a', fontSize: 9,
        color: '#334155', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Syne', fontWeight: 700 }}>
        Continuity Chain · {filtered.length}/{deltas.length}
      </div>

      {/* Filters */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e2a3a', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {AGENTS.map(a => (
          <span key={a} onClick={() => toggle('agents', a)} style={{
            padding: '2px 6px', borderRadius: 10, fontSize: 9, cursor: 'pointer',
            border: `1px solid ${filters.agents.has(a) ? '#3b82f6' : '#1e2a3a'}`,
            background: filters.agents.has(a) ? '#3b82f6' : 'transparent',
            color: filters.agents.has(a) ? '#fff' : '#64748b',
          }}>{a.split('_')[0]}</span>
        ))}
        {MEMBRANES.map(m => (
          <span key={m} onClick={() => toggle('membranes', m)} style={{
            padding: '2px 6px', borderRadius: 10, fontSize: 9, cursor: 'pointer',
            border: `1px solid ${filters.membranes.has(m) ? '#a855f7' : '#1e2a3a'}`,
            background: filters.membranes.has(m) ? '#a855f7' : 'transparent',
            color: filters.membranes.has(m) ? '#fff' : '#64748b',
          }}>{M_LABELS[m]}</span>
        ))}
        <span onClick={() => setFilters(f => ({ ...f, contestedOnly: !f.contestedOnly }))} style={{
          padding: '2px 6px', borderRadius: 10, fontSize: 9, cursor: 'pointer',
          border: `1px solid ${filters.contestedOnly ? '#ef4444' : '#1e2a3a'}`,
          background: filters.contestedOnly ? 'rgba(239,68,68,.15)' : 'transparent',
          color: filters.contestedOnly ? '#ef4444' : '#64748b',
        }}>⚡ contested</span>
      </div>

      {/* Chain */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {[...filtered].reverse().map(d => (
          <DeltaCard key={d.delta_id} delta={d}
            selected={selectedId === d.delta_id}
            onSelect={setSelectedId} />
        ))}
        {!filtered.length && (
          <div style={{ color: '#334155', fontSize: 11, textAlign: 'center', padding: 16 }}>
            {deltas.length ? 'No deltas match filters' : 'No deltas yet'}
          </div>
        )}
      </div>
    </div>
  );
}
