import React from "react";

const PIPELINE_STEPS = [
  { key: "plan",       label: "PLAN",       color: "#3b82f6" },
  { key: "research",   label: "RESEARCH",   color: "#10b981" },
  { key: "critique",   label: "CRITIQUE",   color: "#f97316" },
  { key: "synthesize", label: "SYNTHESIZE", color: "#a855f7" },
  { key: "human",      label: "HUMAN",      color: "#64748b" },
];

const PHASE_INDEX = {
  idle:       -1,
  plan:        0,
  planning:    0,
  research:    1,
  researching: 1,
  critique:    2,
  critiquing:  2,
  synthesize:  3,
  synthesizing:3,
  human:       4,
  complete:    4,
};

function CheckIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M5 9.5l2.5 2.5 5.5-5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActiveIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" stroke={color} strokeWidth="2" fill={color + "22"} />
      <circle cx="9" cy="9" r="4" fill={color} />
    </svg>
  );
}

function PendingIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" stroke={color} strokeWidth="1.2" fill="none" opacity="0.4" />
      <circle cx="9" cy="9" r="3" fill={color} opacity="0.25" />
    </svg>
  );
}

export default function Header({ sessionId, stability, status, phase }) {
  const latest = Array.isArray(stability) && stability.length
    ? stability[stability.length - 1]
    : null;
  const formatted = typeof latest === "number" ? latest.toFixed(2) : "—";

  const activeIdx = PHASE_INDEX[phase] ?? -1;

  return (
    <div style={{
      height: 56,
      background: "#080d14",
      borderBottom: "1px solid #0f172a",
      display: "grid",
      gridTemplateColumns: "200px 1fr auto",
      alignItems: "center",
      padding: "0 16px",
      gap: 12,
    }}>
      {/* LEFT: branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: 2,
          color: "#10b981",
          textTransform: "uppercase",
        }}>◈ GRL</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: "#334155",
          letterSpacing: 1,
        }}>v2</span>
        <span style={{ color: "#1e2a3a", fontSize: 10 }}>·</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          color: "#3b82f6",
          letterSpacing: 1,
        }}>Constitutional OS</span>
        <span style={{ color: "#1e2a3a", fontSize: 10 }}>·</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          color: "#64748b",
          letterSpacing: 1,
        }}>Multi-Agent</span>
        <span style={{ color: "#1e2a3a", fontSize: 10 }}>·</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          color: "#a855f7",
          letterSpacing: 1,
        }}>CLAUDE</span>
      </div>

      {/* CENTER: pipeline steps */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
      }}>
        {PIPELINE_STEPS.map((step, i) => {
          const done   = i < activeIdx;
          const active = i === activeIdx;
          const color  = active ? step.color : done ? step.color : "#334155";

          return (
            <React.Fragment key={step.key}>
              {/* connector line */}
              {i > 0 && (
                <div style={{
                  width: 40,
                  height: 1,
                  background: i <= activeIdx ? PIPELINE_STEPS[i-1].color + "66" : "#1e2a3a",
                  transition: "background 0.4s",
                  flexShrink: 0,
                }} />
              )}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 60,
              }}>
                {done   && <CheckIcon  color={color} />}
                {active && <ActiveIcon color={color} />}
                {!done && !active && <PendingIcon color={color} />}
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  fontWeight: active ? 700 : 400,
                  color: active ? color : done ? color + "aa" : "#334155",
                  letterSpacing: 1,
                  transition: "color 0.3s",
                }}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* RIGHT: stability + session */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: "#64748b",
        }}>
          S(t): <span style={{ color: "#10b981" }}>{formatted}</span>
        </span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: "#334155",
        }}>
          {sessionId ? sessionId.slice(0, 8) : "—"}
        </span>
      </div>
    </div>
  );
}