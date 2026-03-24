import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

const IDLE_NODES = [
  { color: "#3b82f6", size: 10, orbitR: 80,  speed: 0.0005, phase: 0 },
  { color: "#10b981", size: 9,  orbitR: 100, speed: 0.0004, phase: 2.1 },
  { color: "#10b981", size: 9,  orbitR: 110, speed: 0.0006, phase: 4.2 },
  { color: "#10b981", size: 9,  orbitR: 95,  speed: 0.0003, phase: 1.0 },
  { color: "#f97316", size: 10, orbitR: 90,  speed: 0.0005, phase: 3.3 },
  { color: "#a855f7", size: 13, orbitR: 70,  speed: 0.0004, phase: 5.0 },
  { color: "#f59e0b", size: 8,  orbitR: 120, speed: 0.0003, phase: 0.5 },
];

export default function GraphPanel({ graph, isThinking }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);
  const nodesRef     = useRef(IDLE_NODES.map(n => ({ ...n, x: 0, y: 0, currentR: n.orbitR })));
  const hasGraph     = graph?.nodes?.length > 0;

  useGraph(svgRef, graph);

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth  || 800;
    const H = container.clientHeight || 500;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const cx = W / 2, cy = H / 2;

    // Init positions
    nodesRef.current.forEach((n, i) => {
      n.x = cx + Math.cos(n.phase) * n.currentR;
      n.y = cy + Math.sin(n.phase) * n.currentR * 0.55;
    });

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      t++;

      nodesRef.current.forEach((node, i) => {
        // When thinking: shrink orbit toward center
        // When idle/graph shown: maintain normal orbit
        const targetR = isThinking
          ? node.orbitR * 0.15   // drift inward to 15% of normal orbit
          : hasGraph
            ? 0                   // fully gone when graph is active
            : node.orbitR;        // normal idle orbit

        node.currentR += (targetR - node.currentR) * 0.03;
        node.phase    += node.speed * (isThinking ? 3 : 1); // spin faster when thinking

        const tx = cx + Math.cos(node.phase) * node.currentR;
        const ty = cy + Math.sin(node.phase) * node.currentR * 0.55;
        node.x += (tx - node.x) * 0.08;
        node.y += (ty - node.y) * 0.08;

        const alpha = hasGraph ? Math.max(0, 1 - node.currentR / node.orbitR) : 0.7;
        if (alpha <= 0.01) return;

        // Glow
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 3);
        grd.addColorStop(0, node.color + "55");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Node ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = alpha * (0.6 + 0.3 * Math.sin(t * 0.04 + i));
        ctx.stroke();
        ctx.fillStyle   = node.color + "22";
        ctx.fill();

        // Line to center when thinking
        if (isThinking) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = node.color + "22";
          ctx.lineWidth   = 1;
          ctx.globalAlpha = alpha * 0.4;
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
      });

      // Center pulse when thinking
      if (isThinking || !hasGraph) {
        const pulse = 0.4 + 0.3 * Math.sin(t * 0.06);
        ctx.beginPath();
        ctx.arc(cx, cy, 4 + 3 * Math.sin(t * 0.06), 0, Math.PI * 2);
        ctx.fillStyle   = "#334155";
        ctx.globalAlpha = pulse;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isThinking, hasGraph]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", background: "#07090f", overflow: "hidden" }}>
      {/* Orbit canvas — always rendered, fades out when graph fully active */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

      {/* D3 graph */}
      <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Awaiting label — only when no graph */}
      {!hasGraph && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: "Syne", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#334155", background: "rgba(7,9,15,0.5)", padding: "5px 14px", borderRadius: 20 }}>
            {isThinking ? "◌ Thinking..." : "Awaiting Research"}
          </div>
        </div>
      )}
    </div>
  );
}
