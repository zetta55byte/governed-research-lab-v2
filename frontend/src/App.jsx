import React, { useReducer, useState, useEffect } from 'react';
import { grlReducer } from './state/reducer';
import { initialState } from './state/initialState';
import { useSSE } from './hooks/useSSE';
import Header from './components/Header/Header';
import ControlPanel from './components/ControlPanel/ControlPanel';
import GraphPanel from './components/Graph/GraphPanel';
import MembraneLog from './components/MembraneLog/MembraneLog';
import ContinuityChain from './components/ContinuityChain/ContinuityChain';
import StabilityPanel from './components/Stability/StabilityPanel';
import ConstitutionBuilder from './components/ConstitutionBuilder/ConstitutionBuilder';
import PipelineAnimation from './components/Pipeline/PipelineAnimation';
import AuditLog from './components/AuditLog/AuditLog';

const css = `
@keyframes fadeIn { from{opacity:0;transform:translateX(4px)} to{opacity:1;transform:translateX(0)} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.delta-skeleton {
  border-radius: 6px;
  border: 1px solid #1e2a3a;
  border-left: 3px solid #3b82f6;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: linear-gradient(90deg, #0d111a 0%, #131929 40%, #1e2d45 50%, #131929 60%, #0d111a 100%);
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite linear;
}
.delta-skeleton-line {
  height: 7px;
  border-radius: 4px;
  background: rgba(59,130,246,0.15);
  margin-bottom: 6px;
}
@keyframes scanDown {
  0%   { top: 0%;   opacity: 0.8; }
  90%  { top: 100%; opacity: 0.2; }
  100% { top: 100%; opacity: 0;   }
}
/* Full-width scan line — covers entire viewport width */
.membrane-scan {
  position: fixed;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #3b82f6 30%, #10b981 50%, #a855f7 70%, transparent 100%);
  animation: scanDown 1.8s infinite linear;
  pointer-events: none;
  z-index: 200;
}
@keyframes thinkPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes leftShimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
/* Left panel shimmer overlay when thinking */
.left-panel-thinking {
  background: linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.04) 40%, rgba(16,185,129,0.06) 50%, rgba(59,130,246,0.04) 60%, transparent 100%);
  background-size: 400px 100%;
  animation: leftShimmer 2s infinite linear;
  pointer-events: none;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; padding: 0; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 2px; }
select option { background: #0d111a; }
`;

const RIGHT_TABS = [
  { id: 'chain', label: 'Chain' },
  { id: 'audit', label: 'Audit' },
  { id: 'constitution', label: 'Const.' },
];

function DeltaSkeleton({ agentId }) {
  return (
    <div className="delta-skeleton">
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
        <div className="delta-skeleton-line" style={{ width: 40, height: 7 }} />
        <span style={{ fontSize: 9, color: '#3b82f6', fontFamily: 'Space Mono' }}>{agentId}</span>
        <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1s infinite' }} />
      </div>
      <div className="delta-skeleton-line" style={{ width: '85%' }} />
      <div className="delta-skeleton-line" style={{ width: '60%' }} />
      <div className="delta-skeleton-line" style={{ width: '35%' }} />
      <div style={{ fontSize: 9, color: '#3b82f6', marginTop: 4, fontFamily: 'Space Mono', animation: 'pulse 1.2s infinite' }}>
        ◌ generating delta...
      </div>
    </div>
  );
}

