export function stabilityColor(score) {
  if (score > 0.8) return '#10b981';
  if (score > 0.5) return '#f59e0b';
  return '#ef4444';
}

export function stabilityLabel(score) {
  if (score > 0.8) return 'Stable';
  if (score > 0.5) return 'Moderate';
  return 'Unstable';
}
