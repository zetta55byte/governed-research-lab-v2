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
  @keyframes fadeIn  { from{opacity:0;transform:translateX(4px)} to{opacity:1;transform:translateX(0)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .delta-skeleton {
    border-radius: 6px; border: 1px solid #1e2a3a;
    border-left: 3px solid #3b82f6; padding: 8px 10px; margin-bottom: 6px;
    background: linear-gradient(90deg, #0d111a 0%, #131929 40%, #1e2d45 50%, #131929 60%, #0d111a 100%);
    background-size: 400px 100%; animation: shimmer 1.4s infinite linear;
  }
  .delta-skeleton-line { height: 7px; border-radius: 4px; background: rgba(59,130,246,0.15); margin-bottom: 6px; }
  @keyframes scanDown {
    0%   { top: 0%; opacity: 0.8; }
    90%  { top: 100%; opacity: 0.2; }
    100% { top: 100%; opacity: 0; }
  }
  .membrane-scan {
    position: absolute; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, #3b82f6, #10b981, transparent);
    animation: scanDown 1.5s infinite linear; pointer-events: none; z-index: 10;
  }
  @keyframes thinkPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
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

export default function App() {
  const [state, dispatch] = useReducer(grlReducer, initialState);
  const [rightTab, setRightTab] = useState('chain');
  const [showBrief, setShowBrief] = useState(false);

  useSSE(state.sessionId, dispatch);

  useEffect(() => {
    if (state.runComplete && state.finalBrief) setShowBrief(true);
  }, [state.runComplete]);

  const runningAgent = Object.entries(state.agents).find(([, a]) => a?.status === 'running')?.[0];
  const isThinking = state.status === 'running' && !!runningAgent;

  return (
    <>
      <style>{css}</style>
      <div style={{ display: 'grid', gridTemplateRows: '48px 1fr 72px', height: '100vh', overflow: 'hidden' }}>

        <Header stability={state.currentStability} runtime={state.runtime} status={state.status} />

        <div style={{ display: 'grid', gridTemplateColumns: '272px 1fr 280px', overflow: 'hidden', minHeight: 0 }}>

          <div style={{ overflowY: 'auto', borderRight: '1px solid #1e2a3a' }}>
            <ControlPanel state={state} dispatch={dispatch} />
          </div>

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

          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1e2a3a', background: '#0d111a', overflow: 'hidden' }}>
            <div style={{ height: 200, borderBottom: '1px solid #1e2a3a', flexShrink: 0, position: 'relative' }}>
              {isThinking && <div className="membrane-scan" />}
              <MembraneLog log={state.membraneLog} />
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #1e2a3a', flexShrink: 0 }}>
              {RIGHT_TABS.map(({ id, label }) => (
                <button key={id} onClick={() => setRightTab(id)} style={{
                  flex: 1, padding: '6px 0', border: 'none', fontFamily: 'Syne', fontWeight: 700,
                  fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
                  background: rightTab === id ? 'rgba(59,130,246,.1)' : 'transparent',
                  color: rightTab === id ? '#3b82f6' : '#334155',
                  borderBottom: rightTab === id ? '2px solid #3b82f6' : '2px solid transparent',
                }}>
                  {label}
                </button>
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
              {rightTab === 'audit' && <AuditLog membraneLog={state.membraneLog} continuityChain={state.continuityChain} />}
              {rightTab === 'constitution' && <ConstitutionBuilder />}
            </div>
          </div>
        </div>

        <div style={{ animation: isThinking ? 'thinkPulse 2.5s infinite ease-in-out' : 'none' }}>
          <StabilityPanel history={state.stabilityHistory} current={state.currentStability} />
        </div>

        {showBrief && state.finalBrief && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,9,15,.96)', zIndex: 50, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>★ Final Research Brief</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'Space Mono' }}>
                  {state.continuityChain.length} deltas · {state.membraneLog.length} checks · S(t) = {state.currentStability.toFixed(3)}
                </span>
                <button onClick={() => setShowBrief(false)} onMouseEnter={e => { e.currentTarget.style.background = '#1e2d45'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#93c5fd'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }} style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 6, padding: '7px 16px', color: '#94a3b8', fontFamily: 'Space Mono', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, letterSpacing: 1, transition: 'all 0.15s ease' }}><span style={{ fontSize: 13, lineHeight: 1 }}>?</span> Dashboard</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: 13, lineHeight: 1.9, color: '#e2e8f0', whiteSpace: 'pre-wrap', background: '#131929', borderRadius: 6, padding: 20 }}>
              {state.finalBrief}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
// thinking-animations-v2





