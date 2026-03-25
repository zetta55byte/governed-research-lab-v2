import { useMemo } from "react"

export function useGraphStory(data) {
  const nodes = data?.nodes || []
  const edges = data?.edges || []

  // v22: showD3 only when graph is large enough
  const showD3 = nodes.length > 40

  // v22: derive a simple internal phase if needed
  const phase = data?.phase || "idle"

  return {
    phase,
    nodes,
    edges,
    showD3,
  }
}
