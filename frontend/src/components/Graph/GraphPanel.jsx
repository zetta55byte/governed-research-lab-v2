import React, { useRef, useEffect, useState } from "react";
import { useGraph } from "../../hooks/useGraph";

const RING_NODES = [
  { label: "Human",        color: "#f59e0b", size: 10, idleR: 0.78, idlePhase: Math.PI*0.1,  idleSpd: 0.00025, convDelay: 0   },
  { label: "Researcher #1",color: "#10b981", size: 9,  idleR: 0.72, idlePhase: Math.PI*0.55, idleSpd: 0.0003,  convDelay: 50  },
  { label: "Researcher #2",color: "#10b981", size: 9,  idleR: 0.75, idlePhase: Math.PI*1.85, idleSpd: 0.00028, convDelay: 100 },
  { label: "Researcher #3",color: "#10b981", size: 9,  idleR: 0.68, idlePhase: Math.PI*1.35, idleSpd: 0.00022, convDelay: 150 },
  { label: "Critic",       color: "#f97316", size: 10, idleR: 0.74, idlePhase: Math.PI*0.85, idleSpd: 0.00030, convDelay: 200 },
  { label: "Planner",      color: "#3b82f6", size: 10, idleR: 0.30, idlePhase: Math.PI*1.55, idleSpd: 0.0005,  convDelay: 250 },
];

const CIRCLE_R  = 0.38;
const ORBIT_SPD = 0.0005;
const CENTER    = { label: "Synthesizer", color: "#a855f7", size: 14 };
const AMBIENT_WORDS = [
  "M1","M2","M3","M4","δ","S(t)","α","β","γ","λ",
  "continuity","membrane","governed","attractor","∇","∑","∫","∂",
  "entropy","stability","substrate","feedback","allow","defer","◈","⊕",
  "constitutional","delta","chain","ridge","critic","synthesizer","Δ","∞",
];

