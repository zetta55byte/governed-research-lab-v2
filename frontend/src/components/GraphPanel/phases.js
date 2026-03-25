export const PHASES = {
  IDLE: "idle",
  BURST: "burst",
  DRIFT: "drift",
  CONVERGE: "converge",
  COMPLETE: "complete",
}

export const PHASE_SEQUENCE = [
  PHASES.IDLE,
  PHASES.BURST,
  PHASES.DRIFT,
  PHASES.CONVERGE,
  PHASES.COMPLETE,
]

export function nextPhase(current) {
  const idx = PHASE_SEQUENCE.indexOf(current)
  return PHASE_SEQUENCE[(idx + 1) % PHASE_SEQUENCE.length]
}