import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

// Each node has its own drift speed — floaty, independent
const RING_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, angle: 0,              farAngle: Math.PI * 0.05,  farR: 0.80, driftSpeed: 0.00018 },
  { label: "Researcher #1",color: "#10b981", size: 9,  angle: Math.PI*0.333,  farAngle: Math.PI * 0.42,  farR: 0.74, driftSpeed: 0.00024 },
  { label: "Researcher #2",color: "#10b981", size: 9,  angle: Math.PI*0.666,  farAngle: Math.PI * 1.78,  farR: 0.78, driftSpeed: 0.00020 },
  { label: "Researcher #3",color: "#10b981", size: 9,  angle: Math.PI*1.0,    farAngle: Math.PI * 1.28,  farR: 0.72, driftSpeed: 0.00015 },
  { label: "Critic",       color: "#f97316", size: 10, angle: Math.PI*1.333,  farAngle: Math.PI * 0.82,  farR: 0.76, driftSpeed: 0.00022 },
  { label: "Planner",      color: "#3b82f6", size: 10, angle: Math.PI*1.666,  farAngle: Math.PI * 1.58,  farR: 0.68, driftSpeed: 0.00019 },
];

const CENTER_NODE = { color: "#a855f7", size: 14 };
const IDLE_R      = 0.36;
const ORBIT_SPEED = 0.0005;

const AMBIENT_WORDS = [
  "M1","M2","M3","M4","δ","S(t)","α","β","γ","λ",
  "continuity","membrane","governed","attractor","∇","∑","∫","∂",
  "entropy","stability","substrate","feedback","allow","defer","◈","⊕",
  "constitutional","delta","chain","ridge","critic","synthesizer","Δ","∞",
];