export default function GraphPanel({ graph, isRunning, runComplete }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);
  const nodesRef     = useRef(null);
  const ambientRef   = useRef(null);
  const stateRef     = useRef("idle");
  const thinkFrame   = useRef(0);
  const globalAngle  = useRef(0);
  const awaitAlpha   = useRef(1);
  const textPhase    = useRef(0);
  const prevRunning  = useRef(false);
  const prevComplete = useRef(false);

  const [showSynth,       setShowSynth]       = useState(false);
  const [showResearching, setShowResearching] = useState(false);

  const hasGraph = !!(graph?.nodes?.length);
  useGraph(svgRef, graph);

  useEffect(() => {
    const wasRunning  = prevRunning.current;
    const wasComplete = prevComplete.current;
    prevRunning.current  = isRunning;
    prevComplete.current = runComplete;

    if (isRunning && !wasRunning) {
      stateRef.current = "thinking";
      thinkFrame.current = 0;
      setShowSynth(false);
      setShowResearching(true);
    }

    if (runComplete && !wasComplete) {
      stateRef.current = "complete";
      setShowResearching(false);
      setTimeout(() => setShowSynth(true), 800);
    }

    if (!isRunning && !runComplete && !hasGraph && stateRef.current !== "complete") {
      stateRef.current  = "idle";
      nodesRef.current  = null;
      ambientRef.current = null;
      awaitAlpha.current = 1;
      thinkFrame.current = 0;
      globalAngle.current = 0;
      setShowSynth(false);
      setShowResearching(false);
    }
  }, [isRunning, runComplete, hasGraph]);

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth  || 1000;
    const H = container.clientHeight || 600;
    canvas.width  = W;
    canvas.height = H;

    const ctx    = canvas.getContext("2d");
    const cx     = W / 2;
    const cy     = H / 2;
    const baseR  = Math.min(W, H) / 2;
    const circleR = CIRCLE_R * baseR;
    let t = 0;

    function draw() {
      if (!nodesRef.current) {
        nodesRef.current = RING_NODES.map((n, i) => {
          const r = n.idleR * baseR;
          return { ...n, phase: n.idlePhase, currentR: r,
            x: cx + Math.cos(n.idlePhase) * r,
            y: cy + Math.sin(n.idlePhase) * r * 0.6,
            circleAngle: (i / RING_NODES.length) * Math.PI * 2,
            converged: 0 };
        });
      }
      if (!ambientRef.current) {
        ambientRef.current = AMBIENT_WORDS.map((word, i) => ({
          word, x: Math.random()*W, y: Math.random()*H,
          vx: (Math.random()-0.5)*0.28, vy: (Math.random()-0.5)*0.28,
          baseAlpha: 0.20+Math.random()*0.15, size: 10+Math.random()*6,
          phase: Math.random()*Math.PI*2,
          color: ["#3b82f6","#10b981","#a855f7","#f97316","#64748b"][i%5],
        }));
      }

      ctx.clearRect(0, 0, W, H);
      t++;
      textPhase.current += 0.018;
      const state = stateRef.current;
      if (state === "thinking") thinkFrame.current++;

      // awaitAlpha: visible when idle, fades when thinking/complete
      if (state === "idle") {
        awaitAlpha.current = Math.min(1, awaitAlpha.current + 0.02);
      } else {
        awaitAlpha.current = Math.max(0, awaitAlpha.current - 0.025);
      }

      // Ambient words
      ambientRef.current.forEach(w => {
        w.x += w.vx*(state!=="idle"?1.3:1);
        w.y += w.vy*(state!=="idle"?1.3:1);
        if(w.x<-60) w.x=W+60; if(w.x>W+60) w.x=-60;
        if(w.y<-20) w.y=H+20; if(w.y>H+20) w.y=-20;
        const a = w.baseAlpha*(0.6+0.4*Math.sin(w.phase+t*0.012));
        ctx.font=`${w.size}px 'Space Mono',monospace`;
        ctx.fillStyle=w.color; ctx.globalAlpha=a;
        ctx.fillText(w.word,w.x,w.y); ctx.globalAlpha=1;
      });

      // AWAITING RESEARCH text
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

      // Center Synthesizer
      const cp=0.7+0.3*Math.sin(t*0.04);
      const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,CENTER.size*4);
      cg.addColorStop(0,CENTER.color+"55"); cg.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(cx,cy,CENTER.size*4,0,Math.PI*2);
      ctx.fillStyle=cg; ctx.globalAlpha=0.6; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,CENTER.size,0,Math.PI*2);
      ctx.strokeStyle=CENTER.color; ctx.lineWidth=2.5; ctx.globalAlpha=cp; ctx.stroke();
      ctx.fillStyle=CENTER.color+"33"; ctx.fill();
      ctx.globalAlpha=0.7; ctx.font="11px 'Syne',monospace";
      ctx.fillStyle=CENTER.color; ctx.textAlign="center";
      ctx.fillText(CENTER.label,cx,cy+CENTER.size+14); ctx.globalAlpha=1;
      globalAngle.current += ORBIT_SPD;

      // Nodes
      nodesRef.current.forEach((node, i) => {
        let tx, ty;
        if (state === "idle") {
          node.phase += node.idleSpd;
          tx = cx + Math.cos(node.phase)*node.currentR;
          ty = cy + Math.sin(node.phase)*node.currentR*0.55;
          node.converged = 0;
        } else if (state === "thinking") {
          if (thinkFrame.current > node.convDelay) {
            node.converged = Math.min(1, node.converged + 0.008);
          }
          node.phase += node.idleSpd*(1 - node.converged*0.8);
          const chaosX = cx + Math.cos(node.phase)*node.currentR;
          const chaosY = cy + Math.sin(node.phase)*node.currentR*0.55;
          const circAng = globalAngle.current + node.circleAngle;
          const orderX  = cx + Math.cos(circAng)*circleR;
          const orderY  = cy + Math.sin(circAng)*circleR*0.6;
          tx = chaosX + (orderX-chaosX)*node.converged;
          ty = chaosY + (orderY-chaosY)*node.converged;
        } else {
          node.converged = Math.min(1, node.converged + 0.02);
          const circAng = globalAngle.current + node.circleAngle;
          tx = cx + Math.cos(circAng)*circleR;
          ty = cy + Math.sin(circAng)*circleR*0.6;
        }
        node.x += (tx-node.x)*0.10;
        node.y += (ty-node.y)*0.10;

        const pulse = 0.65+0.35*Math.sin(t*0.035+i*1.05);
        const alpha = state==="thinking" ? 0.6+0.4*node.converged+0.1*Math.sin(t*0.02+i*0.8) : 1;

        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(node.x,node.y);
        ctx.strokeStyle=node.color; ctx.lineWidth=0.5; ctx.globalAlpha=alpha*0.12; ctx.stroke();

        const glowR=node.size*(3+node.converged*2);
        const grd=ctx.createRadialGradient(node.x,node.y,0,node.x,node.y,glowR);
        grd.addColorStop(0,node.color+"55"); grd.addColorStop(1,"transparent");
        ctx.beginPath(); ctx.arc(node.x,node.y,glowR,0,Math.PI*2);
        ctx.fillStyle=grd; ctx.globalAlpha=alpha*0.7; ctx.fill();

        ctx.beginPath(); ctx.arc(node.x,node.y,node.size+4,0,Math.PI*2);
        ctx.strokeStyle=node.color; ctx.lineWidth=1; ctx.globalAlpha=alpha*pulse*0.3; ctx.stroke();

        ctx.beginPath(); ctx.arc(node.x,node.y,node.size,0,Math.PI*2);
        ctx.strokeStyle=node.color; ctx.lineWidth=2; ctx.globalAlpha=alpha*pulse; ctx.stroke();
        ctx.fillStyle=node.color+"22"; ctx.fill();

        ctx.globalAlpha=alpha*0.9; ctx.font="11px 'Syne',monospace";
        ctx.fillStyle=node.color; ctx.textAlign="center";
        ctx.fillText(node.label,node.x,node.y+node.size+14); ctx.globalAlpha=1;
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

      {/* RESEARCHING overlay — stays visible entire run */}
      {showResearching && !showSynth && (
        <div style={{
          position:"absolute",inset:0,pointerEvents:"none",
          display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:5,
        }}>
          <div style={{
            fontFamily:"'Syne',sans-serif",fontWeight:800,
            fontSize:"clamp(28px,4vw,52px)",
            color:"#3b82f6",textAlign:"center",
            textShadow:"0 0 40px #3b82f6,0 0 80px #3b82f655",
            letterSpacing:2,opacity:0.25,
          }}>
            RESEARCHING...
          </div>
        </div>
      )}

      {/* SYNTHESIS COMPLETE — only on final_output */}
      {showSynth && (
        <div style={{
          position:"absolute",inset:0,pointerEvents:"none",
          display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",
          zIndex:10,animation:"synthFadeIn 0.8s ease forwards",
        }}>
          <div style={{
            fontFamily:"'Syne',sans-serif",fontWeight:800,
            fontSize:"clamp(28px,4vw,52px)",
            color:"#a855f7",textAlign:"center",
            textShadow:"0 0 40px #a855f7,0 0 80px #a855f755",
            letterSpacing:2,animation:"synthPulse 2s ease-in-out infinite",
          }}>
            SYNTHESIS COMPLETE
          </div>
          <div style={{
            marginTop:12,fontFamily:"'Space Mono',monospace",
            fontSize:13,color:"#a855f799",letterSpacing:4,textTransform:"uppercase",
          }}>
            governed · audited · stable
          </div>
          <style>{`
            @keyframes synthFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
            @keyframes synthPulse { 0%,100%{text-shadow:0 0 40px #a855f7,0 0 80px #a855f755} 50%{text-shadow:0 0 60px #a855f7,0 0 120px #a855f799} }
          `}</style>
        </div>
      )}
    </div>
  );
}
