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

function Connector({ fromColor, toColor, state }) {
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
      const y = H / 2;

      if (state === "inactive") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, y - 0.5, W, 1);

      } else if (state === "done") {
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, fromColor + "88");
        grad.addColorStop(1, toColor   + "88");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y - 1, W, 2);
        const glow = ctx.createLinearGradient(0, 0, W, 0);
        glow.addColorStop(0, fromColor + "22");
        glow.addColorStop(1, toColor   + "22");
        ctx.fillStyle = glow;
        ctx.fillRect(0, y - 4, W, 8);

      } else if (state === "active") {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
        // dim base
        const base = ctx.createLinearGradient(0, 0, W, 0);
        base.addColorStop(0, fromColor + "22");
        base.addColorStop(1, toColor   + "22");
        ctx.fillStyle = base;
        ctx.fillRect(0, y - 0.5, W, 1);
        // traveling dot
        const pos = ((t * 0.55) % 1.5) - 0.25;
        const p0 = Math.max(0, pos - 0.3);
        const p1 = Math.min(1, Math.max(0, pos));
        const p2 = Math.min(1, pos + 0.3);
        if (p0 < p2) {
          const pg = ctx.createLinearGradient(0, 0, W, 0);
          pg.addColorStop(p0, "transparent");
          if (p1 > p0 && p1 < p2) pg.addColorStop(p1, toColor + "ff");
          pg.addColorStop(p2, "transparent");
          ctx.globalAlpha = 0.55 + 0.45 * pulse;
          ctx.fillStyle = pg;
          ctx.fillRect(0, y - 2, W, 4);
          ctx.globalAlpha = 1;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [state, fromColor, toColor]);

  return <canvas ref={canvasRef} width={64} height={14} style={{ display: "block", flexShrink: 0 }} />;
}

function StepIcon({ done, active, color }) {
  const [pulse, setPulse] = useState(1);
  const animRef = useRef(null);

  useEffect(() => {
    if (!active) { setPulse(1); return; }
    let t = 0;
    function tick() {
      t += 0.05;
      setPulse(0.65 + 0.35 * Math.sin(t * 2.2));
      animRef.current = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  const size = 32;

  if (done) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${color}`,
        background: color + "1a",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 8px ${color}33`,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7l3.5 3.5 5.5-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }

  if (active) {
    const glow = Math.round(pulse * 200).toString(16).padStart(2, "0");
    const bg   = Math.round(pulse * 60).toString(16).padStart(2, "0");
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        border: `2.5px solid ${color}`,
        background: color + bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 ${12 + pulse * 16}px ${color}${glow}, 0 0 ${24 + pulse * 20}px ${color}44`,
      }}>
        <div style={{
          width: 11, height: 11, borderRadius: "50%",
          background: color, opacity: pulse,
          boxShadow: `0 0 ${8 + pulse * 8}px ${color}`,
        }}/>
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: "1.5px solid #1a2535",
      background: "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a2535" }}/>
    </div>
  );
}

export default function Header({ sessionId, stability, status, phase }) {
  const latest    = Array.isArray(stability) && stability.length ? stability[stability.length - 1] : null;
  const formatted = typeof latest === "number" ? latest.toFixed(3) : "—";
  const activeIdx = PHASE_INDEX[phase] ?? -1;

  return (
    <div style={{ display: "flex", flexDirection: "column", background: "#06080f", borderBottom: "1px solid #0f172a" }}>

      {/* ROW 1: branding + session */}
      <div style={{
        height: 28,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px",
        borderBottom: "1px solid #0a1020",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: "#10b981", letterSpacing: 1 }}>◈ GRL</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#3b82f6",
            border: "1px solid #1e3a5f", borderRadius: 3, padding: "0px 4px", background: "#0a1628",
          }}>v2</span>
          <span style={{ color: "#1e2a3a" }}>·</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#334155", letterSpacing: 1 }}>Constitutional OS</span>
          <span style={{ color: "#1e2a3a" }}>·</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#475569", letterSpacing: 1 }}>Multi-Agent</span>
          <span style={{ color: "#1e2a3a" }}>·</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#a855f7", letterSpacing: 1 }}>CLAUDE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#334155" }}>
            S(t): <span style={{ color: "#10b981" }}>{formatted}</span>
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#1e2a3a" }}>
            {sessionId ? sessionId.slice(0, 8) : "—"}
          </span>
        </div>
      </div>

      {/* ROW 2: pipeline */}
      <div style={{
        height: 60,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 4,
        background: "#04060d",
      }}>
        {/* label */}
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 8, letterSpacing: 4,
          color: "#1e2a3a", textTransform: "uppercase",
          marginBottom: 2,
        }}>
          Research Pipeline
        </div>

        {/* steps */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {PIPELINE_STEPS.map((step, i) => {
            const done   = i < activeIdx;
            const active = i === activeIdx;
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <StepIcon done={done} active={active} color={step.color} />
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8, letterSpacing: 1,
                    color: active ? step.color : done ? step.color + "bb" : "#1e2a3a",
                    fontWeight: active ? 700 : 400,
                    textShadow: active ? `0 0 10px ${step.color}99` : "none",
                    transition: "color 0.4s, text-shadow 0.4s",
                  }}>
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}