/* Left panel thinking skeleton — mirrors the chain skeleton on the right */
function LeftThinkingSkeleton({ agentId }) {
  return (
    <div style={{ padding: '6px 8px', flexShrink: 0 }}>
      <div style={{
        borderRadius: 6,
        border: '1px solid #1e2a3a',
        borderLeft: '3px solid #10b981',
        padding: '8px 10px',
        background: 'linear-gradient(90deg, #0d111a 0%, #131929 40%, #0d1f17 50%, #131929 60%, #0d111a 100%)',
        backgroundSize: '400px 100%',
        animation: 'shimmer 1.6s infinite linear',
      }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <div style={{ height: 7, width: 40, borderRadius: 4, background: 'rgba(16,185,129,0.15)', marginBottom: 0 }} />
          <span style={{ fontSize: 9, color: '#10b981', fontFamily: 'Space Mono' }}>{agentId}</span>
          <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1s infinite' }} />
        </div>
        <div style={{ height: 7, borderRadius: 4, background: 'rgba(16,185,129,0.12)', marginBottom: 6, width: '75%' }} />
        <div style={{ height: 7, borderRadius: 4, background: 'rgba(16,185,129,0.12)', marginBottom: 6, width: '50%' }} />
        <div style={{ fontSize: 9, color: '#10b981', marginTop: 4, fontFamily: 'Space Mono', animation: 'pulse 1.4s infinite' }}>
          ◌ agent active...
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(grlReducer, initialState);
  const [rightTab, setRightTab] = useState('chain');
  const [showBrief, setShowBrief] = useState(false);

  useSSE(state.sessionId, dispatch);

  useEffect(() => {
    if (state.runComplete && state.finalBrief) setShowBrief(true);
  }, [state.runComplete]);

  const runningAgent = Object.entries(state.agents).find(([, a]) => a?.status === 'running')?.[0];
  const isThinking   = state.status === 'running' && !!runningAgent;

  return (
    <>
      <style>{css}</style>

      {/* Full-width scan line across entire screen when thinking */}
      {isThinking && <div className="membrane-scan" />}

      <div style={{ display: 'grid', gridTemplateRows: '48px 1fr 72px', height: '100vh', overflow: 'hidden' }}>
        <Header
          stability={state.currentStability}
          runtime={state.runtime}
          status={state.status}
          onViewBrief={() => setShowBrief(true)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '272px 1fr 280px', overflow: 'hidden', minHeight: 0 }}>

          {/* LEFT PANEL — with thinking shimmer overlay */}
          <div style={{ overflowY: 'auto', borderRight: '1px solid #1e2a3a', position: 'relative' }}>
            {isThinking && <div className="left-panel-thinking" style={{ position: 'absolute', inset: 0, zIndex: 10 }} />}
            {isThinking && <LeftThinkingSkeleton agentId={runningAgent} />}
            <ControlPanel state={state} dispatch={dispatch} />
          </div>

          {/* CENTER */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <PipelineAnimation agents={state.agents} status={state.status} />
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <GraphPanel graph={state.graph} isRunning={state.status === 'running'} />
              {isThinking && (
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.04) 50%, transparent 100%)',
                  animation: 'thinkPulse 2s infinite ease-in-out',
                }} />
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1e2a3a', background: '#0d111a', overflow: 'hidden' }}>
            <div style={{ height: 200, borderBottom: '1px solid #1e2a3a', flexShrink: 0, position: 'relative' }}>
              <MembraneLog log={state.membraneLog} />
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #1e2a3a', flexShrink: 0 }}>
              {RIGHT_TABS.map(({ id, label }) => (
                <button key={id} onClick={() => setRightTab(id)} style={{
                  flex: 1, padding: '6px 0', border: 'none',
                  fontFamily: 'Syne', fontWeight: 700, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
                  background: rightTab === id ? 'rgba(59,130,246,.1)' : 'transparent',
                  color: rightTab === id ? '#3b82f6' : '#334155',
                  borderBottom: rightTab === id ? '2px solid #3b82f6' : '2px solid transparent',
                }}>{label}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {rightTab === 'chain' && (
                <>
                  {isThinking && (
                    <div style={{ padding: '6px 8px 0', flexShrink: 0 }}>
                      <DeltaSkeleton agentId={runningAgent} />
                    </div>
                  )}
                  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    <ContinuityChain deltas={state.continuityChain} />
                  </div>
                </>
              )}
              {rightTab === 'audit'        && <AuditLog membraneLog={state.membraneLog} continuityChain={state.continuityChain} />}
              {rightTab === 'constitution' && <ConstitutionBuilder />}
            </div>
          </div>
        </div>

        <div style={{ animation: isThinking ? 'thinkPulse 2.5s infinite ease-in-out' : 'none' }}>
          <StabilityPanel history={state.stabilityHistory} current={state.currentStability} />
        </div>

        {/* BRIEF OVERLAY */}
        {showBrief && state.finalBrief && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,9,15,.96)', zIndex: 50, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>★ Final Research Brief</span>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'Space Mono' }}>
                {state.continuityChain.length} deltas · {state.membraneLog.length} checks · S(t) = {state.currentStability.toFixed(3)}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: 13, lineHeight: 1.9, color: '#e2e8f0', whiteSpace: 'pre-wrap', background: '#131929', borderRadius: 6, padding: 20 }}>
              {state.finalBrief}
            </div>

            {/* BIG VISIBLE DASHBOARD BUTTON — fixed bottom right, impossible to miss */}
            <button
              onClick={() => setShowBrief(false)}
              onMouseEnter={e => { e.currentTarget.style.background = '#0d9e6e'; e.currentTarget.style.transform = 'scale(1.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'scale(1)'; }}
              style={{
                position: 'fixed',
                bottom: 36,
                right: 36,
                zIndex: 9999,
                background: '#10b981',
                color: '#000',
                fontFamily: 'Space Mono',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1.5,
                border: 'none',
                borderRadius: 10,
                padding: '14px 32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 0 32px rgba(16,185,129,0.5), 0 4px 16px rgba(0,0,0,0.4)',
                transition: 'background 0.15s ease, transform 0.15s ease',
              }}
            >
              ← Dashboard
            </button>
          </div>
        )}
      </div>
    </>
  );
}
// thinking-animations-v3
