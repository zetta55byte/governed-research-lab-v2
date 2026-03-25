import React, { useRef, useEffect } from "react";

export default function ContinuityChain({ chain }) {
  const safe = Array.isArray(chain) ? chain : [];
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [safe.length]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "6px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {safe.map((entry, i) => {
        const contested = entry.contested_by?.length > 0;

        return (
          <div
            key={i}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              background: contested
                ? "rgba(168,85,247,.08)"
                : "rgba(255,255,255,.03)",
              borderLeft: contested
                ? "2px solid #a855f7"
                : "2px solid #3b82f6",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                marginBottom: 2,
                fontFamily: "Space Mono",
              }}
            >
              Δ {entry.agent_id}
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#e2e8f0",
                marginBottom: contested ? 4 : 0,
              }}
            >
              {entry.description}
            </div>

            {contested && (
              <div
                style={{
                  fontSize: 10,
                  color: "#a855f7",
                  fontFamily: "Space Mono",
                }}
              >
                Contested by: {entry.contested_by.join(", ")}
              </div>
            )}
          </div>
        );
      })}

      {!safe.length && (
        <div
          style={{
            color: "#334155",
            fontSize: 11,
            textAlign: "center",
            padding: 16,
          }}
        >
          No deltas yet
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
