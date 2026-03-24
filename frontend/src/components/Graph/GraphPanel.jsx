import React, { useRef, useEffect, useState } from "react";
import { useGraph } from "../../hooks/useGraph";

// Floating node config for idle animation
const IDLE_NODES = [
  { role: "planner",     color: "#3b82f6", size: 10 },
  { role: "research",    color: "#10b981", size: 9 },
  { role: "research",    color: "#10b981", size: 9 },
  { role: "research",    color: "#10b981", size: 9 },
  { role: "critic",      color: "#f97316", size: 10 },
  { role: "synthesizer", color: "#a855f7", size: 13 },
  { role: "human",       color: "#f59e0b", size: 8 },
];

function IdleAnimation({ containerRef }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const nodesRef  = useRef([]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const W = container.clientWidth  || 800;
    const H = container.clientHeight || 500;
    const cx = W / 2;
    const cy = H / 2;

    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Initialise nodes scattered randomly, each drifting toward center
    nodesRef.current = IDLE_NODES.map((n, i) => {
      const angle  = (i / IDLE_NODES.length) * Math.PI * 2;
      const radius = 160 + Math.random() * 80;
      return {
        ...n,
        x:  cx + Math.cos(angle) * radius,
        y:  cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        angle,
        orbitR: 90 + (i % 3) * 30,
        speed:  0.0004 + Math.random() * 0.0003,
        phase:  Math.random() * Math.PI * 2,
      };
    });

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      t += 1;

      nodesRef.current.forEach((node, i) => {
        // Orbit slowly around center
        node.phase += node.speed;
        const tx = cx + Math.cos(node.phase) * node.orbitR;
        const ty = cy + Math.sin(node.phase) * node.orbitR * 0.5;

        // Ease toward target
        node.x += (tx - node.x) * 0.02;
        node.y += (ty - node.y) * 0.02;

        // Draw glow
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 3);
        grd.addColorStop(0, node.color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 0.03 + i);
        ctx.stroke();
        ctx.fillStyle   = node.color + "33";
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw faint lines to center
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = node.color + "11";
        ctx.lineWidth   = 1;
        ctx.stroke();
      });

      // Draw center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle   = "#334155";
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.04);
      ctx.fill();
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [containerRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.7 }}
    />
  );
}

export default function GraphPanel({ graph }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const isEmpty      = !graph?.nodes?.length;

  useGraph(svgRef, graph);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", background: "#07090f", overflow: "hidden" }}
    >
      {/* Idle orbit animation */}
      {isEmpty && <IdleAnimation containerRef={containerRef} />}

      {/* D3 graph */}
      <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Awaiting label */}
      {isEmpty && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            fontFamily: "Syne", fontSize: 11, letterSpacing: 3,
            textTransform: "uppercase", color: "#334155",
            background: "rgba(7,9,15,0.6)", padding: "6px 16px", borderRadius: 20,
          }}>
            Awaiting Research
          </div>
        </div>
      )}
    </div>
  );
}
