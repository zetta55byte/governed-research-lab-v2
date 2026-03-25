import React, { useRef, useEffect } from "react";

export default function StabilityPanel({ stability }) {
  const safe = Array.isArray(stability) ? stability : [];
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || safe.length < 2) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();

    safe.forEach((v, i) => {
      const x = (i / (safe.length - 1)) * w;
      const y = h - v * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });

    ctx.stroke();
  }, [safe]);

  return (
    <div
      style={{
        padding: "10px 12px",
        borderBottom: "1px solid #1e2a3a",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "#334155",
          letterSpacing: 2,
          textTransform: "uppercase",
          fontFamily: "Syne",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        Stability
      </div>

      <canvas
        ref={canvasRef}
        width={260}
        height={60}
        style={{
          width: "100%",
          height: 60,
          background: "#131929",
          borderRadius: 6,
          border: "1px solid #1e2a3a",
        }}
      />

      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          color: "#64748b",
          fontFamily: "Space Mono",
        }}
      >
        Latest: {safe.length ? safe[safe.length - 1].toFixed(2) : "—"}
      </div>
    </div>
  );
}
