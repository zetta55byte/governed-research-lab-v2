import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

const IDLE_NODES = [
  { role: "human",       label: "Human",        color: "#f59e0b", size: 10, orbitR: 0.78, targetR: 0.08, speed: 0.00025, phase: Math.PI * 0.1  },
  { role: "research",    label: "Researcher #1", color: "#10b981", size: 9,  orbitR: 0.72, targetR: 0.10, speed: 0.0003,  phase: Math.PI * 0.55 },
  { role: "research",    label: "Researcher #2", color: "#10b981", size: 9,  orbitR: 0.75, targetR: 0.10, speed: 0.00028, phase: Math.PI * 1.85 },
  { role: "research",    label: "Researcher #3", color: "#10b981", size: 9,  orbitR: 0.68, targetR: 0.10, speed: 0.00022, phase: Math.PI * 1.35 },
  { role: "critic",      label: "Critic",        color: "#f97316", size: 10, orbitR: 0.74, targetR: 0.09, speed: 0.00030, phase: Math.PI * 0.85 },
  { role: "planner",     label: "Planner",       color: "#3b82f6", size: 10, orbitR: 0.30, targetR: 0.12, speed: 0.0005,  phase: Math.PI * 1.55 },
  { role: "synthesizer", label: "Synthesizer",   color: "#a855f7", size: 13, orbitR: 0.20, targetR: 0.06, speed: 0.0004,  phase: Math.PI * 1.1  },
];

function breatheR(idleR, finalR, breathPhase) {
  const t = (Math.cos(breathPhase) + 1) / 2;
  return finalR + (idleR - finalR) * t;
}

export default function GraphPanel({ graph, isRunning }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);
  const stateRef     = useRef("idle");
  const nodesRef     = useRef(null);
  const breathPhaseRef = useRef(0);
  const BREATH_SPEED   = 0.008;
  const burstRef       = useRef(null);
  const prevLinkCount  = useRef(0);

  const hasGraph  = graph?.nodes?.length > 0;
  const linkCount = graph?.links?.length ?? 0;

  useGraph(svgRef, graph);

  useEffect(() => {
    if (isRunning && stateRef.current === "idle") {
      stateRef.current = "thinking";
      breathPhaseRef.current = 0;
    }
    if (!isRunning && !hasGraph) {
      stateRef.current = "idle";
    }
  }, [isRunning, hasGraph]);

  useEffect(() => {
    if (stateRef.current === "thinking" && linkCount > prevLinkCount.current) {
      const canvas    = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const cx = (container.clientWidth  || 1000) / 2;
        const cy = (container.clientHeight || 600)  / 2;
        const COUNT = 18;
        const particles = Array.from({ length: COUNT }, (_, i) => {
          const angle = (i / COUNT) * Math.PI * 2;
          const speed = 2.5 + Math.random() * 2.5;
          return {
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed * 0.55,
            alpha: 1,
            color: ["#3b82f6", "#10b981", "#a855f7", "#f97316"][i % 4],
            size: 2 + Math.random() * 2,
          };
        });
        burstRef.current = { particles, age: 0 };
        breathPhaseRef.current = 0;
      }
    }
    prevLinkCount.current = linkCount;
  }, [linkCount]);

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
        nodesRef.current = IDLE_NODES.map((n) => {
          const r = n.orbitR * baseR;
          return { ...n, x: cx + Math.cos(n.phase) * r, y: cy + Math.sin(n.phase) * r * 0.55, currentR: r, idleR: r, finalR: n.targetR * baseR, alpha: 1 };
        });
      }

      ctx.clearRect(0, 0, W, H);
      t++;
      const state = stateRef.current;

      nodesRef.current.forEach((node, i) => {
        if (state === "idle") {
          node.phase    += node.speed;
          node.currentR  = node.idleR;
          node.alpha     = 1;
        } else if (state === "thinking") {
          node.phase    += node.speed * 3;
          node.currentR  = breatheR(node.idleR, node.finalR, breathPhaseRef.current);
          node.alpha     = 1;
        } else if (state === "converging") {
          node.phase    += node.speed * 5;
          node.currentR += (node.finalR - node.currentR) * 0.025;
          const progress = 1 - (node.currentR - node.finalR) / Math.max(node.idleR - node.finalR, 1);
          node.alpha     = Math.max(0, 1 - Math.pow(progress, 3));
        } else {
          node.alpha = 0;
        }

        const tx = cx + Math.cos(node.phase) * node.currentR;
        const ty = cy + Math.sin(node.phase) * node.currentR * 0.55;
        node.x  += (tx - node.x) * 0.10;
        node.y  += (ty - node.y) * 0.10;

        if (node.alpha <= 0.02) return;

        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 4);
        grd.addColorStop(0, node.color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
        ctx.fillStyle   = grd;
        ctx.globalAlpha = node.alpha * 0.8;
        ctx.fill();

        const breathIntensity = state === "thinking" ? 0.5 + 0.5 * Math.abs(Math.sin(breathPhaseRef.current / 2)) : 1;
        const pulse = 0.6 + 0.35 * Math.sin(t * 0.04 + i * 1.3);

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth   = 1;
        ctx.globalAlpha = node.alpha * pulse * 0.35 * breathIntensity;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = node.alpha * pulse;
        ctx.stroke();
        ctx.fillStyle   = node.color + "22";
        ctx.fill();

        ctx.globalAlpha = node.alpha * Math.min(1, node.alpha * 2);
        ctx.font        = "11px 'Syne', 'Inter', monospace";
        ctx.fillStyle   = node.color;
        ctx.textAlign   = "center";
        ctx.fillText(node.label, node.x, node.y + node.size + 14);
        ctx.globalAlpha = 1;
      });

      if (state === "thinking") {
        breathPhaseRef.current = (breathPhaseRef.current + BREATH_SPEED) % (Math.PI * 2);
      }

      if (burstRef.current) {
        burstRef.current.age++;
        burstRef.current.particles.forEach((p) => {
          p.x += p.vx; p.y += p.vy;
          p.vx *= 0.94; p.vy *= 0.94;
          p.alpha -= 0.032;
          if (p.alpha <= 0) return;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle   = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (burstRef.current.particles.every((p) => p.alpha <= 0)) burstRef.current = null;
      }

      if (state !== "done") {
        const dotR = state === "thinking" ? 4 + 3 * Math.abs(Math.sin(breathPhaseRef.current / 2)) : 3 + 2 * Math.sin(t * 0.07);
        ctx.beginPath();
        ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
        ctx.fillStyle   = state === "thinking" ? "#3b82f6" : "#334155";
        ctx.globalAlpha = state === "thinking" ? 0.4 + 0.4 * Math.abs(Math.sin(breathPhaseRef.current / 2)) : 0.3 + 0.3 * Math.sin(t * 0.04);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (hasGraph && state === "thinking")    stateRef.current = "converging";
      if (hasGraph && state === "converging") {
        if (nodesRef.current.every((n) => n.alpha <= 0.05)) stateRef.current = "done";
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    if (!isRunning && !hasGraph) {
      stateRef.current       = "idle";
      nodesRef.current       = null;
      burstRef.current       = null;
      prevLinkCount.current  = 0;
      breathPhaseRef.current = 0;
    }
  }, [isRunning, hasGraph]);

  const showCanvas = stateRef.current !== "done";
  const showLabel  = !hasGraph;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", background: "#07090f", overflow: "hidden" }}>
      {showCanvas && (
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      )}
      <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
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
