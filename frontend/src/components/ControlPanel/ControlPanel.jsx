import React from 'react';

const BACKEND = import.meta.env.VITE_GRL_BACKEND_URL ||
  'https://governed-research-lab-v2-production.up.railway.app';

const PROFILES = [
  { id: 'ai_safety',  label: 'AI Safety',  color: '#ef4444' },
  { id: 'evals',      label: 'Evals',      color: '#f59e0b' },
  { id: 'governance', label: 'Governance', color: '#3b82f6' },
  { id: 'planning',   label: 'Planning',   color: '#10b981' },
  { id: 'custom',     label: 'Custom',     color: '#a855f7' },
];

const RUNTIMES = [
  { id: 'claude',  label: 'Claude',  sub: 'Anthropic',  color: '#f97316', icon: '◈' },
  { id: 'openai',  label: 'OpenAI',  sub: 'GPT-4o',     color: '#10b981', icon: '⊕' },
  { id: 'autogen', label: 'AutoGen', sub: 'Microsoft',  color: '#3b82f6', icon: '⊘' },
];

const STATUS_COLOR = {
  idle: '#334155', running: '#3b82f6', done: '#10b981',
  blocked: '#ef4444', deferred: '#f59e0b',
};

const AGENT_IDS = [
  'planner', 'researcher_1', 'researcher_2', 'researcher_3',
  'critic', 'synthesizer',
];

