import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

// Nodes orbit around center in a synchronized ring
// Synthesizer is the anchor at center, others orbit around it
const RING_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, angleOffset: 0            },
  { label: "Researcher #1",color: "#10b981", size: 9,  angleOffset: Math.PI * 0.4 },
  { label: "Researcher #2",color: "#10b981", size: 9,  angleOffset: Math.PI * 0.8 },
  { label: "Researcher #3",color: "#10b981", size: 9,  angleOffset: Math.PI * 1.2 },
  { label: "Critic",       color: "#f97316", size: 10, angleOffset: Math.PI * 1.6 },
  { label: "Planner",      color: "#3b82f6", size: 10, angleOffset: Math.PI * 2.0 },
];

const CENTER_NODE = { label: "Synthesizer", color: "#a855f7", size: 14 };

// Idle orbit radius — nice and wide so they clearly circle the center
const IDLE_R   = 0.62;  // fraction of min(W,H)/2
const ORBIT_SPEED = 0.0006; // slow synchronized rotation

export default function GraphPanel({ graph, isRunning }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);
  const nodesRef     = useRef(null);
  const stateRef     = useRef("idle"); // idle | burst-out | thinking | done
  const burstRef     = useRef(null);   // { particles, age }
  const prevLinkCount = useRef(0);
  const orbitAngle   = useRef(0);      // global orbit angle — all nodes share this

  // Per-node radii for smooth easing
  const nodeRadii    = useRef(null);

  const hasGraph  = graph?.nodes?.length > 0;
  const linkCount = graph?.links?.length ?? 0;

  useGraph(svgRef, graph);

  // State machine
  useEffect(() => {
    if (isRunning && stateRef.current === "idle") {
      stateRef.current = "burst-out";
    }
    if (!isRunning && !hasGraph) {
      stateRef.current = "idle";
      nodesRef.current = null;
      nodeRadii.current = null;
      burstRef.current  = null;
      prevLinkCount.current = 0;
    }
    if (hasGraph) stateRef.current = "done";
  }, [isRunning, hasGraph]);

  // Fire burst + reset drift when new connection arrives
  useEffect(() => {
    if (stateRef.current === "thinking" && linkCount > prevLinkCount.current) {
      const container = containerRef.current;
      if (container) {
        const cx = (container.clientWidth  || 1000) / 2;
        const cy = (container.clientHeight || 600)  / 2;
        const COUNT = 22;
        burstRef.current = {
          age: 0,
          particles: Array.from({ length: COUNT }, (_, i) => {
            const angle = (i / COUNT) * Math.PI * 2;
            const speed = 3 + Math.random() * 3;
            return {
              x: cx, y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed * 0.55,
              alpha: 1,
              color: ["#3b82f6","#10b981","#a855f7","#f97316","#f59e0b"][i % 5],
              size: 2 + Math.random() * 2.5,
            };
          }),
        };
        // Snap nodes back out beyond idle so drift inward is clearly visible
        if (nodeRadii.current) {
          nodeRadii.current.forEach(n => { n.current = n.idle * 1.25; });
        }
        // Force state back to thinking so the inward ease runs
        stateRef.current = "thinking";
      }
    }
    prevLinkCount.current = linkCount;
  }, [linkCount]);

  // Canvas loop
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
    // While thinking, drift inward to this radius
    const thinkR = idleR * 0.42;

    let t = 0;

    function draw() {
      // Init ring nodes
      if (!nodesRef.current) {
        nodesRef.current = RING_NODES.map((n, i) => ({
          ...n,
          x: cx + Math.cos(n.angleOffset) * idleR,
          y: cy + Math.sin(n.angleOffset) * idleR * 0.6,
        }));
      }

      // Init per-node radii
      if (!nodeRadii.current) {
        nodeRadii.current = RING_NODES.map(() => ({
          current: idleR,
          idle: idleR,
          think: thinkR,
        }));
      }

      ctx.clearRect(0, 0, W, H);
      t++;

      // Always read fresh from ref — no stale closures
      const state = stateRef.current;

      if (state === "done") {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Advance global orbit angle
      orbitAngle.current += state === "thinking" ? ORBIT_SPEED * 1.8 : ORBIT_SPEED;

      // Burst-out: push radii out past idle, then flip to thinking
      if (state === "burst-out") {
        nodeRadii.current.forEach(n => {
          n.current += (idleR * 1.25 - n.current) * 0.08;
        });
        if (nodeRadii.current.every(n => n.current >= idleR * 1.18)) {
          stateRef.current = "thinking";
        }
      }

      // Thinking: ease inward clearly — 0.05 = visibly rolls in within ~1s
      if (stateRef.current === "thinking") {
        nodeRadii.current.forEach(n => {
          n.current += (thinkR - n.current) * 0.05;
        });
      }

      // Idle: drift back out
      if (state === "idle") {
        nodeRadii.current.forEach(n => {
          n.current += (idleR - n.current) * 0.03;
        });
      }

      // Draw center Synthesizer node
      const centerPulse = 0.7 + 0.3 * Math.sin(t * 0.04);
      const cgrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, CENTER_NODE.size * 4);
      cgrd.addColorStop(0, CENTER_NODE.color + "55");
      cgrd.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, CENTER_NODE.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = cgrd;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, CENTER_NODE.size, 0, Math.PI * 2);
      ctx.strokeStyle = CENTER_NODE.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = centerPulse;
      ctx.stroke();
      ctx.fillStyle = CENTER_NODE.color + "33";
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.font = "11px 'Syne', monospace";
      ctx.fillStyle = CENTER_NODE.color;
      ctx.textAlign = "center";
      ctx.fillText(CENTER_NODE.label, cx, cy + CENTER_NODE.size + 14);
      ctx.globalAlpha = 1;

      // Draw orbit ring (faint guide circle)
      RING_NODES.forEach((def, i) => {
        const angle = orbitAngle.current + def.angleOffset;
        const r     = nodeRadii.current[i].current;
        // Ellipse orbit (perspective feel)
        const tx = cx + Math.cos(angle) * r;
        const ty = cy + Math.sin(angle) * r * 0.6;

        nodesRef.current[i].x += (tx - nodesRef.current[i].x) * 0.12;
        nodesRef.current[i].y += (ty - nodesRef.current[i].y) * 0.12;

        const nx = nodesRef.current[i].x;
        const ny = nodesRef.current[i].y;

        const pulse = 0.65 + 0.35 * Math.sin(t * 0.035 + i * 1.05);
        const thinking = state === "thinking";
        const alpha = thinking ? 0.75 + 0.25 * Math.sin(t * 0.02 + i * 0.8) : 1;

        // Connection line to center
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = alpha * 0.12;
        ctx.stroke();

        // Glow
        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, def.size * 4);
        grd.addColorStop(0, def.color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(nx, ny, def.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(nx, ny, def.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * pulse * 0.3;
        ctx.stroke();

        // Main circle
        ctx.beginPath();
        ctx.arc(nx, ny, def.size, 0, Math.PI * 2);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * pulse;
        ctx.stroke();
        ctx.fillStyle = def.color + "22";
        ctx.fill();

        // Label
        ctx.globalAlpha = alpha * 0.9;
        ctx.font = "11px 'Syne', monospace";
        ctx.fillStyle = def.color;
        ctx.textAlign = "center";
        ctx.fillText(def.label, nx, ny + def.size + 14);
        ctx.globalAlpha = 1;
      });

      // Burst particles
      if (burstRef.current) {
        burstRef.current.age++;
        burstRef.current.particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          p.vx *= 0.93; p.vy *= 0.93;
          p.alpha -= 0.028;
          if (p.alpha <= 0) return;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (burstRef.current.particles.every(p => p.alpha <= 0)) burstRef.current = null;
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
      {!hasGraph && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: "Syne", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#1e2a3a", background: "rgba(7,9,15,0.5)", padding: "5px 14px", borderRadius: 20 }}>
            {isRunning ? "◌ Thinking..." : "Awaiting Research"}
          </div>
        </div>
      )}
    </div>
  );
}
