import React, { useEffect, useRef, useState } from "react";

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

// Animated connector between two steps
function Connector({ fromColor, toColor, state }) {
  // state: "inactive" | "active" | "done"
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    function draw() {
      tRef.current += 0.04;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      if (state === "inactive") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, H/2 - 0.5, W, 1);
      } else if (state === "done") {
        // Solid glowing line
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, fromColor + "99");
        grad.addColorStop(1, toColor   + "99");
        ctx.fillStyle = grad;
        ctx.fillRect(0, H/2 - 1, W, 2);
        // soft glow
        const glow = ctx.createLinearGradient(0, 0, W, 0);
        glow.addColorStop(0, fromColor + "22");
        glow.addColorStop(1, toColor   + "22");
        ctx.fillStyle = glow;
        ctx.fillRect(0, H/2 - 3, W, 6);
      } else if (state === "active") {
        // Breathing gradient that moves left→right
        const speed   = 0.6;
        const pos     = ((t * speed) % 1.6) - 0.3; // -0.3 to 1.3
        const pulse   = 0.5 + 0.5 * Math.sin(t * 2.5);

        // base dim line
        const base = ctx.createLinearGradient(0, 0, W, 0);
        base.addColorStop(0, fromColor + "33");
        base.addColorStop(1, toColor   + "33");
        ctx.fillStyle = base;
        ctx.fillRect(0, H/2 - 0.5, W, 1);

        // traveling bright pulse
        const pGrad = ctx.createLinearGradient(0, 0, W, 0);
        const p0 = Math.max(0, pos - 0.35);
        const p1 = Math.max(0, Math.min(1, pos));
        const p2 = Math.min(1, pos + 0.35);
        if (p0 < p2) {
          pGrad.addColorStop(p0, "transparent");
          if (p1 > p0 && p1 < p2) {
            pGrad.addColorStop(p1, toColor + "ff");
          }
          pGrad.addColorStop(p2, "transparent");
          ctx.globalAlpha = 0.6 + 0.4 * pulse;
          ctx.fillStyle = pGrad;
          ctx.fillRect(0, H/2 - 1.5, W, 3);
          ctx.globalAlpha = 1;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [state, fromColor, toColor]);

  return (
    <canvas
      ref={canvasRef}
      width={44}
      height={12}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}

function StepIcon({ done, active, color, breathe }) {
  const [pulse, setPulse] = useState(1);
  const animRef = useRef(null);
  const tRef    = useRef(0);

  useEffect(() => {
    if (!active) { setPulse(1); return; }
    let t = 0;
    function tick() {
      t += 0.05;
      setPulse(0.7 + 0.3 * Math.sin(t * 2));
      animRef.current = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  const size = 26;

  if (done) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${color}`,
        background: color + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 6px ${color}44`,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }

  if (active) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        border: `2.5px solid ${color}`,
        background: `${color}${Math.round(pulse * 0.25 * 255).toString(16).padStart(2,"0")}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 ${10 + pulse * 14}px ${color}${Math.round(pulse * 180).toString(16).padStart(2,"0")},
                    0 0 ${20 + pulse * 20}px ${color}44`,
        transition: "box-shadow 0.05s",
      }}>
        <div style={{
          width: 9, height: 9, borderRadius: "50%",
          background: color,
          opacity: pulse,
          boxShadow: `0 0 ${6 + pulse * 8}px ${color}`,
        }}/>
      </div>
    );
  }

  // pending
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: "1.5px solid #1e2a3a",
      background: "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1e2a3a" }}/>
    </div>
  );
}

export default function Header({ sessionId, stability, status, phase }) {
  const latest    = Array.isArray(stability) && stability.length ? stability[stability.length - 1] : null;
  const formatted = typeof latest === "number" ? latest.toFixed(3) : "—";
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
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap" }}>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800, fontSize: 15,
          color: "#10b981", letterSpacing: 1,
        }}>◈ GRL</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10, color: "#3b82f6",
          border: "1px solid #1e3a5f", borderRadius: 3,
          padding: "1px 5px", background: "#0a1628",
        }}>v2</span>
        <span style={{ color: "#1e2a3a", fontSize: 10 }}>·</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#334155", letterSpacing: 1 }}>Constitutional OS</span>
        <span style={{ color: "#1e2a3a", fontSize: 10 }}>·</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#475569", letterSpacing: 1 }}>Multi-Agent</span>
        <span style={{ color: "#1e2a3a", fontSize: 10 }}>·</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#a855f7", letterSpacing: 1 }}>CLAUDE</span>
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

            // connector state
            let connState = "inactive";
            if (i > 0) {
              if (i - 1 < activeIdx) connState = "done";
              else if (i - 1 === activeIdx) connState = "active";
            }

            return (
              <React.Fragment key={step.key}>
                {i > 0 && (
                  <Connector
                    fromColor={PIPELINE_STEPS[i - 1].color}
                    toColor={step.color}
                    state={connState}
                  />
                )}
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3,
                }}>
                  <StepIcon done={done} active={active} color={step.color} />
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8, letterSpacing: 1,
                    color: active ? step.color
                         : done   ? step.color + "bb"
                         :          "#1e2a3a",
                    fontWeight: active ? 700 : 400,
                    transition: "color 0.4s",
                    textShadow: active ? `0 0 8px ${step.color}88` : "none",
                  }}>
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* RIGHT: stability */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#334155", letterSpacing: 1 }}>
          S(t): <span style={{ color: "#10b981" }}>{formatted}</span>
        </span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#1e2a3a" }}>
          {sessionId ? sessionId.slice(0, 8) : "—"}
        </span>
      </div>
    </div>
  );
}