import React, { useRef, useEffect, useState } from "react";
import { useGraph } from "../../hooks/useGraph";

const ROLE_COLORS = {
  query: "#64748b",
  planner: "#3b82f6",
  research: "#10b981",
  critic: "#f97316",
  synthesizer: "#a855f7",
  human: "#f59e0b",
  tool: "#475569",
};

// Nodes are defined with angularPos (0–2π around the canvas edge),
// orbitR is the IDLE orbit radius (large = outer edge),
// targetR is the converged radius (small = near center).
// We distribute them across the full canvas so they feel "out there".
const IDLE_NODES = [
  {
    role: "human",
    label: "Human",
    color: "#f59e0b",
    size: 10,
    orbitR: 0.78,      // fraction of min(W,H)/2 — so they sit near canvas edge
    targetR: 0.08,
    speed: 0.00025,
    phase: Math.PI * 0.1,   // top-left-ish
  },
  {
    role: "research",
    label: "Researcher #1",
    color: "#10b981",
    size: 9,
    orbitR: 0.72,
    targetR: 0.10,
    speed: 0.0003,
    phase: Math.PI * 0.55,  // top-right
  },
  {
    role: "research",
    label: "Researcher #2",
    color: "#10b981",
    size: 9,
    orbitR: 0.75,
    targetR: 0.10,
    speed: 0.00028,
    phase: Math.PI * 1.85,  // bottom-right
  },
  {
    role: "research",
    label: "Researcher #3",
    color: "#10b981",
    size: 9,
    orbitR: 0.68,
    targetR: 0.10,
    speed: 0.00022,
    phase: Math.PI * 1.35,  // left-ish
  },
  {
    role: "critic",
    label: "Critic",
    color: "#f97316",
    size: 10,
    orbitR: 0.74,
    targetR: 0.09,
    speed: 0.00030,
    phase: Math.PI * 0.85,  // top-far-right
  },
  {
    role: "planner",
    label: "Planner",
    color: "#3b82f6",
    size: 10,
    orbitR: 0.30,            // planner is already closer in — mid distance
    targetR: 0.12,
    speed: 0.0005,
    phase: Math.PI * 1.55,
  },
  {
    role: "synthesizer",
    label: "Synthesizer",
    color: "#a855f7",
    size: 13,
    orbitR: 0.20,            // synthesizer orbits close, it's the core aggregator
    targetR: 0.06,
    speed: 0.0004,
    phase: Math.PI * 1.1,
  },
];

export default function GraphPanel({ graph, isRunning }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef("idle"); // idle | converging | done
  const nodesRef = useRef(null);
  const hasGraph = graph?.nodes?.length > 0;

  // Wire up D3 graph
  useGraph(svgRef, graph);

  // State machine
  useEffect(() => {
    if (isRunning && stateRef.current === "idle") {
      stateRef.current = "converging";
    }
    if (!isRunning && !hasGraph) {
      stateRef.current = "idle";
    }
  }, [isRunning, hasGraph]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth || 1000;
    const H = container.clientHeight || 600;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    const cx = W / 2;
    const cy = H / 2;
    // Use the smaller dimension as base radius so nodes don't clip on narrow screens
    const baseR = Math.min(W, H) / 2;

    // Init nodes — scale orbitR/targetR by baseR
    if (!nodesRef.current) {
      nodesRef.current = IDLE_NODES.map((n) => {
        const r = n.orbitR * baseR;
        return {
          ...n,
          x: cx + Math.cos(n.phase) * r,
          y: cy + Math.sin(n.phase) * r * 0.55,
          currentR: r,
          idleR: r,
          finalR: n.targetR * baseR,
          alpha: 1,
        };
      });
    }

    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      t++;

      const state = stateRef.current;

      nodesRef.current.forEach((node, i) => {
        if (state === "idle") {
          node.phase += node.speed;
          node.currentR = node.idleR;
          node.alpha = 1;
        } else if (state === "converging") {
          node.phase += node.speed * 5;
          // Ease currentR toward finalR
          node.currentR += (node.finalR - node.currentR) * 0.025;
          // Fade as they converge — start fading when they're close
          const progress = 1 - (node.currentR - node.finalR) / (node.idleR - node.finalR);
          node.alpha = Math.max(0, 1 - Math.pow(progress, 3));
        } else {
          node.alpha = 0;
        }

        const tx = cx + Math.cos(node.phase) * node.currentR;
        const ty = cy + Math.sin(node.phase) * node.currentR * 0.55;
        node.x += (tx - node.x) * 0.10;
        node.y += (ty - node.y) * 0.10;

        if (node.alpha <= 0.02) return;

        // Glow halo
        const grd = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.size * 4
        );
        grd.addColorStop(0, node.color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = node.alpha * 0.8;
        ctx.fill();

        // Outer ring pulse
        const pulse = 0.6 + 0.35 * Math.sin(t * 0.04 + i * 1.3);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = node.alpha * pulse * 0.35;
        ctx.stroke();

        // Main node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = node.alpha * pulse;
        ctx.stroke();
        ctx.fillStyle = node.color + "22";
        ctx.fill();

        // Label — only show in idle state (fade out as alpha drops)
        if (state !== "done") {
          ctx.globalAlpha = node.alpha * Math.min(1, node.alpha * 2);
          ctx.font = "11px 'Syne', 'Inter', monospace";
          ctx.fillStyle = node.color;
          ctx.textAlign = "center";
          ctx.fillText(node.label, node.x, node.y + node.size + 14);
        }

        ctx.globalAlpha = 1;
      });

      // Center pulse dot
      if (state !== "done") {
        const r = 3 + 2 * Math.sin(t * 0.07);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "#334155";
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 0.04);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Finish converge
      if (hasGraph && state === "converging") {
        const allFaded = nodesRef.current.every((n) => n.alpha <= 0.05);
        if (allFaded) stateRef.current = "done";
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Reset on new query
  useEffect(() => {
    if (!isRunning && !hasGraph) {
      stateRef.current = "idle";
      nodesRef.current = null;
    }
  }, [isRunning, hasGraph]);

  const showCanvas = stateRef.current !== "done";
  const showLabel = !hasGraph;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#07090f",
        overflow: "hidden",
      }}
    >
      {showCanvas && (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      )}

      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {showLabel && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: "Syne",
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#334155",
              background: "rgba(7,9,15,0.5)",
              padding: "5px 14px",
              borderRadius: 20,
            }}
          >
            {isRunning ? "◌ Thinking..." : "Awaiting Research"}
          </div>
        </div>
      )}
    </div>
  );
}