export default function GraphPanel({ graph, isRunning, runComplete }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);
  const nodesRef     = useRef(null);
  const ambientRef   = useRef(null);
  const globalAngle  = useRef(0);
  const textPhase    = useRef(0);

  // Use a single state object ref to avoid stale closures
  const ST = useRef({
    phase: "idle",      // idle | dispersed | complete | done
    awaitA: 1,
    resA: 0,
    synthA: 0,
  });

  const hasGraph = graph?.nodes?.length > 0;
  useGraph(svgRef, graph);

  // Sync props every render — no stale closures
  useEffect(() => {
    const st = ST.current;
    if (isRunning && st.phase === "idle")         st.phase = "dispersed";
    if (hasGraph && st.phase === "dispersed")     st.phase = "complete";
    if (!isRunning && !hasGraph) {
      st.phase  = "idle";
      st.awaitA = 1;
      st.resA   = 0;
      st.synthA = 0;
      nodesRef.current  = null;
      ambientRef.current = null;
      globalAngle.current = 0;
    }
  });

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
    const idleR = IDLE_R * baseR;

    let t = 0;

    function draw() {
      // Init nodes
      if (!nodesRef.current) {
        nodesRef.current = RING_NODES.map(n => ({
          ...n,
          // Each node starts on the perfect circle
          currentX: cx + Math.cos(n.angle) * idleR,
          currentY: cy + Math.sin(n.angle) * idleR * 0.6,
          // Fixed far target — unique per node
          targetX: cx + Math.cos(n.farAngle) * n.farR * baseR,
          targetY: cy + Math.sin(n.farAngle) * n.farR * baseR * 0.6,
          // Each node orbits its far position slowly and independently
          orbitPhase: n.angle,
        }));
      }

      // Init ambient
      if (!ambientRef.current) {
        ambientRef.current = AMBIENT_WORDS.map((word, i) => ({
          word,
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          baseAlpha: 0.20 + Math.random() * 0.15,
          size: 10 + Math.random() * 6,
          phase: Math.random() * Math.PI * 2,
          color: ["#3b82f6","#10b981","#a855f7","#f97316","#64748b"][i % 5],
        }));
      }

      ctx.clearRect(0, 0, W, H);
      t++;
      textPhase.current += 0.018;

      const st    = ST.current;
      const phase = st.phase;

      // Fade text alphas
      if (phase === "idle") {
        st.awaitA = Math.min(1,   st.awaitA + 0.02);
        st.resA   = Math.max(0,   st.resA   - 0.02);
        st.synthA = Math.max(0,   st.synthA - 0.02);
      } else if (phase === "dispersed") {
        st.awaitA = Math.max(0,   st.awaitA - 0.025);
        st.resA   = Math.min(1,   st.resA   + 0.025);
        st.synthA = Math.max(0,   st.synthA - 0.02);
      } else if (phase === "complete") {
        st.resA   = Math.max(0,   st.resA   - 0.02);
        st.synthA = Math.min(1,   st.synthA + 0.025);
      }

      // ── Ambient words ──
      ambientRef.current.forEach(w => {
        w.x += w.vx * (phase !== "idle" ? 1.5 : 1);
        w.y += w.vy * (phase !== "idle" ? 1.5 : 1);
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
      if (st.awaitA > 0.01) {
        const label = "AWAITING RESEARCH";
        ctx.font = `800 54px 'Syne', sans-serif`;
        const sc = Math.min(1, (W-80) / ctx.measureText(label).width);
        const fs = Math.floor(54 * sc);
        ctx.font = `800 ${fs}px 'Syne', sans-serif`;
        ctx.fillStyle = "#334155";
        ctx.globalAlpha = st.awaitA * (0.35 + 0.05 * Math.sin(textPhase.current));
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + fs * 0.35);
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── RESEARCHING... ──
      if (st.resA > 0.01) {
        const label = "RESEARCHING...";
        ctx.font = `800 56px 'Syne', sans-serif`;
        const sc = Math.min(1, (W-40) / ctx.measureText(label).width);
        const fs = Math.floor(56 * sc);
        ctx.font = `800 ${fs}px 'Syne', sans-serif`;
        ctx.shadowColor = "#3b82f6"; ctx.shadowBlur = 28;
        ctx.fillStyle = "#3b82f6";
        ctx.globalAlpha = st.resA * (0.22 + 0.07 * Math.sin(textPhase.current * 2));
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + fs * 0.35);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── SYNTHESIS COMPLETE ──
      if (st.synthA > 0.01) {
        const label = "SYNTHESIS COMPLETE";
        ctx.font = `800 52px 'Syne', sans-serif`;
        const sc = Math.min(1, (W-40) / ctx.measureText(label).width);
        const fs = Math.floor(52 * sc);
        ctx.font = `800 ${fs}px 'Syne', sans-serif`;
        ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 32;
        ctx.fillStyle = "#a855f7";
        ctx.globalAlpha = st.synthA * (0.28 + 0.08 * Math.sin(textPhase.current * 1.5));
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + fs * 0.35);

        // Sub-label
        ctx.font = `400 13px 'Space Mono', monospace`;
        ctx.fillStyle = "#a855f7";
        ctx.globalAlpha = st.synthA * 0.5;
        ctx.fillText("governed · audited · stable", cx, cy + fs * 0.35 + 28);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── Center Synthesizer ──
      const cp = 0.7 + 0.3 * Math.sin(t * 0.04);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, CENTER_NODE.size * 4);
      cg.addColorStop(0, CENTER_NODE.color + "55"); cg.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, CENTER_NODE.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.globalAlpha = 0.6; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, CENTER_NODE.size, 0, Math.PI * 2);
      ctx.strokeStyle = CENTER_NODE.color; ctx.lineWidth = 2.5;
      ctx.globalAlpha = cp; ctx.stroke();
      ctx.fillStyle = CENTER_NODE.color + "33"; ctx.fill();
      ctx.globalAlpha = 1;

      // ── Orbit angle ──
      globalAngle.current += ORBIT_SPEED;

      // ── Nodes ──
      nodesRef.current.forEach((node, i) => {
        let tx, ty;

        if (phase === "idle") {
          // Synchronized perfect circle
          const ang = globalAngle.current + node.angle;
          tx = cx + Math.cos(ang) * idleR;
          ty = cy + Math.sin(ang) * idleR * 0.6;
          node.currentX += (tx - node.currentX) * 0.08;
          node.currentY += (ty - node.currentY) * 0.08;
        } else {
          // Each node drifts to its own target independently
          // Also adds a slow independent orbit around its target for floaty feel
          node.orbitPhase += node.driftSpeed;
          const floatX = Math.cos(node.orbitPhase) * 12;
          const floatY = Math.sin(node.orbitPhase) * 8;
          tx = node.targetX + floatX;
          ty = node.targetY + floatY;
          // Very slow ease — floaty
          node.currentX += (tx - node.currentX) * 0.018;
          node.currentY += (ty - node.currentY) * 0.018;
        }

        const nx = node.currentX;
        const ny = node.currentY;
        const pulse = 0.65 + 0.35 * Math.sin(t * 0.035 + i * 1.3);
        const alpha = phase !== "idle"
          ? 0.75 + 0.25 * Math.sin(t * 0.02 + i * 0.9) : 1;

        // Line to center
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = node.color; ctx.lineWidth = 0.5;
        ctx.globalAlpha = alpha * 0.1; ctx.stroke();

        // Glow
        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, node.size * 4);
        grd.addColorStop(0, node.color + "44"); grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(nx, ny, node.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.globalAlpha = alpha * 0.7; ctx.fill();

        ctx.beginPath(); ctx.arc(nx, ny, node.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = node.color; ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * pulse * 0.3; ctx.stroke();

        ctx.beginPath(); ctx.arc(nx, ny, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color; ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * pulse; ctx.stroke();
        ctx.fillStyle = node.color + "22"; ctx.fill();

        ctx.globalAlpha = alpha * 0.9;
        ctx.font = "11px 'Syne', monospace";
        ctx.fillStyle = node.color;
        ctx.textAlign = "center";
        ctx.fillText(node.label, nx, ny + node.size + 14);
        ctx.globalAlpha = 1;
      });

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
