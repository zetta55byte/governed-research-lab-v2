import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

const RING_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, angleOffset: 0             },
  { label: "Researcher #1",color: "#10b981", size: 9,  angleOffset: Math.PI * 0.4 },
  { label: "Researcher #2",color: "#10b981", size: 9,  angleOffset: Math.PI * 0.8 },
  { label: "Researcher #3",color: "#10b981", size: 9,  angleOffset: Math.PI * 1.2 },
  { label: "Critic",       color: "#f97316", size: 10, angleOffset: Math.PI * 1.6 },
  { label: "Planner",      color: "#3b82f6", size: 10, angleOffset: Math.PI * 2.0 },
];

const CENTER_NODE = { label: "Synthesizer", color: "#a855f7", size: 14 };
const ORBIT_SPEED = 0.0006;

// Floating ambient words scattered across the canvas
const AMBIENT_WORDS = [
  "M1", "M2", "M3", "M4",
  "δ", "S(t)", "α", "β", "γ",
  "continuity", "membrane", "governed",
  "attractor", "entropy", "stability",
  "planner", "critic", "synthesizer",
  "constitutional", "delta", "chain",
  "ridge", "substrate", "feedback",
  "allow", "defer", "block",
  "∇", "∑", "⊕", "◈",
];

export default function GraphPanel({ graph, isRunning }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);
  const nodesRef     = useRef(null);
  const stateRef     = useRef("idle");
  const orbitAngle   = useRef(0);
  const nodeRadii    = useRef(null);
  const ambientRef   = useRef(null); // floating words
  const textPhaseRef = useRef(0);    // for pulsing text

  const hasGraph  = graph?.nodes?.length > 0;

  useGraph(svgRef, graph);

  useEffect(() => {
    if (isRunning && stateRef.current === "idle") {
      stateRef.current = "burst-out";
    }
    if (!isRunning && !hasGraph) {
      stateRef.current = "idle";
      nodesRef.current = null;
      nodeRadii.current = null;
      ambientRef.current = null;
    }
    if (hasGraph) stateRef.current = "done";
  }, [isRunning, hasGraph]);

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth  || 1000;
    const H = container.clientHeight || 600;
    canvas.width  = W;
    canvas.height = H;

    const ctx   = canvas.getContext("2d");
    const cx    = W / 2;
    const cy    = H / 2;
    const baseR = Math.min(W, H) / 2;
    const idleR = 0.62 * baseR;
    const thinkR = idleR * 0.42;

    let t = 0;

    function draw() {
      // Init ring nodes
      if (!nodesRef.current) {
        nodesRef.current = RING_NODES.map(n => ({
          ...n,
          x: cx + Math.cos(n.angleOffset) * idleR,
          y: cy + Math.sin(n.angleOffset) * idleR * 0.6,
        }));
      }

      // Init radii
      if (!nodeRadii.current) {
        nodeRadii.current = RING_NODES.map(() => ({
          current: idleR, idle: idleR, think: thinkR,
        }));
      }

      // Init ambient floating words
      if (!ambientRef.current) {
        ambientRef.current = AMBIENT_WORDS.map((word, i) => ({
          word,
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: 0.08 + Math.random() * 0.12,
          size: 9 + Math.random() * 5,
          phase: Math.random() * Math.PI * 2,
          color: ["#3b82f6","#10b981","#a855f7","#f97316","#334155"][i % 5],
        }));
      }

      ctx.clearRect(0, 0, W, H);
      t++;
      textPhaseRef.current += 0.02;

      const state = stateRef.current;

      if (state === "done") {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // ── Ambient floating words ──────────────────────────────
      ambientRef.current.forEach(w => {
        w.x += w.vx;
        w.y += w.vy;
        // Wrap around edges
        if (w.x < -50) w.x = W + 50;
        if (w.x > W + 50) w.x = -50;
        if (w.y < -20) w.y = H + 20;
        if (w.y > H + 20) w.y = -20;

        // Pulse alpha gently
        const pulseAlpha = w.alpha * (0.6 + 0.4 * Math.sin(w.phase + t * 0.015));

        // Speed up when thinking
        if (state !== "idle") {
          w.vx *= 1.001;
          w.vy *= 1.001;
        }

        ctx.font = `${w.size}px 'Space Mono', monospace`;
        ctx.fillStyle = w.color;
        ctx.globalAlpha = pulseAlpha;
        ctx.fillText(w.word, w.x, w.y);
        ctx.globalAlpha = 1;
      });

      // ── BIG CENTER TEXT ──────────────────────────────────────
      if (state === "idle" || state === "burst-out" || state === "thinking") {
        const label    = state === "idle" ? "AWAITING RESEARCH" : "RESEARCHING...";
        const maxSize  = state === "idle" ? 52 : 42;
        const textAlpha = state === "idle"
          ? 0.12 + 0.05 * Math.sin(textPhaseRef.current)
          : 0.18 + 0.08 * Math.sin(textPhaseRef.current * 2);

        // Measure and scale to fit width
        ctx.font = `800 ${maxSize}px 'Syne', 'Inter', sans-serif`;
        const measured = ctx.measureText(label).width;
        const scale    = Math.min(1, (W - 80) / measured);
        const fontSize = Math.floor(maxSize * scale);

        ctx.font        = `800 ${fontSize}px 'Syne', 'Inter', sans-serif`;
        ctx.fillStyle   = state === "idle" ? "#334155" : "#3b82f6";
        ctx.globalAlpha = textAlpha;
        ctx.textAlign   = "center";
        ctx.fillText(label, cx, cy + fontSize * 0.35);

        // Subtle letter-tracking lines on each side
        if (state === "idle") {
          const lineY  = cy + fontSize * 0.7;
          const lineW  = Math.min(measured * scale * 0.4, 120);
          ctx.strokeStyle = "#1e2a3a";
          ctx.lineWidth   = 1;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.moveTo(cx - measured * scale * 0.5 - 16, lineY);
          ctx.lineTo(cx - measured * scale * 0.5 - 16 - lineW, lineY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + measured * scale * 0.5 + 16, lineY);
          ctx.lineTo(cx + measured * scale * 0.5 + 16 + lineW, lineY);
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }

      // ── Orbit angle ─────────────────────────────────────────
      orbitAngle.current += state === "thinking" ? ORBIT_SPEED * 1.8 : ORBIT_SPEED;

      // ── Radius states ────────────────────────────────────────
      if (state === "burst-out") {
        nodeRadii.current.forEach(n => {
          n.current += (idleR * 1.25 - n.current) * 0.08;
        });
        if (nodeRadii.current.every(n => n.current >= idleR * 1.18)) {
          stateRef.current = "thinking";
        }
      }

      if (stateRef.current === "thinking") {
        nodeRadii.current.forEach(n => {
          n.current += (thinkR - n.current) * 0.05;
        });
      }

      if (state === "idle") {
        nodeRadii.current.forEach(n => {
          n.current += (idleR - n.current) * 0.03;
        });
      }

      // ── Center Synthesizer node ─────────────────────────────
      const centerPulse = 0.7 + 0.3 * Math.sin(t * 0.04);
      const cgrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, CENTER_NODE.size * 4);
      cgrd.addColorStop(0, CENTER_NODE.color + "55");
      cgrd.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, CENTER_NODE.size * 4, 0, Math.PI * 2);
      ctx.fillStyle   = cgrd;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, CENTER_NODE.size, 0, Math.PI * 2);
      ctx.strokeStyle = CENTER_NODE.color;
      ctx.lineWidth   = 2.5;
      ctx.globalAlpha = centerPulse;
      ctx.stroke();
      ctx.fillStyle   = CENTER_NODE.color + "33";
      ctx.fill();
      // Don't show "Synthesizer" label — it's behind the big text
      ctx.globalAlpha = 1;

      // ── Ring nodes ──────────────────────────────────────────
      RING_NODES.forEach((def, i) => {
        const angle = orbitAngle.current + def.angleOffset;
        const r     = nodeRadii.current[i].current;
        const tx    = cx + Math.cos(angle) * r;
        const ty    = cy + Math.sin(angle) * r * 0.6;

        nodesRef.current[i].x += (tx - nodesRef.current[i].x) * 0.12;
        nodesRef.current[i].y += (ty - nodesRef.current[i].y) * 0.12;

        const nx    = nodesRef.current[i].x;
        const ny    = nodesRef.current[i].y;
        const pulse = 0.65 + 0.35 * Math.sin(t * 0.035 + i * 1.05);
        const alpha = stateRef.current === "thinking"
          ? 0.75 + 0.25 * Math.sin(t * 0.02 + i * 0.8) : 1;

        // Line to center
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = def.color;
        ctx.lineWidth   = 0.5;
        ctx.globalAlpha = alpha * 0.1;
        ctx.stroke();

        // Glow
        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, def.size * 4);
        grd.addColorStop(0, def.color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(nx, ny, def.size * 4, 0, Math.PI * 2);
        ctx.fillStyle   = grd;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(nx, ny, def.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = def.color;
        ctx.lineWidth   = 1;
        ctx.globalAlpha = alpha * pulse * 0.3;
        ctx.stroke();

        // Main circle
        ctx.beginPath();
        ctx.arc(nx, ny, def.size, 0, Math.PI * 2);
        ctx.strokeStyle = def.color;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = alpha * pulse;
        ctx.stroke();
        ctx.fillStyle   = def.color + "22";
        ctx.fill();

        // Label
        ctx.globalAlpha = alpha * 0.9;
        ctx.font        = "11px 'Syne', monospace";
        ctx.fillStyle   = def.color;
        ctx.textAlign   = "center";
        ctx.fillText(def.label, nx, ny + def.size + 14);
        ctx.globalAlpha = 1;
      });

      if (hasGraph && stateRef.current === "thinking") stateRef.current = "converging";
      if (hasGraph && stateRef.current === "converging") {
        if (nodeRadii.current.every(n => n.current <= thinkR * 1.1)) stateRef.current = "done";
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", background: "#07090f", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          pointerEvents: "none",
          opacity: hasGraph ? 0 : 1,
          transition: "opacity 0.8s ease",
        }}
      />
      <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}
