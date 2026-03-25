import { useMemo } from "react"
import { agentNarrative } from "./agentNarrative"
import { narrativeConfig } from "./narrativeConfig"

function bucketEntropy(entropy) {
  if (entropy == null) return "medium"
  if (entropy < 0.33) return "low"
  if (entropy < 0.66) return "medium"
  return "high"
}

export function useAgentNarrative(agent, phase, entropy) {
  const bucket = bucketEntropy(entropy)

  return useMemo(() => {
    const agentCfg = agentNarrative[agent] || null
    const phaseCfg = narrativeConfig[phase] || null

    const agentSeq =
      agentCfg?.sequence?.[bucket] ||
      agentCfg?.sequence?.medium ||
      []

    const phaseSeq =
      phaseCfg?.sequence?.[bucket] ||
      phaseCfg?.sequence?.medium ||
      []

    return {
      voice: agentCfg?.voice || "neutral",
      tone: agentCfg?.tone || "default",
      sequence: [...phaseSeq, ...agentSeq],
    }
  }, [agent, phase, entropy])
}