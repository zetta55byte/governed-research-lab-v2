import React from "react";

export default function DeltaCard({ delta }) {
  if (!delta) return null;

  const contested = delta.contested_by?.length > 0;

  const stability = typeof delta.stability_after === "number"
    ? delta.stability_after.toFixed(2)
    : "—";

  return (
    <div
      style={{
        padding: "6px 8px",
        borderRadius: 6,
        background: contested
          ? "rgba(168,85,247,.08)"
          : "rgba(255,255,255,.03)",
        borderLeft: contested
          ? "2px solid #a855f7"
          : "2px solid #3b82f6",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#64748b",
          fontFamily: "Space Mono",
          marginBottom: 2,
        }}
      >
        Δ {delta.agent_id}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "#e2e8f0",
          marginBottom: contested ? 4 : 0,
        }}
      >
        {delta.description}
      </div>

      {contested && (
        <div
          style={{
            fontSize: 10,
            color: "#a855f7",
            fontFamily: "Space Mono",
          }}
        >
          Contested by: {delta.contested_by.join(", ")}
        </div>
      )}

      <div
        style={{
          fontSize: 10,
          color: "#64748b",
          fontFamily: "Space Mono",
          marginTop: 4,
        }}
      >
        Stability → {stability}
      </div>
    </div>
  );
}