export default function ControlPanel({ state, dispatch }) {
  const isRunning = state.status === 'running';
  const safeQuery = state.query?.trim();

  const startResearch = async () => {
    if (!safeQuery || isRunning) return;

    dispatch({ type: 'RESET' });

    try {
      const res = await fetch(`${BACKEND}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: state.query,
          profile: state.profile,
          runtime: state.runtime,
        }),
      });

      const data = await res.json();
      dispatch({ type: 'SET_SESSION', sessionId: data.session_id });

    } catch (err) {
      dispatch({ type: 'error', message: err.message });
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      overflowY: 'auto', background: '#0d111a',
      borderRight: '1px solid #1e2a3a'
    }}>

      {/* Runtime Selector */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2a3a' }}>
        <div style={{
          fontSize: 9, color: '#334155', letterSpacing: 2,
          textTransform: 'uppercase', fontFamily: 'Syne',
          fontWeight: 700, marginBottom: 8
        }}>
          Runtime
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {RUNTIMES.map(r => {
            const active = state.runtime === r.id;
            return (
              <button
                key={r.id}
                onClick={() => dispatch({ type: 'SET_RUNTIME', runtime: r.id })}
                disabled={isRunning}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 6,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  border: `1px solid ${active ? r.color : '#1e2a3a'}`,
                  background: active ? `${r.color}18` : 'transparent',
                  color: active ? r.color : '#334155',
                  transition: 'all .15s', textAlign: 'center',
                  boxShadow: active ? `0 0 8px ${r.color}33` : 'none',
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 2 }}>{r.icon}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 10 }}>{r.label}</div>
                <div style={{ fontSize: 8, opacity: .6, marginTop: 1 }}>{r.sub}</div>
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: 6, fontSize: 9, color: '#334155',
          fontStyle: 'italic', textAlign: 'center'
        }}>
          The model changes. The governance doesn't.
        </div>
      </div>

      {/* Query */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2a3a' }}>
        <div style={{
          fontSize: 9, color: '#334155', letterSpacing: 2,
          textTransform: 'uppercase', fontFamily: 'Syne',
          fontWeight: 700, marginBottom: 6
        }}>
          Query
        </div>

        <textarea
          value={state.query}
          onChange={e => dispatch({ type: 'SET_QUERY', query: e.target.value })}
          disabled={isRunning}
          placeholder="What would you like to research?"
          style={{
            width: '100%', background: '#131929',
            border: '1px solid #1e2a3a', borderRadius: 6,
            padding: '8px 10px', color: '#e2e8f0',
            fontFamily: 'Space Mono', fontSize: 11,
            resize: 'vertical', minHeight: 60,
            outline: 'none', transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = '#3b82f6'}
          onBlur={e => e.target.style.borderColor = '#1e2a3a'}
        />
      </div>

      {/* Profile Selector */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2a3a' }}>
        <div style={{
          fontSize: 9, color: '#334155', letterSpacing: 2,
          textTransform: 'uppercase', fontFamily: 'Syne',
          fontWeight: 700, marginBottom: 6
        }}>
          Profile
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PROFILES.map(p => {
            const active = state.profile === p.id;
            return (
              <span
                key={p.id}
                onClick={() => !isRunning && dispatch({ type: 'SET_PROFILE', profile: p.id })}
                style={{
                  padding: '3px 8px', borderRadius: 10, fontSize: 10,
                  cursor: isRunning ? 'default' : 'pointer',
                  border: `1px solid ${active ? p.color : '#1e2a3a'}`,
                  background: active ? `${p.color}22` : 'transparent',
                  color: active ? p.color : '#334155',
                  transition: 'all .15s',
                }}
              >
                {p.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Run Button */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2a3a' }}>
        <button
          onClick={startResearch}
          disabled={isRunning || !safeQuery}
          style={{
            width: '100%', padding: '10px 0',
            background: isRunning
              ? '#1e3a5f'
              : (!safeQuery ? '#0d111a' : '#3b82f6'),
            color: '#fff',
            border: `1px solid ${isRunning ? '#1e3a5f' : '#3b82f6'}`,
            borderRadius: 6,
            fontFamily: 'Syne', fontWeight: 700,
            fontSize: 11, letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: (isRunning || !safeQuery) ? 'not-allowed' : 'pointer',
            opacity: !safeQuery && !isRunning ? .3 : 1,
            transition: 'all .15s',
          }}
        >
          {isRunning ? (
            <span style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6
            }}>
              <span style={{
                animation: 'spin 1s linear infinite',
                display: 'inline-block'
              }}>◌</span>
              Running...
            </span>
          ) : '▶ Run Governed Cycle'}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Agent Pipeline */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2a3a' }}>
        <div style={{
          fontSize: 9, color: '#334155', letterSpacing: 2,
          textTransform: 'uppercase', fontFamily: 'Syne',
          fontWeight: 700, marginBottom: 6
        }}>
          Agents
        </div>

        {AGENT_IDS.map(id => {
          const ag = state.agents[id] || {};
          const color = STATUS_COLOR[ag.status] || '#334155';

          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 6px', borderRadius: 4, marginBottom: 2,
              background: ag.status === 'running'
                ? 'rgba(59,130,246,.07)'
                : 'transparent',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: color, flexShrink: 0,
                animation: ag.status === 'running' ? 'pulse 1s infinite' : 'none'
              }} />

              <span style={{
                fontSize: 10, flex: 1, color,
                fontFamily: 'Space Mono'
              }}>
                {id.replace(/_/g, ' ')}
              </span>

              <span style={{
                fontSize: 8, color, letterSpacing: 1,
                textTransform: 'uppercase'
              }}>
                {ag.status === 'done' ? '✓' : ag.status || '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 5, padding: '10px 12px',
        borderBottom: '1px solid #1e2a3a'
      }}>
        {[
          ['Deltas',    state.continuityChain.length, '#3b82f6'],
          ['Blocked',   state.continuityChain.filter(d => d.verdict === 'block').length, '#ef4444'],
          ['Contested', state.continuityChain.filter(d => d.contested_by?.length).length, '#a855f7'],
          ['Checks',    state.membraneLog.length, '#10b981'],
        ].map(([label, val, color]) => (
          <div key={label} style={{
            background: '#131929', border: '1px solid #1e2a3a',
            borderRadius: 5, padding: '7px 8px', textAlign: 'center'
          }}>
            <div style={{
              fontFamily: 'Syne', fontSize: 16,
              fontWeight: 800, color
            }}>
              {val}
            </div>
            <div style={{
              fontSize: 8, color: '#334155',
              letterSpacing: 1.5, textTransform: 'uppercase',
              marginTop: 2
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Final Brief */}
      {state.runComplete && state.finalBrief && (
        <div style={{ padding: '10px 12px' }}>
          <div style={{
            padding: '6px 10px', background: 'rgba(16,185,129,.1)',
            border: '1px solid rgba(16,185,129,.3)',
            borderRadius: 4, fontSize: 10,
            color: '#10b981', textAlign: 'center'
          }}>
            ✓ Research complete
          </div>
        </div>
      )}
    </div>
  );
}