import React, { useRef, useEffect } from 'react';
import { MEMBRANE_COLORS, VERDICT_COLORS, membraneShortName } from '../../utils/formatMembrane';

export default function MembraneLog({ log }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #1e2a3a', fontSize: 9,
        color: '#334155', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Syne', fontWeight: 700 }}>
        Membrane Log
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {log.slice(-80).map((entry, i) => (
          <div key={entry.delta_id + entry.membrane + i} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
            borderRadius: 4, fontSize: 10, animation: 'fadeIn .2s',
            borderLeft: `2px solid ${VERDICT_COLORS[entry.result] || '#334155'}`,
            background: entry.result === 'block' ? 'rgba(239,68,68,.05)'
                      : entry.result === 'defer' ? 'rgba(245,158,11,.05)' : 'transparent',
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
              background: `${MEMBRANE_COLORS[entry.membrane] || '#666'}22`,
              color: MEMBRANE_COLORS[entry.membrane] || '#fff',
            }}>
              {membraneShortName(entry.membrane)}
            </span>
            <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
              color: VERDICT_COLORS[entry.result] || '#fff' }}>
              {entry.result}
            </span>
            <span style={{ fontSize: 9, color: '#64748b' }}>{entry.agent_id}</span>
          </div>
        ))}
        <div ref={endRef} />
        {!log.length && (
          <div style={{ color: '#334155', fontSize: 11, textAlign: 'center', padding: 16 }}>
            No membrane checks yet
          </div>
        )}
      </div>
    </div>
  );
}
