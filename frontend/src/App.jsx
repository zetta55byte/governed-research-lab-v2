import React, { useReducer, useState } from 'react';
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

const css = `
  @keyframes fadeIn { from{opacity:0;transform:translateX(4px)} to{opacity:1;transform:translateX(0)} }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.3} }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 2px; }
  select option { background: #0d111a; }
`;

export default function App() {
  const [state, dispatch] = useReducer(grlReducer, initialState);
  const [activeTab, setActiveTab] = useState('chain'); // chain | constitution
  const [showBrief, setShowBrief] = useState(false);

  // Live SSE connection
  useSSE(state.sessionId, dispatch);

  // Auto-show brief on complete
  React.useEffect(() => {
    if (state.runComplete && state.finalBrief) setShowBrief(true);
  }, [state.runComplete]);

  return (
    <>
      <style>{css}</style>
      <div style={{ display: 'grid', gridTemplateRows: '48px 1fr 72px', height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <Header
          stability={state.currentStability}
          runtime={state.runtime}
          status={state.status}
        />

        {/* Main: 3-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', overflow: 'hidden', minHeight: 0 }}>

          {/* Left: Control panel */}
          <div style={{ overflowY: 'auto', borderRight: '1px solid #1e2a3a' }}>
            <ControlPanel state={state} dispatch={dispatch} />
          </div>

          {/* Center: D3 graph */}
          <GraphPanel graph={state.graph} />

          {/* Right: tabbed panel */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1e2a3a',
            background: '#0d111a', overflow: 'hidden' }}>

            {/* Membrane log — always visible, fixed height */}
            <div style={{ height: 220, borderBottom: '1px solid #1e2a3a', flexShrink: 0 }}>
              <MembraneLog log={state.membraneLog} />
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1e2a3a', flexShrink: 0 }}>
              {[['chain', 'Chain'], ['constitution', 'Constitution']].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  flex: 1, padding: '6px 0', border: 'none', fontFamily: 'Syne', fontWeight: 700,
                  fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
                  background: activeTab === id ? 'rgba(59,130,246,.1)' : 'transparent',
                  color: activeTab === id ? '#3b82f6' : '#334155',
                  borderBottom: activeTab === id ? '2px solid #3b82f6' : '2px solid transparent',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {activeTab === 'chain'
                ? <ContinuityChain deltas={state.continuityChain} />
                : <ConstitutionBuilder />
              }
            </div>
          </div>
        </div>

        {/* Bottom: Stability panel */}
        <StabilityPanel history={state.stabilityHistory} current={state.currentStability} />

        {/* Final brief overlay */}
        {showBrief && state.finalBrief && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(7,9,15,.96)', zIndex: 50,
            display: 'flex', flexDirection: 'column', padding: 24, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>★ Final Research Brief</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {state.continuityChain.length} deltas · S(t) = {state.currentStability.toFixed(3)}
                </span>
                <button onClick={() => setShowBrief(false)} style={{
                  background: '#131929', border: '1px solid #1e2a3a', borderRadius: 4,
                  padding: '5px 10px', color: '#e2e8f0', fontFamily: 'Space Mono', fontSize: 11, cursor: 'pointer',
                }}>Close</button>
              </div>
            </div>
            <div style={{
              flex: 1, overflowY: 'auto', fontSize: 12, lineHeight: 1.8, color: '#e2e8f0',
              whiteSpace: 'pre-wrap', background: '#131929', borderRadius: 6, padding: 16,
            }}>
              {state.finalBrief}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
