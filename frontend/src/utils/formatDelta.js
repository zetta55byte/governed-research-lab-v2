export function formatDeltaId(id) {
  return id ? `Δ${id.slice(-6)}` : 'Δ?';
}

export function formatTimestamp(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString('en', { hour12: false });
}

export function getDeltaBorderColor(verdict) {
  return { allow: '#10b981', block: '#ef4444', defer: '#f59e0b' }[verdict] || '#334155';
}
