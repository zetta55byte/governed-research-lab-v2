import React, { useRef, useEffect } from 'react';
import { MEMBRANE_COLORS, VERDICT_COLORS } from '../../utils/formatMembrane';

function severityOf(entry) {
  if (entry.result === 'block') return { label: 'BLOCK', color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
  if (entry.result === 'defer') return { label: 'DEFER', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' };
  return { label: 'ALLOW', color: '#10b981', bg: 'rgba(16,185,129,.05)' };
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditLog({ membraneLog, continuityChain }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [membraneLog]);

  const entries = [
    ...membraneLog.map(e => ({ ...e, _type: 'membrane' })),
    ...continuityChain.map(d => ({ ...d, _type: 'delta', timestamp: d.timestamp })),
  ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding: '6px 10px', borderBottom: '1px solid #1e2a3a', fontSize: 9,
        color: '#334155', letterSpacing: 2, textTransform: 'uppercase',
        fontFamily: 'Syne', fontWeight: 700, display: 'flex', justifyContent: 'space-between'
      }}>
        <span>Audit Log</span>
        <span style={{ color: '#1e2a3a' }}>{entries.length} entries</span>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '6px 8px',
        display: 'flex', flexDirection: 'column', gap: 3
      }}>
        {entries.map((entry, i) => {

          // ───────────────────────────────
          // MEMBRANE ENTRY
          // ───────────────────────────────
          if (entry._type === 'membrane') {
            const sev = severityOf(entry);

            return (
              <div key={`m-${i}`} style={{
                display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 6px',
                borderRadius: 4, background: sev.bg,
                borderLeft: `2px solid ${sev.color}`,
                animation: 'fadeIn .2s',
              }}>
                <span style={{
                  fontSize: 8, color: '#334155', fontFamily: 'Space Mono',
                  whiteSpace: 'nowrap', marginTop: 1
                }}>
                  {formatTime(entry.timestamp)}
                </span>

                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '0 4px', borderRadius: 3,
                  background: sev.bg, color: sev.color, letterSpacing: 1,
                  whiteSpace: 'nowrap'
                }}>
                  {sev.label}
                </span>

                <span style={{
                  fontSize: 9,
                  color: MEMBRANE_COLORS[entry.membrane] || '#fff',
                  whiteSpace: 'nowrap'
                }}>
                  {entry.membrane?.split('_')[0]}
                </span>

                <span style={{
                  fontSize: 9, color: '#64748b', flex: 1, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {entry.agent_id} · {entry.stage}
                </span>
              </div>
            );
          }

          // ───────────────────────────────
          // DELTA ENTRY
          // ───────────────────────────────
          const verdict = entry.verdict || 'allow';
          const vColor = VERDICT_COLORS[verdict] || '#fff';

          return (
            <div key={`d-${i}`} style={{
              display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 6px',
              borderRadius: 4, borderLeft: `2px solid ${vColor}44`,
              background: 'rgba(255,255,255,.02)',
            }}>
              <span style={{
                fontSize: 8, color: '#334155', fontFamily: 'Space Mono',
                whiteSpace: 'nowrap', marginTop: 1
              }}>
                {formatTime(entry.timestamp)}
              </span>

              <span style={{ fontSize: 9, color: '#334155', whiteSpace: 'nowrap' }}>Δ</span>

              <span style={{ fontSize: 9, color: '#3b82f6', whiteSpace: 'nowrap' }}>
                {entry.agent_id}
              </span>

              <span style={{
                fontSize: 9, color: '#64748b', flex: 1, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {entry.description}
              </span>

              {entry.stability_after != null && (
                <span style={{
                  fontSize: 8,
                  color: entry.stability_after > 0.7 ? '#10b981' : '#f59e0b',
                  whiteSpace: 'nowrap', fontFamily: 'Space Mono'
                }}>
                  {entry.stability_after.toFixed(2)}
                </span>
              )}
            </div>
          );
        })}

        {!entries.length && (
          <div style={{ color: '#334155', fontSize: 11, textAlign: 'center', padding: 16 }}>
            Audit log empty
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
