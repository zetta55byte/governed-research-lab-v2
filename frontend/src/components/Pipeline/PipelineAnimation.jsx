import React, { useEffect, useState } from 'react';

const STEPS = [
  { id: 'planner',      label: 'Plan',      icon: '◎', role: 'planner' },
  { id: 'researcher',   label: 'Research',  icon: '⊕', role: 'research' },
  { id: 'critic',       label: 'Critique',  icon: '⊘', role: 'critic' },
  { id: 'synthesizer',  label: 'Synthesize',icon: '◈', role: 'synthesizer' },
  { id: 'human',        label: 'Human',     icon: '◉', role: 'human' },
];

const ROLE_COLORS = {
  planner:     '#3b82f6',
  research:    '#10b981',
  critic:      '#f97316',
  synthesizer: '#a855f7',
  human:       '#f59e0b',
};

export default function PipelineAnimation({ agents, status }) {
  const [activeStep, setActiveStep] = useState(-1);

  // Derive active step from agent statuses
  useEffect(() => {
    const runningAgent = Object.entries(agents).find(([, a]) => a.status === 'running');
    if (!runningAgent) {
      if (status === 'complete') setActiveStep(5);
      else setActiveStep(-1);
      return;
    }
    const id = runningAgent[0];
    if (id === 'planner')      setActiveStep(0);
    else if (id.startsWith('researcher')) setActiveStep(1);
    else if (id === 'critic')  setActiveStep(2);
    else if (id === 'synthesizer') setActiveStep(3);
    else setActiveStep(-1);
  }, [agents, status]);

  const allDone = status === 'complete';

  return (
    <div style={{
      padding: '10px 12px', borderBottom: '1px solid #1e2a3a',
      background: '#0a0d16',
    }}>
      <div style={{ fontSize: 9, color: '#334155', letterSpacing: 2,
        textTransform: 'uppercase', fontFamily: 'Syne', fontWeight: 700, marginBottom: 8 }}>
        Research Pipeline
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, i) => {
          const agentStatus = step.id === 'researcher'
            ? (Object.entries(agents).find(([k]) => k.startsWith('researcher'))?.[1]?.status || 'idle')
            : (agents[step.id]?.status || 'idle');

          const isDone = agentStatus === 'done' || allDone;
          const isActive = i === activeStep && !allDone;
          const color = ROLE_COLORS[step.role];

          return (
            <React.Fragment key={step.id}>
              {/* Step node */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                flex: 1, position: 'relative',
              }}>
                {/* Icon circle */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: isActive ? color
                            : isDone ? `${color}33`
                            : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${isActive || isDone ? color : '#1e2a3a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: isActive ? '#fff' : isDone ? color : '#334155',
                  transition: 'all .3s ease',
                  boxShadow: isActive ? `0 0 12px ${color}88` : 'none',
                  animation: isActive ? 'pulseBorder 1.5s infinite' : 'none',
                }}>
                  {isDone ? '✓' : step.icon}
                </div>
                <span style={{
                  fontSize: 9, color: isActive ? color : isDone ? color : '#334155',
                  letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'Syne',
                  fontWeight: isActive ? 700 : 400,
                  transition: 'color .3s',
                }}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  height: 2, width: 12, flexShrink: 0, marginBottom: 18,
                  background: (isDone || i < activeStep)
                    ? ROLE_COLORS[STEPS[i + 1].role]
                    : '#1e2a3a',
                  transition: 'background .3s',
                  borderRadius: 1,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <style>{`
        @keyframes pulseBorder {
          0%,100% { box-shadow: 0 0 8px var(--c,#3b82f6); }
          50% { box-shadow: 0 0 18px var(--c,#3b82f6); }
        }
      `}</style>
    </div>
  );
}
