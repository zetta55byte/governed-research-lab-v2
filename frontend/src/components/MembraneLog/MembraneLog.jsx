import React from "react";

const BADGE_COLORS = {
  ALLOW:  { bg: "#052e16", text: "#10b981", border: "#166534" },
  BLOCK:  { bg: "#2d0a0a", text: "#ef4444", border: "#7f1d1d" },
  DEFER:  { bg: "#1c1a05", text: "#eab308", border: "#713f12" },
  AUDIT:  { bg: "#0f0a2e", text: "#a855f7", border: "#4c1d95" },
  FLAG:   { bg: "#1a0f05", text: "#f97316", border: "#7c2d12" },
};

function Badge({ type }) {
  const style = BADGE_COLORS[type] || BADGE_COLORS.AUDIT;
  return (
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: 1,
      color: style.text,
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: 2,
      padding: "1px 4px",
      flexShrink: 0,
    }}>
      {type}
    </span>
  );
}

export default function MembraneLog({ logs = [] }) {
  const label = {
    fontFamily: "'Space Mono', monospace",
    fontSize: 9,
    color: "#334155",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={label}>Membrane Log</div>
      {logs.length === 0 && (
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: "#1e2a3a",
          padding: "8px 0",
        }}>
          — awaiting events —
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
        {logs.map((entry, i) => {
          // Support both string logs and object logs
          const type   = entry?.type   || (typeof entry === "string" && entry.includes("BLOCK") ? "BLOCK" : "ALLOW");
          const agent  = entry?.agent  || entry?.label || "";
          const note   = entry?.note   || entry?.message || "";
          const ts     = entry?.ts     || "";

          return (
            <div key={i} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 5,
              padding: "3px 0",
              borderBottom: "1px solid #0a1220",
              animation: "fadeIn 0.25s ease",
            }}>
              <Badge type={type} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: "#64748b",
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {agent}
                </span>
                {note && (
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    color: "#334155",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {note}
                  </span>
                )}
              </div>
              {ts && (
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 8,
                  color: "#1e3a3a",
                  flexShrink: 0,
                }}>
                  {ts}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}