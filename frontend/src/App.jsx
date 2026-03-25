import React, { useReducer, useState } from "react";
import { grlReducer } from "./state/reducer";
import { initialState } from "./state/initialState";
import { useSSE } from "./hooks/useSSE";

import Header from "./components/Header/Header";
import ControlPanel from "./components/ControlPanel/ControlPanel";
import GraphPanel from "./components/GraphPanel/GraphPanel";   // ← FIX #1
import MembraneLog from "./components/MembraneLog/MembraneLog";
import StabilityPanel from "./components/Stability/StabilityPanel";
import ConstitutionBuilder from "./components/ConstitutionBuilder/ConstitutionBuilder";
import PipelineAnimation from "./components/Pipeline/PipelineAnimation";
import AuditLog from "./components/AuditLog/AuditLog";
import ContinuityChain from "./components/GraphPanel/ContinuityChain";

// ------------------------------------------------------------
// GLOBAL CSS
// ------------------------------------------------------------
const css = `
@keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes scanDown {
  0%   { top: 0%;   opacity: 0.8; }
  90%  { top: 100%; opacity: 0.2; }
  100% { top: 100%; opacity: 0;   }
}
.membrane-scan {
  position: fixed;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #3b82f6 30%, #10b981 50%, #a855f7 70%, transparent 100%);
  animation: scanDown 7s infinite linear;
  pointer-events: none;
  z-index: 200;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; padding: 0; background:#020617; color:#e5e7eb; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 2px; }
`;

// ------------------------------------------------------------
// MAIN APP (GRL v2 shell)
// ------------------------------------------------------------
export default function App() {
  const [state, dispatch] = useReducer(grlReducer, initialState);
  const [rightTab, setRightTab] = useState("chain");

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

      <div
        style={{
          display: "grid",
          gridTemplateRows: "56px 1fr 64px",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <Header
          stability={state.stabilityHistory}
          sessionId={state.sessionId}
          status={state.status}
          phase={phase}
        />

        {/* MAIN BODY */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr 320px",
            minHeight: 0,
            width: "100%",
            overflow: "hidden",
            borderTop: "1px solid #0f172a",
            borderBottom: "1px solid #0f172a",
          }}
        >
          {/* LEFT COLUMN */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #0f172a",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 10, borderBottom: "1px solid #0f172a" }}>
              <ControlPanel state={state} dispatch={dispatch} />
            </div>

            <div style={{ padding: 10, borderBottom: "1px solid #0f172a" }}>
              <StabilityPanel stability={state.stabilityHistory || []} /> {/* ← FIX #3 */}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
              <MembraneLog logs={state.membraneLog || []} />
            </div>
          </div>

          {/* CENTER: GRAPH PANEL */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: 12,
              minWidth: 0,
            }}
          >
            <GraphPanel
              data={state.graph}
              phaseOverride={phase}   // ← FIX #2
            />
          </div>

          {/* RIGHT COLUMN */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid #0f172a",
              overflow: "hidden",
            }}
          >
            {/* TABS */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #0f172a",
                padding: "6px 8px",
                gap: 6,
                fontSize: 11,
                fontFamily: "Space Grotesk, system-ui",
              }}
            >
              {["chain", "audit", "constitution"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  style={{
                    border: "none",
                    background: rightTab === tab ? "#0f172a" : "transparent",
                    color: rightTab === tab ? "#e5e7eb" : "#6b7280",
                    padding: "4px 8px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  {tab === "chain"
                    ? "Continuity"
                    : tab === "audit"
                    ? "Audit"
                    : "Constitution"}
                </button>
              ))}
            </div>

            {/* RIGHT PANEL CONTENT */}
            <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
              {rightTab === "chain" && (
                <ContinuityChain chain={state.continuityChain || []} />
              )}

              {rightTab === "audit" && (
                <AuditLog
                  membraneLog={state.membraneLog || []}
                  continuityChain={state.continuityChain || []}
                />
              )}

              {rightTab === "constitution" && (
                <ConstitutionBuilder state={state} dispatch={dispatch} />
              )}
            </div>
          </div>
        </div>

        {/* FOOTER / PIPELINE */}
        <PipelineAnimation agents={state.agents} status={state.status} />
      </div>
    </>
