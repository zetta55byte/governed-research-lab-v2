import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

// Idle: all nodes orbit at SAME radius — perfect synchronized circle
// Thinking: each node drifts outward to its own unique far radius
// Then slowly pulls back inward — governance reconverging
const RING_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, angle: 0,                  farR: 0.82, speed: 0.0004  },
  { label: "Researcher #1",color: "#10b981", size: 9,  angle: Math.PI * 0.333,    farR: 0.78, speed: 0.00035 },
  { label: "Researcher #2",color: "#10b981", size: 9,  angle: Math.PI * 0.666,    farR: 0.85, speed: 0.00045 },
  { label: "Researcher #3",color: "#10b981", size: 9,  angle: Math.PI * 1.0,      farR: 0.75, speed: 0.0003  },
  { label: "Critic",       color: "#f97316", size: 10, angle: Math.PI * 1.333,    farR: 0.80, speed: 0.00038 },
  { label: "Planner",      color: "#3b82f6", size: 10, angle: Math.PI * 1.666,    farR: 0.72, speed: 0.00042 },
];

const CENTER_NODE = { color: "#a855f7", size: 14 };
const IDLE_R      = 0.38; // all start at same radius — perfect circle
const ORBIT_SPEED = 0.0005; // shared orbit speed for idle

const AMBIENT_WORDS = [
  "M1","M2","M3","M4","δ","S(t)","α","β","γ",
  "continuity","membrane","governed","attractor",
  "entropy","stability","planner","critic","synthesizer",
  "constitutional","delta","chain","ridge","substrate",
  "feedback","allow","defer","block","∇","∑","⊕","◈",
];

