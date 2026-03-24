import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

const IDLE_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, orbitR: 0.78, speed: 0.00025, phase: Math.PI * 0.1  },
  { label: "Researcher #1",color: "#10b981", size: 9,  orbitR: 0.72, speed: 0.0003,  phase: Math.PI * 0.55 },
  { label: "Researcher #2",color: "#10b981", size: 9,  orbitR: 0.75, speed: 0.00028, phase: Math.PI * 1.85 },
  { label: "Researcher #3",color: "#10b981", size: 9,  orbitR: 0.68, speed: 0.00022, phase: Math.PI * 1.35 },
  { label: "Critic",       color: "#f97316", size: 10, orbitR: 0.74, speed: 0.00030, phase: Math.PI * 0.85 },
  { label: "Planner",      color: "#3b82f6", size: 10, orbitR: 0.30, speed: 0.0005,  phase: Math.PI * 1.55 },
  { label: "Synthesizer",  color: "#a855f7", size: 13, orbitR: 0.20, speed: 0.0004,  phase: Math.PI * 1.1  },
];

// How far inward nodes drift while thinking (fraction of their idleR)
// 0 = stay put, 0.35 = drift 35% closer to center — never reach it
const THINK_DRIFT = 0.30;

export default function GraphPanel({ graph, isRunning }) {
  const containerRef  = useRef(null);
  const svgRef        = useRef(null);
  const canvasRef     = useRef(null);
  const animRef       = useRef(null);
  const nodesRef      = useRef(null);
  // "idle" | "thinking" | "done"
  const stateRef      = useRef("idle");

  const hasGraph = graph?.nodes?.length > 0;

  useGraph(svgRef, graph);

  // State transitions
  useEffect(() => {
    if (isRunning && stateRef.current === "idle") {
      stateRef.current = "thinking";
    }
    if (!isRunning && !hasGraph) {
      stateRef.current = "idle";
      nodesRef.current = null;
    }
    if (hasGraph) {
      stateRef.current = "done";
    }
  }, [isRunning, hasGraph]);

  // Canvas loop — runs once, reads stateRef reactively
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
      // Init on first frame
      if (!nodesRef.current) {
        nodesRef.current = IDLE_NODES.map((n) => {
          const r = n.orbitR * baseR;
          return {
            ...n,
            phase:    n.phase,
            idleR:    r,
            // target while thinking — slightly closer but never center
            thinkR:   r * (1 - THINK_DRIFT),
            currentR: r,
            x: cx + Math.cos(n.phase) * r,
            y: cy + Math.sin(n.phase) * r * 0.55,
          };
        });
      }

      ctx.clearRect(0, 0, W, H);
      t++;

      const state = stateRef.current;

      // Hide canvas once graph is showing
      if (state === "done") {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      nodesRef.current.forEach((node, i) => {
        // Advance orbit phase — slightly faster while thinking
        node.phase += node.speed * (state === "thinking" ? 1.6 : 1);

        // Ease radius toward target: idle = idleR, thinking = thinkR
        const targetR = state === "thinking" ? node.thinkR : node.idleR;
        // Very slow ease — 0.004 means it takes ~250 frames (~4s) to get close
        node.currentR += (targetR - node.currentR) * 0.004;

        const tx = cx + Math.cos(node.phase) * node.currentR;
        const ty = cy + Math.sin(node.phase) * node.currentR * 0.55;
        node.x   += (tx - node.x) * 0.08;
        node.y   += (ty - node.y) * 0.08;

        // Pulse intensity — extra glow while thinking
        const pulse = 0.6 + 0.35 * Math.sin(t * 0.04 + i * 1.3);
        const alpha = state === "thinking"
          ? 0.75 + 0.25 * Math.sin(t * 0.025 + i * 0.9)  // gentle breathing glow
          : 1;

        // Glow halo
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 4);
        grd.addColorStop(0, node.color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
        ctx.fillStyle   = grd;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth   = 1;
        ctx.globalAlpha = alpha * pulse * 0.3;
        ctx.stroke();

        // Main circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = alpha * pulse;
        ctx.stroke();
        ctx.fillStyle   = node.color + "22";
        ctx.fill();

        // Label
        ctx.globalAlpha = alpha * 0.85;
        ctx.font        = "11px 'Syne', 'Inter', monospace";
        ctx.fillStyle   = node.color;
        ctx.textAlign   = "center";
        ctx.fillText(node.label, node.x, node.y + node.size + 14);
        ctx.globalAlpha = 1;
      });

      // Center dot — only while thinking
      if (state === "thinking") {
        const dotR = 2.5 + 1.5 * Math.sin(t * 0.05);
        ctx.beginPath();
        ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
        ctx.fillStyle   = "#3b82f6";
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 0.05);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", background: "#07090f", overflow: "hidden" }}
    >
      {/* Canvas always mounted — hidden via state === "done" early return */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          pointerEvents: "none",
          // fade out canvas once graph arrives
          opacity: hasGraph ? 0 : 1,
          transition: "opacity 0.6s ease",
        }}
      />

      <svg
        ref={svgRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {!hasGraph && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: "Syne", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#334155", background: "rgba(7,9,15,0.5)", padding: "5px 14px", borderRadius: 20 }}>
            {isRunning ? "◌ Thinking..." : "Awaiting Research"}
          </div>
        </div>
      )}
    </div>
  );
}
