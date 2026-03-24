import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

const RING_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, angle: 0,             farAngle: Math.PI*0.05,  farR: 0.80, driftSpd: 0.00018 },
  { label: "Researcher #1",color: "#10b981", size: 9,  angle: Math.PI*0.333, farAngle: Math.PI*0.42,  farR: 0.74, driftSpd: 0.00024 },
  { label: "Researcher #2",color: "#10b981", size: 9,  angle: Math.PI*0.666, farAngle: Math.PI*1.78,  farR: 0.78, driftSpd: 0.00020 },
  { label: "Researcher #3",color: "#10b981", size: 9,  angle: Math.PI*1.0,   farAngle: Math.PI*1.28,  farR: 0.72, driftSpd: 0.00015 },
  { label: "Critic",       color: "#f97316", size: 10, angle: Math.PI*1.333, farAngle: Math.PI*0.82,  farR: 0.76, driftSpd: 0.00022 },
  { label: "Planner",      color: "#3b82f6", size: 10, angle: Math.PI*1.666, farAngle: Math.PI*1.58,  farR: 0.68, driftSpd: 0.00019 },
];

const CENTER = { color: "#a855f7", size: 14 };
const IDLE_R = 0.36;
const ORBIT  = 0.0005;

const WORDS = [
  "M1","M2","M3","M4","δ","S(t)","α","β","γ","λ",
  "continuity","membrane","governed","attractor","∇","∑","∫","∂",
  "entropy","stability","substrate","feedback","allow","defer","◈","⊕",
  "constitutional","delta","chain","ridge","critic","synthesizer","Δ","∞",
];

