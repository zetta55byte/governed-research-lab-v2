import React from "react";

const PIPELINE_STEPS = [
  { key: "plan",       label: "PLAN",       color: "#3b82f6" },
  { key: "research",   label: "RESEARCH",   color: "#10b981" },
  { key: "critique",   label: "CRITIQUE",   color: "#f97316" },
  { key: "synthesize", label: "SYNTHESIZE", color: "#a855f7" },
  { key: "human",      label: "HUMAN",      color: "#64748b" },
];

const PHASE_INDEX = {
  idle:        -1,
  plan:         0,
  planning:     0,
  research:     1,
  researching:  1,
  critique:     2,
  critiquing:   2,
  synthesize:   3,
  synthesizing: 3,
  human:        4,
  complete:     4,
};

function StepIcon({ done, active, color }) {
  if (done) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        border: `2px solid ${color}`,
        background: color + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2.5 6.5l3 3 5-5.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (active) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        border: `2.5px solid ${color}`,
        background: color + "33",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 12px ${color}88, 0 0 24px ${color}44`,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}/>
      </div>
    );
  }
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      border: "1.5px solid #1e2a3a",
      background: "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1e2a3a" }}/>
    </div>
  );
}

export default function Header({ sessionId, stability, status, phase }) {
  const latest = Array.isArray(stability) && stability.length
    ? stability[stability.length - 1] : null;
  const formatted = typeof latest === "number" ? latest.toFixed(2) : "—";
  const activeIdx = PHASE_INDEX[phase] ?? -1;

  return (
    <div style={{
      height: 56,
      background: "#06080f",
      borderBottom: "1px solid #0f172a",
      display: "grid",
      gridTemplateColumns: "220px 1fr 160px",
      alignItems: "center",
      padding: "0 14px",
    }}>

      {/* LEFT: branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800, fontSize: 15,
          color: "#10b981", letterSpacing: 1,
        }}>◈ GRL</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10, color: "#3b82f6", letterSpacing: 1,
          border: "1px solid #1e3a5f", borderRadius: 3,
          padding: "1px 5px", background: "#0a1628",
        }}>v2</span>
        <span style={{ color: "#1e2a3a" }}>·</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#334155", letterSpacing: 1 }}>
          Constitutional OS
        </span>
        <span style={{ color: "#1e2a3a" }}>·</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#475569", letterSpacing: 1 }}>
          Multi-Agent
        </span>
        <span style={{ color: "#1e2a3a" }}>·</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#a855f7", letterSpacing: 1 }}>
          CLAUDE
        </span>
      </div>

      {/* CENTER: pipeline */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 3,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 8, letterSpacing: 3,
          color: "#1e2a3a", textTransform: "uppercase",
        }}>
          Research Pipeline
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {PIPELINE_STEPS.map((step, i) => {
            const done   = i < activeIdx;
            const active = i === activeIdx;

            return (
              <React.Fragment key={step.key}>
                {i > 0 && (
                  <div style={{
                    width: 36, height: 1, flexShrink: 0,
                    background: i <= activeIdx
                      ? PIPELINE_STEPS[i - 1].color + "55"
                      : "#0f172a",
                    transition: "background 0.5s",
                  }}/>
                )}
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3,
                }}>
                  <StepIcon done={done} active={active} color={step.color} />
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8, letterSpacing: 1,
                    color: active ? step.color : done ? step.color + "99" : "#1e2a3a",
                    fontWeight: active ? 700 : 400,
                    transition: "color 0.3s",
                  }}>
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* RIGHT: stability + session */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "flex-end", gap: 2,
      }}>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10, color: "#334155", letterSpacing: 1,
        }}>
          S(t): <span style={{ color: "#10b981" }}>{formatted}</span>
        </span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9, color: "#1e2a3a",
        }}>
          {sessionId ? sessionId.slice(0, 8) : "—"}
        </span>
      </div>
    </div>
  );
}