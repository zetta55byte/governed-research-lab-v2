import React, { useRef, useEffect, useState } from "react";
import { useGraph } from "../../hooks/useGraph";

const ROLE_COLORS = {
  query: "#64748b", planner: "#3b82f6", research: "#10b981",
  critic: "#f97316", synthesizer: "#a855f7", human: "#f59e0b", tool: "#475569",
};

const IDLE_NODES = [
  { role: "planner",     color: "#3b82f6", size: 10, orbitR: 80,  speed: 0.0005, phase: 0 },
  { role: "research",    color: "#10b981", size: 9,  orbitR: 100, speed: 0.0004, phase: 2.1 },
  { role: "research",    color: "#10b981", size: 9,  orbitR: 110, speed: 0.0006, phase: 4.2 },
  { role: "research",    color: "#10b981", size: 9,  orbitR: 95,  speed: 0.0003, phase: 1.0 },
  { role: "critic",      color: "#f97316", size: 10, orbitR: 90,  speed: 0.0005, phase: 3.3 },
  { role: "synthesizer", color: "#a855f7", size: 13, orbitR: 70,  speed: 0.0004, phase: 5.0 },
  { role: "human",       color: "#f59e0b", size: 8,  orbitR: 120, speed: 0.0003, phase: 0.5 },
];

export default function GraphPanel({ graph, isRunning }) {
  const containerRef  = useRef(null);
  const svgRef        = useRef(null);
  const canvasRef     = useRef(null);
  const animRef       = useRef(null);
  const stateRef      = useRef("idle"); // idle | converging | done
  const nodesRef      = useRef(null);

  const hasGraph = graph?.nodes?.length > 0;

  // Wire up D3 graph (renders into svgRef)
  useGraph(svgRef, graph);

  // Transition state machine
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
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W  = container.clientWidth  || 800;
    const H  = container.clientHeight || 500;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const cx = W / 2, cy = H / 2;

    // Init nodes
    if (!nodesRef.current) {
      nodesRef.current = IDLE_NODES.map(n => ({
        ...n,
        x: cx + Math.cos(n.phase) * n.orbitR,
        y: cy + Math.sin(n.phase) * n.orbitR * 0.55,
        currentR: n.orbitR,
        alpha: 1,
      }));
    }

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      t++;

      const state = stateRef.current;

      nodesRef.current.forEach((node, i) => {
        if (state === "idle") {
          // Normal orbit
          node.phase    += node.speed;
          node.currentR  = node.orbitR;
          node.alpha     = 1;
        } else if (state === "converging") {
          // Spiral inward toward center
          node.phase    += node.speed * 4;
          node.currentR *= 0.97; // shrink radius each frame
          node.alpha     = Math.max(0, node.currentR / node.orbitR);
        } else {
          node.alpha = 0;
        }

        const tx = cx + Math.cos(node.phase) * node.currentR;
        const ty = cy + Math.sin(node.phase) * node.currentR * 0.55;
        node.x += (tx - node.x) * 0.12;
        node.y += (ty - node.y) * 0.12;

        if (node.alpha <= 0.02) return;

        // Glow
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 3);
        grd.addColorStop(0, node.color + "55");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 3, 0, Math.PI * 2);
        ctx.fillStyle   = grd;
        ctx.globalAlpha = node.alpha;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = node.alpha * (0.6 + 0.3 * Math.sin(t * 0.04 + i));
        ctx.stroke();
        ctx.fillStyle   = node.color + "22";
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Center pulse dot
      if (state !== "done") {
        ctx.beginPath();
        ctx.arc(cx, cy, 3 + 2 * Math.sin(t * 0.07), 0, Math.PI * 2);
        ctx.fillStyle   = "#334155";
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 0.04);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Hide canvas once graph nodes are visible and converge is done
      if (hasGraph && state === "converging") {
        const allFaded = nodesRef.current.every(n => n.alpha <= 0.05);
        if (allFaded) stateRef.current = "done";
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []); // run once, reads stateRef reactively

  // Reset when query resets
  useEffect(() => {
    if (!isRunning && !hasGraph) {
      stateRef.current = "idle";
      nodesRef.current = null; // re-init positions on next render
    }
  }, [isRunning, hasGraph]);

  const showCanvas = stateRef.current !== "done";
  const showLabel  = !hasGraph;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", background: "#07090f", overflow: "hidden" }}>
      {/* Orbit/converge canvas */}
      {showCanvas && (
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      )}

      {/* D3 graph SVG — always mounted so D3 can update it */}
      <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Label */}
      {showLabel && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: "Syne", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#334155", background: "rgba(7,9,15,0.5)", padding: "5px 14px", borderRadius: 20 }}>
            {isRunning ? "◌ Thinking..." : "Awaiting Research"}
          </div>
        </div>
      )}
    </div>
  );
}