export default function GraphPanel({ graph, isRunning }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);

  // ALL state in one ref — read directly in draw(), never stale
  const R = useRef({
    nodes:    null,
    words:    null,
    phase:    "idle",   // idle | out | complete
    gAngle:   0,        // global orbit angle for idle
    awaitA:   1,
    resA:     0,
    synthA:   0,
    tp:       0,
    // track previous prop values to detect transitions
    prevRunning: false,
    prevHasGraph: false,
  });

  useGraph(svgRef, graph);
  const hasGraph = !!(graph?.nodes?.length);

  // Expose current props to the ref every render
  // draw() reads R.current directly so no stale closure
  R.current._isRunning = isRunning;
  R.current._hasGraph  = hasGraph;

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
      const r          = R.current;
      const isRunning  = r._isRunning;
      const hasGraph   = r._hasGraph;

      // ── Phase transitions — detect edge changes ──
      if (isRunning && !r.prevRunning && r.phase === "idle") {
        r.phase = "out";
      }
      if (!isRunning && !hasGraph && r.phase !== "idle") {
        r.phase  = "idle";
        r.nodes  = null;
        r.words  = null;
        r.gAngle = 0;
        r.awaitA = 1;
        r.resA   = 0;
        r.synthA = 0;
      }
      if (hasGraph && !r.prevHasGraph && r.phase === "out") {
        r.phase = "complete";
      }
      r.prevRunning  = isRunning;
      r.prevHasGraph = hasGraph;

      // ── Init nodes ──
      if (!r.nodes) {
        r.nodes = RING_NODES.map(n => ({
          ...n,
          x:      cx + Math.cos(n.angle) * idleR,
          y:      cy + Math.sin(n.angle) * idleR * 0.6,
          targetX: cx + Math.cos(n.farAngle) * n.farR * baseR,
          targetY: cy + Math.sin(n.farAngle) * n.farR * baseR * 0.6,
          orbitPh: n.angle,
        }));
      }

      // ── Init ambient words ──
      if (!r.words) {
        r.words = WORDS.map((w, i) => ({
          w,
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          a: 0.18 + Math.random() * 0.14,
          sz: 10 + Math.random() * 6,
          ph: Math.random() * Math.PI * 2,
          col: ["#3b82f6","#10b981","#a855f7","#f97316","#64748b"][i % 5],
        }));
      }

      ctx.clearRect(0, 0, W, H);
      t++;
      r.tp += 0.018;

      const phase = r.phase;

      // ── Text alpha easing ──
      if (phase === "idle") {
        r.awaitA += (1 - r.awaitA) * 0.03;
        r.resA   += (0 - r.resA)   * 0.03;
        r.synthA += (0 - r.synthA) * 0.03;
      } else if (phase === "out") {
        r.awaitA += (0 - r.awaitA) * 0.04;
        r.resA   += (1 - r.resA)   * 0.04;
        r.synthA += (0 - r.synthA) * 0.03;
      } else if (phase === "complete") {
        r.resA   += (0 - r.resA)   * 0.03;
        r.synthA += (1 - r.synthA) * 0.04;
      }

      // ── Ambient words ──
      r.words.forEach(w => {
        const spd = phase !== "idle" ? 1.5 : 1;
        w.x += w.vx * spd; w.y += w.vy * spd;
        if (w.x < -60) w.x = W+60; if (w.x > W+60) w.x = -60;
        if (w.y < -20)  w.y = H+20; if (w.y > H+20) w.y = -20;
        const alpha = w.a * (0.6 + 0.4 * Math.sin(w.ph + t * 0.012));
        ctx.font = `${w.sz}px 'Space Mono',monospace`;
        ctx.fillStyle = w.col; ctx.globalAlpha = alpha;
        ctx.fillText(w.w, w.x, w.y); ctx.globalAlpha = 1;
      });

      // ── AWAITING RESEARCH ──
      if (r.awaitA > 0.01) {
        const lbl = "AWAITING RESEARCH";
        ctx.font = `800 54px 'Syne',sans-serif`;
        const sc = Math.min(1, (W-80)/ctx.measureText(lbl).width);
        const fs = Math.floor(54*sc);
        ctx.font = `800 ${fs}px 'Syne',sans-serif`;
        ctx.fillStyle = "#334155";
        ctx.globalAlpha = r.awaitA * (0.35 + 0.05*Math.sin(r.tp));
        ctx.textAlign = "center";
        ctx.fillText(lbl, cx, cy + fs*0.35);
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── RESEARCHING... ──
      if (r.resA > 0.01) {
        const lbl = "RESEARCHING...";
        ctx.font = `800 56px 'Syne',sans-serif`;
        const sc = Math.min(1, (W-40)/ctx.measureText(lbl).width);
        const fs = Math.floor(56*sc);
        ctx.font = `800 ${fs}px 'Syne',sans-serif`;
        ctx.shadowColor = "#3b82f6"; ctx.shadowBlur = 28;
        ctx.fillStyle = "#3b82f6";
        ctx.globalAlpha = r.resA * (0.22 + 0.07*Math.sin(r.tp*2));
        ctx.textAlign = "center";
        ctx.fillText(lbl, cx, cy + fs*0.35);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── SYNTHESIS COMPLETE ──
      if (r.synthA > 0.01) {
        const lbl = "SYNTHESIS COMPLETE";
        ctx.font = `800 52px 'Syne',sans-serif`;
        const sc = Math.min(1, (W-40)/ctx.measureText(lbl).width);
        const fs = Math.floor(52*sc);
        ctx.font = `800 ${fs}px 'Syne',sans-serif`;
        ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 32;
        ctx.fillStyle = "#a855f7";
        ctx.globalAlpha = r.synthA * (0.28 + 0.08*Math.sin(r.tp*1.5));
        ctx.textAlign = "center";
        ctx.fillText(lbl, cx, cy + fs*0.35);
        ctx.font = `400 13px 'Space Mono',monospace`;
        ctx.fillStyle = "#a855f7"; ctx.globalAlpha = r.synthA * 0.5;
        ctx.fillText("governed · audited · stable", cx, cy + fs*0.35 + 28);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // ── Center node ──
      const cp = 0.7 + 0.3*Math.sin(t*0.04);
      const cg = ctx.createRadialGradient(cx,cy,0,cx,cy,CENTER.size*4);
      cg.addColorStop(0, CENTER.color+"55"); cg.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(cx,cy,CENTER.size*4,0,Math.PI*2);
      ctx.fillStyle=cg; ctx.globalAlpha=0.6; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,CENTER.size,0,Math.PI*2);
      ctx.strokeStyle=CENTER.color; ctx.lineWidth=2.5;
      ctx.globalAlpha=cp; ctx.stroke();
      ctx.fillStyle=CENTER.color+"33"; ctx.fill(); ctx.globalAlpha=1;

      // ── Global angle ──
      r.gAngle += ORBIT;

      // ── Draw nodes ──
      r.nodes.forEach((n, i) => {
        let tx, ty;

        if (phase === "idle") {
          // Perfect synchronized circle
          const ang = r.gAngle + n.angle;
          tx = cx + Math.cos(ang) * idleR;
          ty = cy + Math.sin(ang) * idleR * 0.6;
          n.x += (tx - n.x) * 0.08;
          n.y += (ty - n.y) * 0.08;
        } else {
          // Float toward fixed target with independent slow orbit
          n.orbitPh += n.driftSpd;
          const fx = Math.cos(n.orbitPh) * 14;
          const fy = Math.sin(n.orbitPh) * 9;
          tx = n.targetX + fx;
          ty = n.targetY + fy;
          // Very slow ease so drift is visible and floaty
          n.x += (tx - n.x) * 0.015;
          n.y += (ty - n.y) * 0.015;
        }

        const pulse = 0.65 + 0.35*Math.sin(t*0.035 + i*1.3);
        const alpha = phase !== "idle" ? 0.75 + 0.25*Math.sin(t*0.02 + i*0.9) : 1;

        // line to center
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(n.x,n.y);
        ctx.strokeStyle=n.color; ctx.lineWidth=0.5;
        ctx.globalAlpha=alpha*0.1; ctx.stroke();

        // glow
        const grd=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.size*4);
        grd.addColorStop(0,n.color+"44"); grd.addColorStop(1,"transparent");
        ctx.beginPath(); ctx.arc(n.x,n.y,n.size*4,0,Math.PI*2);
        ctx.fillStyle=grd; ctx.globalAlpha=alpha*0.7; ctx.fill();

        // outer ring
        ctx.beginPath(); ctx.arc(n.x,n.y,n.size+4,0,Math.PI*2);
        ctx.strokeStyle=n.color; ctx.lineWidth=1;
        ctx.globalAlpha=alpha*pulse*0.3; ctx.stroke();

        // main circle
        ctx.beginPath(); ctx.arc(n.x,n.y,n.size,0,Math.PI*2);
        ctx.strokeStyle=n.color; ctx.lineWidth=2;
        ctx.globalAlpha=alpha*pulse; ctx.stroke();
        ctx.fillStyle=n.color+"22"; ctx.fill();

        // label
        ctx.globalAlpha=alpha*0.9;
        ctx.font="11px 'Syne',monospace";
        ctx.fillStyle=n.color; ctx.textAlign="center";
        ctx.fillText(n.label, n.x, n.y+n.size+14);
        ctx.globalAlpha=1;
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []); // runs once only — draw() reads R.current directly

  return (
    <div ref={containerRef} style={{position:"relative",width:"100%",height:"100%",background:"#07090f",overflow:"hidden"}}>
      <canvas ref={canvasRef} style={{
        position:"absolute",inset:0,width:"100%",height:"100%",
        pointerEvents:"none",
        opacity: hasGraph ? 0 : 1,
        transition:"opacity 0.8s ease",
      }}/>
      <svg ref={svgRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
    </div>
  );
}
