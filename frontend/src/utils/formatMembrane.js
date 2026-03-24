export const MEMBRANE_COLORS = {
  M1_SAFETY:        '#ef4444',
  M2_REVERSIBILITY: '#f59e0b',
  M3_PLURALISM:     '#a855f7',
  M4_HUMAN_PRIMACY: '#06b6d4',
};

export const VERDICT_COLORS = {
  allow: '#10b981',
  block: '#ef4444',
  defer: '#f59e0b',
};

export function membraneShortName(key) {
  return key?.split('_')[0] || key;
}

export function verdictIcon(result) {
  return { allow: '✓', block: '✕', defer: '⚠' }[result] || '?';
}
