import React from "react";

export default function Header({ sessionId, stability }) {
  const latest = Array.isArray(stability) && stability.length
    ? stability[stability.length - 1]
    : null;

  const formatted = typeof latest === "number"
    ? latest.toFixed(2)
    : "—";

  return (
    <div
      style={{
        padding: "10px 12px",
        borderBottom: "1px solid #1e2a3a",
        background: "#0d111a",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "Syne",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1,
          color: "#e2e8f0",
        }}
      >
        Governed Research Lab v2
      </div>

      <div
        style={{
          fontFamily: "Space Mono",
          fontSize: 11,
          color: "#64748b",
        }}
      >
        Stability: {formatted}
      </div>

      <div
        style={{
          fontFamily: "Space Mono",
          fontSize: 11,
          color: "#334155",
        }}
      >
        {sessionId ? `Session ${sessionId.slice(0, 6)}` : "—"}
      </div>
    </div>
  );
}
