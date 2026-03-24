import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

// V11 movement — each node fully independent orbit, inward drift on thinking
const RING_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, orbitR: 0.72, speed: 0.00022, phase: Math.PI * 0.1  },
  { label: "Researcher #1",color: "#10b981", size: 9,  orbitR: 0.68, speed: 0.00031, phase: Math.PI * 0.55 },
  { label: "Researcher #2",color: "#10b981", size: 9,  orbitR: 0.75, speed: 0.00026, phase: Math.PI * 1.85 },
  { label: "Researcher #3",color: "#10b981", size: 9,  orbitR: 0.65, speed: 0.00019, phase: Math.PI * 1.35 },
  { label: "Critic",       color: "#f97316", size: 10, orbitR: 0.70, speed: 0.00028, phase: Math.PI * 0.85 },
  { label: "Planner",      color: "#3b82f6", size: 10, orbitR: 0.30, speed: 0.00048, phase: Math.PI * 1.55 },
];

const CENTER_NODE = { color: "#a855f7", size: 14 };

const AMBIENT_WORDS = [
  "M1","M2","M3","M4","δ","S(t)","α","β","γ","λ",
  "continuity","membrane","governed","attractor","∇","∑","∫","∂",
  "entropy","stability","substrate","feedback","allow","defer","◈","⊕",
  "constitutional","delta","chain","ridge","critic","synthesizer","Δ","∞",
];

