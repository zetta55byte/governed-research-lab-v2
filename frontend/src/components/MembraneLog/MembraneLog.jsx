import React, { useRef, useEffect } from "react";

export default function MembraneLog({ logs }) {
  const safe = Array.isArray(logs) ? logs : [];
  const endRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [safe.length]);

  return (
    <div
      style={{
        fontSize: 12,
        fontFamily: "Space Grotesk, system-ui",
        overflowY: "auto",
        padding: "6px 8px",
        height: "100%",
      }}
    >
      {safe.slice(-80).map((entry, i) => (
        <div key={i} style={{ marginBottom: 4, opacity: 0.85 }}>
          {typeof entry === "string" ? entry : `${entry.membrane || ""} ${entry.result || ""} ${entry.agent_id || ""}: ${entry.reason || ""}`}
        </div>
      ))}

      <div ref={endRef} />
    </div>
  );
}
