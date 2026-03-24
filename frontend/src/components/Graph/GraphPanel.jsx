import React, { useRef, useEffect } from "react";
import { useGraph } from "../../hooks/useGraph";

// The story: CHAOS → ORDER
// Idle: nodes scattered at independent orbits (chaos, unresearched)
// Thinking: nodes converge ONE BY ONE into a perfect circle (governance pulling them)
// Complete: perfect circle holds — order achieved
const RING_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, idleR: 0.78, idlePhase: Math.PI*0.1,  idleSpd: 0.00025, convDelay: 0   },
  { label: "Researcher #1",color: "#10b981", size: 9,  idleR: 0.72, idlePhase: Math.PI*0.55, idleSpd: 0.0003,  convDelay: 40  },
  { label: "Researcher #2",color: "#10b981", size: 9,  idleR: 0.75, idlePhase: Math.PI*1.85, idleSpd: 0.00028, convDelay: 80  },
  { label: "Researcher #3",color: "#10b981", size: 9,  idleR: 0.68, idlePhase: Math.PI*1.35, idleSpd: 0.00022, convDelay: 120 },
  { label: "Critic",       color: "#f97316", size: 10, idleR: 0.74, idlePhase: Math.PI*0.85, idleSpd: 0.00030, convDelay: 160 },
  { label: "Planner",      color: "#3b82f6", size: 10, idleR: 0.30, idlePhase: Math.PI*1.55, idleSpd: 0.0005,  convDelay: 200 },
];

// Perfect circle config — equally spaced
const CIRCLE_R = 0.38; // fraction of baseR
const ORBIT_SPEED = 0.0005;

const CENTER_NODE = { label: "Synthesizer", color: "#a855f7", size: 14 };

