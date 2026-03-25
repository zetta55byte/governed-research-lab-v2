import React, { useReducer, useState } from "react";
import { grlReducer } from "./state/reducer";
import { initialState } from "./state/initialState";
import { useSSE } from "./hooks/useSSE";
import Header from "./components/Header/Header";
import ControlPanel from "./components/ControlPanel/ControlPanel";
import GraphPanel from "./components/Graph/GraphPanel";
import MembraneLog from "./components/MembraneLog/MembraneLog";
import StabilityPanel from "./components/Stability/StabilityPanel";
import ConstitutionBuilder from "./components/ConstitutionBuilder/ConstitutionBuilder";
import PipelineAnimation from "./components/Pipeline/PipelineAnimation";
import AuditLog from "./components/AuditLog/AuditLog";
import ContinuityChain from "./components/GraphPanel/ContinuityChain";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;700&display=swap');

@keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes scanDown {
  0%   { top: 0%;   opacity: 0.8; }
  90%  { top: 100%; opacity: 0.2; }
  100% { top: 100%; opacity: 0;   }
}
.membrane-scan {
  position: fixed; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 0%, #3b82f6 30%, #10b981 50%, #a855f7 70%, transparent 100%);
  animation: scanDown 7s infinite linear;
  pointer-events: none; z-index: 200;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; padding: 0; background:#020617; color:#e5e7eb; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 2px; }
`;

const TAB_STYLE = (active) => ({
  border: "none",
  background: active ? "#0f172a" : "transparent",
  color: active ? "#e5e7eb" : "#334155",
  padding: "3px 10px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "'Space Mono', monospace",
  fontSize: 10,
  letterSpacing: 1,
  textTransform: "uppercase",
  transition: "color 0.2s",
});

export default function App() {
  const [state, dispatch] = useReducer(grlReducer, initialState);
  const [rightTab, setRightTab] = useState("membrane");

  useSSE(state.sessionId, dispatch);

  const runningAgent = Object.entries(state.agents || {}).find(
    ([, a]) => a?.status === "running"
  )?.[0];

  const isThinking = state.status === "running" && !!runningAgent;
  const phase = state.phase || "idle";

  return (
    <>
      <style>{css}</style>
      {isThinking && <div className="membrane-scan" />}

      <div style={{
        display: "grid",
        gridTemplateRows: "56px 1fr 56px",
        height: "100vh",
        overflow: "hidden",
        background: "#020617",
      }}>

        {/* ── TOP HEADER with pipeline ── */}
        <Header
          stability={state.stabilityHistory}
          sessionId={state.sessionId}
          status={state.status}
          phase={phase}
        />

        {/* ── MAIN BODY ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr 300px",
          minHeight: 0,
          overflow: "hidden",
        }}>

          {/* ── LEFT: Control + Agents + Stability ── */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #0f172a",
            overflow: "hidden",
            background: "#060a12",
          }}>
            <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid #0f172a", flexShrink: 0 }}>
              <ControlPanel state={state} dispatch={dispatch} />
            </div>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #0f172a", flexShrink: 0 }}>
              <StabilityPanel stability={state.stabilityHistory || []} />
            </div>
          </div>

          {/* ── CENTER: Graph ── */}
          <div style={{
            position: "relative",
            overflow: "hidden",
            background: "#07090f",
          }}>
            <GraphPanel
              graph={state.graph}
              isRunning={state.status === "running"}
              runComplete={state.runComplete}
            />
          </div>

          {/* ── RIGHT: Membrane Log + Chain/Audit ── */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid #0f172a",
            overflow: "hidden",
            background: "#060a12",
          }}>

            {/* Tab bar — MEMBRANE LOG | CHAIN | AUDIT */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: "6px 8px",
              borderBottom: "1px solid #0f172a",
              flexShrink: 0,
            }}>
              {[
                { key: "membrane", label: "Membrane" },
                { key: "chain",    label: "Chain" },
                { key: "audit",    label: "Audit" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setRightTab(key)} style={TAB_STYLE(rightTab === key)}>
                  {label}
                </button>
              ))}
            </div>

            {/* Membrane log lives at top, always visible when on membrane tab */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
              {rightTab === "membrane" && (
                <MembraneLog logs={state.membraneLog || []} />
              )}
              {rightTab === "chain" && (
                <>
                  {/* Mini membrane log strip at top */}
                  <div style={{
                    borderBottom: "1px solid #0f172a",
                    marginBottom: 8,
                    paddingBottom: 8,
                  }}>
                    <MembraneLog logs={(state.membraneLog || []).slice(-6)} compact />
                  </div>
                  <ContinuityChain
                    deltas={state.continuityChain || []}
                    finalBrief={state.finalBrief}
                  />
                </>
              )}
              {rightTab === "audit" && (
                <AuditLog
                  membraneLog={state.membraneLog || []}
                  continuityChain={state.continuityChain || []}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Pipeline animation bar ── */}
        <PipelineAnimation agents={state.agents} status={state.status} />
      </div>
    </>
  );
}