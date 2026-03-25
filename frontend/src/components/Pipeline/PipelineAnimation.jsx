import React from "react";

const STATUS_COLOR = {
  idle: "#334155",
  running: "#3b82f6",
  done: "#10b981",
  blocked: "#ef4444",
  deferred: "#f59e0b",
};

export default function Pipeline({ agents }) {
  const safe = agents || {};

  const order = [
    "planner",
    "researcher_1",
    "researcher_2",
    "researcher_3",
    "critic",
    "synthesizer",
  ];

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
        Pipeline
      </div>

      {order.map((id) => {
        const ag = safe[id] || {};
        const color = STATUS_COLOR[ag.status] || "#334155";

        return (
          <div
            key={id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 6px",
              borderRadius: 4,
              marginBottom: 2,
              background:
                ag.status === "running"
                  ? "rgba(59,130,246,.07)"
                  : "transparent",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
                animation:
                  ag.status === "running" ? "pulse 1s infinite" : "none",
              }}
            />

            <span
              style={{
                fontSize: 10,
                flex: 1,
                color,
                fontFamily: "Space Mono",
              }}
            >
              {id.replace(/_/g, " ")}
            </span>

            <span
              style={{
                fontSize: 8,
                color,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {ag.status === "done" ? "✓" : ag.status || "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