const AMBIENT_WORDS = [
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
  const nodesRef     = useRef(null);
  const ambientRef   = useRef(null);
  const stateRef     = useRef("idle");
  const thinkFrame   = useRef(0); // counts frames since thinking started
  const globalAngle  = useRef(0);
  const awaitAlpha   = useRef(1);
  const resAlpha     = useRef(0);
  const synthAlpha   = useRef(0);
  const textPhase    = useRef(0);

  const hasGraph = !!(graph?.nodes?.length);
  useGraph(svgRef, graph);

  useEffect(() => {
    if (isRunning && stateRef.current === "idle") {
      stateRef.current = "thinking";
      thinkFrame.current = 0;
    }
    if (!isRunning && !hasGraph) {
      stateRef.current = "idle";
      nodesRef.current = null;
      ambientRef.current = null;
      awaitAlpha.current = 1;
      resAlpha.current   = 0;
      synthAlpha.current = 0;
      thinkFrame.current = 0;
      globalAngle.current = 0;
    }
    if (hasGraph && stateRef.current === "thinking") stateRef.current = "complete";
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
    const circleR = CIRCLE_R * baseR;

    let t = 0;

    function draw() {
      if (!nodesRef.current) {
        nodesRef.current = RING_NODES.map((n, i) => {
          const r = n.idleR * baseR;
          // Perfect circle target angle — evenly spaced
          const circleAngle = (i / RING_NODES.length) * Math.PI * 2;
          return {
            ...n,
            phase:       n.idlePhase,
            currentR:    r,
            x: cx + Math.cos(n.idlePhase) * r,
            y: cy + Math.sin(n.idlePhase) * r * 0.6,
            circleAngle, // where they go on the perfect circle
            converged:   0, // 0→1 lerp progress
          };
        });
      }

      if (!ambientRef.current) {
        ambientRef.current = AMBIENT_WORDS.map((word, i) => ({
          word, x: Math.random()*W, y: Math.random()*H,
          vx: (Math.random()-0.5)*0.28, vy: (Math.random()-0.5)*0.28,
          baseAlpha: 0.20 + Math.random()*0.15,
          size: 10+Math.random()*6, phase: Math.random()*Math.PI*2,
          color: ["#3b82f6","#10b981","#a855f7","#f97316","#64748b"][i%5],
        }));
      }

      ctx.clearRect(0, 0, W, H);
      t++;
      textPhase.current += 0.018;
      const state = stateRef.current;
      if (state === "thinking") thinkFrame.current++;

      // Text alpha
      if (state === "idle") {
        awaitAlpha.current = Math.min(1, awaitAlpha.current + 0.02);
        resAlpha.current   = Math.max(0, resAlpha.current   - 0.02);
        synthAlpha.current = Math.max(0, synthAlpha.current - 0.02);
      } else if (state === "thinking") {
        awaitAlpha.current = Math.max(0, awaitAlpha.current - 0.025);
        resAlpha.current   = Math.min(1, resAlpha.current   + 0.025);
        synthAlpha.current = Math.max(0, synthAlpha.current - 0.02);
      } else if (state === "complete") {
        resAlpha.current   = Math.max(0, resAlpha.current   - 0.02);
        synthAlpha.current = Math.min(1, synthAlpha.current + 0.025);
        awaitAlpha.current = Math.max(0, awaitAlpha.current - 0.02);
      }

      // Ambient words
      ambientRef.current.forEach(w => {
        w.x += w.vx*(state!=="idle"?1.3:1); w.y += w.vy*(state!=="idle"?1.3:1);
        if(w.x<-60) w.x=W+60; if(w.x>W+60) w.x=-60;
        if(w.y<-20)  w.y=H+20; if(w.y>H+20) w.y=-20;
        const a = w.baseAlpha*(0.6+0.4*Math.sin(w.phase+t*0.012));
        ctx.font=`${w.size}px 'Space Mono',monospace`;
        ctx.fillStyle=w.color; ctx.globalAlpha=a;
        ctx.fillText(w.word,w.x,w.y); ctx.globalAlpha=1;
      });

      // AWAITING RESEARCH
      if (awaitAlpha.current > 0.01) {
        const lbl = "AWAITING RESEARCH";
        ctx.font=`800 54px 'Syne',sans-serif`;
        const sc=Math.min(1,(W-80)/ctx.measureText(lbl).width);
        const fs=Math.floor(54*sc);
        ctx.font=`800 ${fs}px 'Syne',sans-serif`;
        ctx.fillStyle="#1e2a3a";
        ctx.globalAlpha=awaitAlpha.current*(0.55+0.08*Math.sin(textPhase.current));
        ctx.textAlign="center"; ctx.fillText(lbl,cx,cy+fs*0.35);
        ctx.globalAlpha=1; ctx.textAlign="left";
      }

      // RESEARCHING...
      if (resAlpha.current > 0.01) {
        const lbl = "RESEARCHING...";
        ctx.font=`800 56px 'Syne',sans-serif`;
        const sc=Math.min(1,(W-40)/ctx.measureText(lbl).width);
        const fs=Math.floor(56*sc);
        ctx.font=`800 ${fs}px 'Syne',sans-serif`;
        ctx.shadowColor="#3b82f6"; ctx.shadowBlur=28;
        ctx.fillStyle="#3b82f6";
        ctx.globalAlpha=resAlpha.current*(0.22+0.07*Math.sin(textPhase.current*2));
        ctx.textAlign="center"; ctx.fillText(lbl,cx,cy+fs*0.35);
        ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.textAlign="left";
      }

      // SYNTHESIS COMPLETE
      if (synthAlpha.current > 0.01) {
        const lbl = "SYNTHESIS COMPLETE";
        ctx.font=`800 52px 'Syne',sans-serif`;
        const sc=Math.min(1,(W-40)/ctx.measureText(lbl).width);
        const fs=Math.floor(52*sc);
        ctx.font=`800 ${fs}px 'Syne',sans-serif`;
        ctx.shadowColor="#a855f7"; ctx.shadowBlur=32;
        ctx.fillStyle="#a855f7";
        ctx.globalAlpha=synthAlpha.current*(0.28+0.08*Math.sin(textPhase.current*1.5));
        ctx.textAlign="center"; ctx.fillText(lbl,cx,cy+fs*0.35);
        ctx.font=`400 13px 'Space Mono',monospace`;
        ctx.fillStyle="#a855f7"; ctx.globalAlpha=synthAlpha.current*0.5;
        ctx.fillText("governed · audited · stable",cx,cy+fs*0.35+28);
        ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.textAlign="left";
      }

      // Center Synthesizer
      const cp=0.7+0.3*Math.sin(t*0.04);
      const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,CENTER_NODE.size*4);
      cg.addColorStop(0,CENTER_NODE.color+"55"); cg.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(cx,cy,CENTER_NODE.size*4,0,Math.PI*2);
      ctx.fillStyle=cg; ctx.globalAlpha=0.6; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,CENTER_NODE.size,0,Math.PI*2);
      ctx.strokeStyle=CENTER_NODE.color; ctx.lineWidth=2.5;
      ctx.globalAlpha=cp; ctx.stroke();
      ctx.fillStyle=CENTER_NODE.color+"33"; ctx.fill();
      ctx.globalAlpha=0.7; ctx.font="11px 'Syne',monospace";
      ctx.fillStyle=CENTER_NODE.color; ctx.textAlign="center";
      ctx.fillText(CENTER_NODE.label,cx,cy+CENTER_NODE.size+14);
      ctx.globalAlpha=1;

      // Global angle for circle orbit
      globalAngle.current += ORBIT_SPEED;

      // Draw nodes
      nodesRef.current.forEach((node, i) => {
        let tx, ty;

        if (state === "idle") {
          // Chaos: each node orbits independently
          node.phase += node.idleSpd;
          tx = cx + Math.cos(node.phase) * node.currentR;
          ty = cy + Math.sin(node.phase) * node.currentR * 0.55;
          node.converged = 0; // reset convergence

        } else if (state === "thinking") {
          // Governance pulls them in ONE BY ONE based on convDelay
          const framesSinceStart = thinkFrame.current;
          if (framesSinceStart > node.convDelay) {
            // This node has been "called" — ease toward circle position
            node.converged = Math.min(1, node.converged + 0.012);
          }
          // Still orbit independently while waiting to be called
          node.phase += node.idleSpd * (1 - node.converged * 0.8);

          // Chaos position
          const chaosX = cx + Math.cos(node.phase) * node.currentR;
          const chaosY = cy + Math.sin(node.phase) * node.currentR * 0.55;

          // Perfect circle target
          const circAng = globalAngle.current + node.circleAngle;
          const orderX  = cx + Math.cos(circAng) * circleR;
          const orderY  = cy + Math.sin(circAng) * circleR * 0.6;

          // Lerp between chaos and order
          tx = chaosX + (orderX - chaosX) * node.converged;
          ty = chaosY + (orderY - chaosY) * node.converged;

        } else {
          // Complete / idle after: stay on circle
          node.converged = Math.min(1, node.converged + 0.02);
          const circAng = globalAngle.current + node.circleAngle;
          tx = cx + Math.cos(circAng) * circleR;
          ty = cy + Math.sin(circAng) * circleR * 0.6;
        }

        node.x += (tx - node.x) * 0.10;
        node.y += (ty - node.y) * 0.10;

        const pulse = 0.65+0.35*Math.sin(t*0.035+i*1.05);
        // Nodes glow brighter as they converge
        const alpha = state === "thinking"
          ? 0.6 + 0.4*node.converged + 0.1*Math.sin(t*0.02+i*0.8) : 1;

        // Line to center
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(node.x,node.y);
        ctx.strokeStyle=node.color; ctx.lineWidth=0.5;
        ctx.globalAlpha=alpha*0.12; ctx.stroke();

        // Glow — bigger when converged
        const glowR = node.size*(3+node.converged*2);
        const grd=ctx.createRadialGradient(node.x,node.y,0,node.x,node.y,glowR);
        grd.addColorStop(0,node.color+"55"); grd.addColorStop(1,"transparent");
        ctx.beginPath(); ctx.arc(node.x,node.y,glowR,0,Math.PI*2);
        ctx.fillStyle=grd; ctx.globalAlpha=alpha*0.7; ctx.fill();

        ctx.beginPath(); ctx.arc(node.x,node.y,node.size+4,0,Math.PI*2);
        ctx.strokeStyle=node.color; ctx.lineWidth=1;
        ctx.globalAlpha=alpha*pulse*0.3; ctx.stroke();

        ctx.beginPath(); ctx.arc(node.x,node.y,node.size,0,Math.PI*2);
        ctx.strokeStyle=node.color; ctx.lineWidth=2;
        ctx.globalAlpha=alpha*pulse; ctx.stroke();
        ctx.fillStyle=node.color+"22"; ctx.fill();

        ctx.globalAlpha=alpha*0.9;
        ctx.font="11px 'Syne',monospace";
        ctx.fillStyle=node.color; ctx.textAlign="center";
        ctx.fillText(node.label,node.x,node.y+node.size+14);
        ctx.globalAlpha=1;
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

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