export default function GraphPanel({ graph, isRunning }) {
  const containerRef    = useRef(null);
  const svgRef          = useRef(null);
  const canvasRef       = useRef(null);
  const animRef         = useRef(null);
  const nodesRef        = useRef(null);
  const ambientRef      = useRef(null);
  const stateRef        = useRef("idle"); // idle | thinking | complete | done
  const awaitAlpha      = useRef(1);
  const researchAlpha   = useRef(0);
  const synthAlpha      = useRef(0);
  const textPhase       = useRef(0);

  const hasGraph = !!(graph?.nodes?.length);
  useGraph(svgRef, graph);

  useEffect(() => {
    if (isRunning && stateRef.current === "idle") {
      stateRef.current = "thinking";
    }
    if (!isRunning && !hasGraph) {
      stateRef.current  = "idle";
      nodesRef.current  = null;
      ambientRef.current = null;
      awaitAlpha.current = 1;
      researchAlpha.current = 0;
      synthAlpha.current = 0;
    }
    if (hasGraph && stateRef.current === "thinking") {
      stateRef.current = "complete";
    }
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

    let t = 0;

    function draw() {
      if (!nodesRef.current) {
        nodesRef.current = RING_NODES.map(n => {
          const r = n.orbitR * baseR;
          return {
            ...n,
            phase:    n.phase,
            idleR:    r,
            thinkR:   r * 0.40,
            currentR: r,
            x: cx + Math.cos(n.phase) * r,
            y: cy + Math.sin(n.phase) * r * 0.6,
          };
        });
      }

      if (!ambientRef.current) {
        ambientRef.current = AMBIENT_WORDS.map((word, i) => ({
          word,
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          baseAlpha: 0.18 + Math.random() * 0.14, // brighter than v11
          size: 10 + Math.random() * 6,
          phase: Math.random() * Math.PI * 2,
          color: ["#3b82f6","#10b981","#a855f7","#f97316","#64748b"][i % 5],
        }));
      }

      ctx.clearRect(0, 0, W, H);
      t++;
      textPhase.current += 0.02;

      const state = stateRef.current;

      // Text alpha cross-fades
      if (state === "thinking") {
        awaitAlpha.current    = Math.max(0, awaitAlpha.current    - 0.025);
        researchAlpha.current = Math.min(1, researchAlpha.current + 0.025);
        synthAlpha.current    = Math.max(0, synthAlpha.current    - 0.02);
      } else if (state === "complete") {
        researchAlpha.current = Math.max(0, researchAlpha.current - 0.02);
        synthAlpha.current    = Math.min(1, synthAlpha.current    + 0.025);
        awaitAlpha.current    = Math.max(0, awaitAlpha.current    - 0.02);
      } else {
        awaitAlpha.current    = Math.min(1, awaitAlpha.current    + 0.015);
        researchAlpha.current = Math.max(0, researchAlpha.current - 0.015);
        synthAlpha.current    = Math.max(0, synthAlpha.current    - 0.015);
      }

      // ── Ambient words ──
      ambientRef.current.forEach(w => {
        w.x += w.vx * (state === "thinking" ? 1.5 : 1);
        w.y += w.vy * (state === "thinking" ? 1.5 : 1);
        if (w.x < -60) w.x = W + 60;
        if (w.x > W+60) w.x = -60;
        if (w.y < -20)  w.y = H + 20;
        if (w.y > H+20) w.y = -20;
        const a = w.baseAlpha * (0.6 + 0.4 * Math.sin(w.phase + t * 0.012));
        ctx.font = `${w.size}px 'Space Mono', monospace`;
        ctx.fillStyle = w.color;
        ctx.globalAlpha = a;
        ctx.fillText(w.word, w.x, w.y);
        ctx.globalAlpha = 1;
      });

      // ── AWAITING RESEARCH ──
      if (awaitAlpha.current > 0.01) {
        const label = "AWAITING RESEARCH";
        ctx.font = `800 54px 'Syne', sans-serif`;
        const sc = Math.min(1, (W-80) / ctx.measureText(label).width);
        const fs = Math.floor(54 * sc);
        ctx.font = `800 ${fs}px 'Syne', sans-serif`;
        ctx.fillStyle = "#1e2a3a";
        ctx.globalAlpha = awaitAlpha.current * (0.55 + 0.08 * Math.sin(textPhase.current));
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + fs * 0.35);
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── RESEARCHING... ──
      if (researchAlpha.current > 0.01) {
        const label = "RESEARCHING...";
        ctx.font = `800 56px 'Syne', sans-serif`;
        const sc = Math.min(1, (W-40) / ctx.measureText(label).width);
        const fs = Math.floor(56 * sc);
        ctx.font = `800 ${fs}px 'Syne', sans-serif`;
        ctx.shadowColor = "#3b82f6"; ctx.shadowBlur = 28;
        ctx.fillStyle = "#3b82f6";
        ctx.globalAlpha = researchAlpha.current * (0.22 + 0.07 * Math.sin(textPhase.current * 2));
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + fs * 0.35);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── SYNTHESIS COMPLETE ──
      if (synthAlpha.current > 0.01) {
        const label = "SYNTHESIS COMPLETE";
        ctx.font = `800 52px 'Syne', sans-serif`;
        const sc = Math.min(1, (W-40) / ctx.measureText(label).width);
        const fs = Math.floor(52 * sc);
        ctx.font = `800 ${fs}px 'Syne', sans-serif`;
        ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 32;
        ctx.fillStyle = "#a855f7";
        ctx.globalAlpha = synthAlpha.current * (0.28 + 0.08 * Math.sin(textPhase.current * 1.5));
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + fs * 0.35);
        ctx.font = `400 13px 'Space Mono', monospace`;
        ctx.fillStyle = "#a855f7"; ctx.globalAlpha = synthAlpha.current * 0.5;
        ctx.fillText("governed · audited · stable", cx, cy + fs * 0.35 + 28);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── Center Synthesizer — centered in canvas ──
      const cp = 0.7 + 0.3 * Math.sin(t * 0.04);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, CENTER_NODE.size * 4);
      cg.addColorStop(0, CENTER_NODE.color + "55");
      cg.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, CENTER_NODE.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.globalAlpha = 0.6; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, CENTER_NODE.size, 0, Math.PI * 2);
      ctx.strokeStyle = CENTER_NODE.color; ctx.lineWidth = 2.5;
      ctx.globalAlpha = cp; ctx.stroke();
      ctx.fillStyle = CENTER_NODE.color + "33"; ctx.fill();
      // Synthesizer label
      ctx.globalAlpha = 0.6;
      ctx.font = "11px 'Syne', monospace";
      ctx.fillStyle = CENTER_NODE.color;
      ctx.textAlign = "center";
      ctx.fillText("Synthesizer", cx, cy + CENTER_NODE.size + 14);
      ctx.globalAlpha = 1;

      // ── Ring nodes — V11 movement ──
      nodesRef.current.forEach((node, i) => {
        // Each node advances its own phase at its own speed
        node.phase += node.speed * (state === "thinking" ? 1.8 : 1);

        // Ease toward thinkR (inward) or idleR
        const targetR  = state === "thinking" ? node.thinkR : node.idleR;
        const easeSpd  = state === "thinking" ? 0.014 : 0.006;
        node.currentR += (targetR - node.currentR) * easeSpd;

        const tx = cx + Math.cos(node.phase) * node.currentR;
        const ty = cy + Math.sin(node.phase) * node.currentR * 0.6;
        node.x += (tx - node.x) * 0.10;
        node.y += (ty - node.y) * 0.10;

        const pulse = 0.65 + 0.35 * Math.sin(t * 0.035 + i * 1.3);
        const alpha = state === "thinking"
          ? 0.75 + 0.25 * Math.sin(t * 0.02 + i * 0.9) : 1;

        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = node.color; ctx.lineWidth = 0.5;
        ctx.globalAlpha = alpha * 0.1; ctx.stroke();

        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 4);
        grd.addColorStop(0, node.color + "44"); grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.globalAlpha = alpha * 0.7; ctx.fill();

        ctx.beginPath(); ctx.arc(node.x, node.y, node.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = node.color; ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * pulse * 0.3; ctx.stroke();

        ctx.beginPath(); ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color; ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * pulse; ctx.stroke();
        ctx.fillStyle = node.color + "22"; ctx.fill();

        ctx.globalAlpha = alpha * 0.9;
        ctx.font = "11px 'Syne', monospace";
        ctx.fillStyle = node.color;
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + node.size + 14);
        ctx.globalAlpha = 1;
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div ref={containerRef} style={{ position:"relative", width:"100%", height:"100%", background:"#07090f", overflow:"hidden" }}>
      <canvas ref={canvasRef} style={{
        position:"absolute", inset:0, width:"100%", height:"100%",
        pointerEvents:"none",
        opacity: hasGraph ? 0 : 1,
        transition:"opacity 0.8s ease",
      }}/>
      <svg ref={svgRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}/>
    </div>
  );
}
