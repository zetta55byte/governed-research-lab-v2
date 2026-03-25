import { motionConfig } from "./motionConfig"

export function computeNodePosition() {
  return {
    x: Math.random() * 600,
    y: Math.random() * 400,
  }
}

export function getNodeStyle(phase, node) {
  const base = {
    left: node.x,
    top: node.y,
    transition: "all 0.8s ease",
  }

  switch (phase) {
    case "idle":
      return { ...base, opacity: 0.6, transform: "scale(1)" }

    case "burst":
      return { ...base, opacity: 1, transform: "scale(1.4)" }

    case "drift":
      return { ...base, opacity: 0.8, transform: "translateY(-4px)" }

    case "converge":
      return { ...base, opacity: 1, transform: "scale(0.9)" }

    case "complete":
      return { ...base, opacity: 1, transform: "scale(1)" }

    default:
      return base
  }
}