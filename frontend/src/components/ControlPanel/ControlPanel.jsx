import React from 'react';

const BACKEND = import.meta.env.VITE_GRL_BACKEND_URL ||
  'https://governed-research-lab-v2-production.up.railway.app';

const PROFILES  = ['ai_safety', 'evals', 'governance', 'planning', 'custom'];
const RUNTIMES  = ['claude', 'openai', 'autogen'];
const AGENT_IDS = ['planner','researcher_1','researcher_2','researcher_3','critic','synthesizer'];

const STATUS_COLOR = { idle: '#334155', running: '#3b82f6', done: '#10b981', blocked: '#ef4444' };

export default function ControlPanel({ state, dispatch }) {
  const isRunning = state.status === 'running';

  const startResearch = async () => {
    if (!state.query.trim() || isRunning) return;
    dispatch({ type: 'RESET' });
    try {
      const res = await fetch(`${BACKEND}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: state.query, profile: state.profile, runtime: state.runtime }),
      });
      const data = await res.json();
      dispatch({ type: 'SET_SESSION', sessionId: data.session_id });
    } catch (err) {
      dispatch({ type: 'error', message: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      background: '#0d111a', borderRight: '1px solid #1e2a3a' }}>

      {/* Query */}
      <div style={{ padding: 12, borderBottom: '1px solid #1e2a3a' }}>
        <div style={{ fontSize: 9, color: '#334155', letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: 'Syne', fontWeight: 700, marginBottom: 8 }}>Research Query</div>
        <textarea
          value={state.query}
          onChange={e => dispatch({ type: 'SET_QUERY', query: e.target.value })}
          disabled={isRunning}
          placeholder="What would you like to research?"
          style={{
            width: '100%', background: '#131929', border: '1px solid #1e2a3a', borderRadius: 6,
            padding: '8px 10px', color: '#e2e8f0', fontFamily: 'Space Mono', fontSize: 11,
            resize: 'vertical', minHeight: 64, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <select value={state.profile} onChange={e => dispatch({ type: 'SET_PROFILE', profile: e.target.value })}
            disabled={isRunning} style={{ flex: 1, background: '#131929', border: '1px solid #1e2a3a',
              borderRadius: 4, padding: '5px 8px', color: '#e2e8f0', fontFamily: 'Space Mono', fontSize: 10, outline: 'none' }}>
            {PROFILES.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
          </select>
          <select value={state.runtime} onChange={e => dispatch({ type: 'SET_RUNTIME', runtime: e.target.value })}
            disabled={isRunning} style={{ flex: 1, background: '#131929', border: '1px solid #1e2a3a',
              borderRadius: 4, padding: '5px 8px', color: '#e2e8f0', fontFamily: 'Space Mono', fontSize: 10, outline: 'none' }}>
            {RUNTIMES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <button onClick={startResearch} disabled={isRunning || !state.query.trim()} style={{
          width: '100%', marginTop: 8, padding: 9, background: isRunning ? '#1e3a5f' : '#3b82f6',
          color: '#fff', border: 'none', borderRadius: 6, fontFamily: 'Syne', fontWeight: 700,
          fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: isRunning ? 'not-allowed' : 'pointer',
          opacity: (!state.query.trim() && !isRunning) ? .4 : 1,
        }}>
          {isRunning ? '◌ Running Governed Cycle...' : '▶ Run Governed Research Cycle'}
        </button>
      </div>

      {/* Pipeline */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e2a3a' }}>
        <div style={{ fontSize: 9, color: '#334155', letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: 'Syne', fontWeight: 700, marginBottom: 6 }}>Agent Pipeline</div>
        {AGENT_IDS.map(id => {
          const ag = state.agents[id] || {};
          const color = STATUS_COLOR[ag.status] || '#334155';
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 6px', borderRadius: 5, marginBottom: 2,
              background: ag.status === 'running' ? 'rgba(59,130,246,.07)' : 'transparent' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, flex: 1, color }}>{id.replace('_', ' ')}</span>
              <span style={{ fontSize: 9, color, letterSpacing: 1, textTransform: 'uppercase' }}>
                {ag.status === 'done' ? '✓' : ag.status || '--'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 10,
        borderBottom: '1px solid #1e2a3a' }}>
        {[
          ['Deltas', state.continuityChain.length],
          ['Blocked', state.continuityChain.filter(d => d.verdict === 'block').length],
          ['Contested', state.continuityChain.filter(d => d.contested_by?.length).length],
          ['Checks', state.membraneLog.length],
        ].map(([label, val]) => (
          <div key={label} style={{ background: '#131929', border: '1px solid #1e2a3a',
            borderRadius: 5, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{val}</div>
            <div style={{ fontSize: 9, color: '#334155', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Final brief button */}
      {state.runComplete && state.finalBrief && (
        <div style={{ padding: 10 }}>
          <button style={{ width: '100%', padding: 8, background: 'rgba(168,85,247,.15)',
            border: '1px solid rgba(168,85,247,.3)', borderRadius: 4, color: '#a855f7',
            fontFamily: 'Syne', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
            ★ View Final Brief
          </button>
        </div>
      )}
    </div>
  );
}