export default function GraphPanel({ graph, isRunning }) {
  const containerRef  = useRef(null);
  const svgRef        = useRef(null);
  const canvasRef     = useRef(null);
  const animRef       = useRef(null);
  const nodesRef      = useRef(null);
  const ambientRef    = useRef(null);
  const stateRef      = useRef("idle");   // idle | scatter | converge | done
  const globalAngle   = useRef(0);        // shared orbit angle for idle
  const awaitAlpha    = useRef(1);
  const researchAlpha = useRef(0);
  const textPhase     = useRef(0);

  const hasGraph = graph?.nodes?.length > 0;

  useGraph(svgRef, graph);

  useEffect(() => {
    if (isRunning && stateRef.current === "idle") {
      stateRef.current = "scatter"; // first drift OUT
    }
    if (!isRunning && !hasGraph) {
      stateRef.current  = "idle";
      nodesRef.current  = null;
      ambientRef.current = null;
      awaitAlpha.current = 1;
      researchAlpha.current = 0;
      globalAngle.current = 0;
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
    const idleR = IDLE_R * baseR;

    let t = 0;

    function draw() {
      // Init nodes — all at same idleR, evenly spaced
      if (!nodesRef.current) {
        nodesRef.current = RING_NODES.map(n => ({
          ...n,
          phase:    n.angle,        // individual phase offset from global
          currentR: idleR,
          idleR:    idleR,
          farR:     n.farR * baseR,
          convergeR: idleR * 0.35, // where they pull back to while "thinking"
          x: cx + Math.cos(n.angle) * idleR,
          y: cy + Math.sin(n.angle) * idleR * 0.6,
        }));
      }

      // Init ambient words
      if (!ambientRef.current) {
        ambientRef.current = AMBIENT_WORDS.map((word, i) => ({
          word,
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          baseAlpha: 0.06 + Math.random() * 0.10,
          size:  9 + Math.random() * 5,
          phase: Math.random() * Math.PI * 2,
          color: ["#3b82f6","#10b981","#a855f7","#f97316","#334155"][i % 5],
        }));
      }

      ctx.clearRect(0, 0, W, H);
      t++;
      textPhase.current += 0.02;

      const state = stateRef.current;

      if (state === "done") {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // ── Text cross-fade ──
      if (state === "scatter" || state === "converge") {
        awaitAlpha.current    = Math.max(0, awaitAlpha.current - 0.02);
        researchAlpha.current = Math.min(1, researchAlpha.current + 0.02);
      } else {
        awaitAlpha.current    = Math.min(1, awaitAlpha.current + 0.015);
        researchAlpha.current = Math.max(0, researchAlpha.current - 0.015);
      }

      // ── Ambient words ──
      ambientRef.current.forEach(w => {
        const spd = (state === "scatter" || state === "converge") ? 1.5 : 1;
        w.x += w.vx * spd;
        w.y += w.vy * spd;
        if (w.x < -60) w.x = W + 60;
        if (w.x > W + 60) w.x = -60;
        if (w.y < -20) w.y = H + 20;
        if (w.y > H + 20) w.y = -20;

        const pa = w.baseAlpha * (0.5 + 0.5 * Math.sin(w.phase + t * 0.012));
        ctx.font = `${w.size}px 'Space Mono', monospace`;
        ctx.fillStyle = w.color;
        ctx.globalAlpha = pa;
        ctx.fillText(w.word, w.x, w.y);
        ctx.globalAlpha = 1;
      });

      // ── AWAITING RESEARCH text ──
      if (awaitAlpha.current > 0.01) {
        const label = "AWAITING RESEARCH";
        ctx.font = `800 54px 'Syne', sans-serif`;
        const mw = ctx.measureText(label).width;
        const sc = Math.min(1, (W - 80) / mw);
        const fs = Math.floor(54 * sc);
        ctx.font = `800 ${fs}px 'Syne', sans-serif`;
        ctx.fillStyle = "#1e2a3a";
        ctx.globalAlpha = awaitAlpha.current * (0.55 + 0.08 * Math.sin(textPhase.current));
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + fs * 0.35);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }

      // ── RESEARCHING text ──
      if (researchAlpha.current > 0.01) {
        const label = "RESEARCHING...";
        ctx.font = `800 58px 'Syne', sans-serif`;
        const mw = ctx.measureText(label).width;
        const sc = Math.min(1, (W - 60) / mw);
        const fs = Math.floor(58 * sc);
        ctx.font = `800 ${fs}px 'Syne', sans-serif`;
        ctx.fillStyle = "#3b82f6";
        ctx.globalAlpha = researchAlpha.current * (0.18 + 0.07 * Math.sin(textPhase.current * 2));
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + fs * 0.35);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }

      // ── Center Synthesizer ──
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
      ctx.globalAlpha = 1;

      // ── Global orbit angle (used in idle for shared ring) ──
      globalAngle.current += ORBIT_SPEED;

      // ── Nodes ──
      let scatterDone = true;

      nodesRef.current.forEach((node, i) => {
        let targetR;

        if (state === "idle") {
          // Perfect synchronized circle — all same radius, shared angle
          targetR = node.idleR;
          const ang = globalAngle.current + node.phase;
          const tx  = cx + Math.cos(ang) * node.idleR;
          const ty  = cy + Math.sin(ang) * node.idleR * 0.6;
          node.currentR = node.idleR;
          node.x += (tx - node.x) * 0.08;
          node.y += (ty - node.y) * 0.08;

        } else if (state === "scatter") {
          // Drift outward — each to own farR
          targetR = node.farR;
          node.currentR += (node.farR - node.currentR) * 0.012;
          if (node.currentR < node.farR * 0.95) scatterDone = false;

          // Keep orbiting but each with own speed
          node.phase += node.speed;
          const ang = node.phase;
          const tx  = cx + Math.cos(ang) * node.currentR;
          const ty  = cy + Math.sin(ang) * node.currentR * 0.6;
          node.x += (tx - node.x) * 0.08;
          node.y += (ty - node.y) * 0.08;

        } else if (state === "converge") {
          // Pull back inward toward convergeR — governance reconverging
          targetR = node.convergeR;
          node.currentR += (node.convergeR - node.currentR) * 0.018;

          node.phase += node.speed * 1.5; // orbit a bit faster as they converge
          const ang = node.phase;
          const tx  = cx + Math.cos(ang) * node.currentR;
          const ty  = cy + Math.sin(ang) * node.currentR * 0.6;
          node.x += (tx - node.x) * 0.10;
          node.y += (ty - node.y) * 0.10;
        }

        // Once scattered, switch to converge
        if (state === "scatter" && scatterDone) {
          stateRef.current = "converge";
        }

        const pulse = 0.65 + 0.35 * Math.sin(t * 0.035 + i * 1.3);
        const alpha = (state === "scatter" || state === "converge")
          ? 0.75 + 0.25 * Math.sin(t * 0.02 + i * 0.9) : 1;

        // Line to center
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = node.color; ctx.lineWidth = 0.5;
        ctx.globalAlpha = alpha * 0.1; ctx.stroke();

        // Glow
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 4);
        grd.addColorStop(0, node.color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.globalAlpha = alpha * 0.7; ctx.fill();

        // Outer ring
        ctx.beginPath(); ctx.arc(node.x, node.y, node.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = node.color; ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * pulse * 0.3; ctx.stroke();

        // Main circle
        ctx.beginPath(); ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color; ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * pulse; ctx.stroke();
        ctx.fillStyle = node.color + "22"; ctx.fill();

        // Label
        ctx.globalAlpha = alpha * 0.9;
        ctx.font = "11px 'Syne', monospace";
        ctx.fillStyle = node.color;
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + node.size + 14);
        ctx.globalAlpha = 1;
      });

      if (hasGraph) stateRef.current = "done";

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
