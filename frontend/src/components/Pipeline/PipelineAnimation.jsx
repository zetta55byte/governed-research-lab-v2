import React, { useEffect, useState, useRef } from 'react';

const STEPS = [
  { id: 'planner',    label: 'Plan',      icon: '◎', role: 'planner'     },
  { id: 'researcher', label: 'Research',  icon: '⊕', role: 'research'    },
  { id: 'critic',     label: 'Critique',  icon: '⊘', role: 'critic'      },
  { id: 'synthesizer',label: 'Synthesize',icon: '◈', role: 'synthesizer' },
  { id: 'human',      label: 'Human',     icon: '◉', role: 'human'       },
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
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const pulseRef = useRef(0);
  const rafRef   = useRef(null);
  const canvasRefs = useRef([]);

  useEffect(() => {
    const runningAgent = Object.entries(agents).find(([, a]) => a.status === 'running');
    const doneAgents   = Object.entries(agents).filter(([, a]) => a.status === 'done').map(([k]) => k);

    const done = new Set();
    if (doneAgents.some(k => k === 'planner'))          done.add(0);
    if (doneAgents.some(k => k.startsWith('researcher')))done.add(1);
    if (doneAgents.some(k => k === 'critic'))            done.add(2);
    if (doneAgents.some(k => k === 'synthesizer'))       done.add(3);
    if (status === 'complete')                           { done.add(4); }
    setCompletedSteps(done);

    if (!runningAgent) {
      setActiveStep(status === 'complete' ? 5 : -1);
      return;
    }
    const id = runningAgent[0];
    if (id === 'planner')             setActiveStep(0);
    else if (id.startsWith('researcher')) setActiveStep(1);
    else if (id === 'critic')         setActiveStep(2);
    else if (id === 'synthesizer')    setActiveStep(3);
    else                              setActiveStep(-1);
  }, [agents, status]);

  const allDone = status === 'complete';

  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2a3a', background: '#0a0d16' }}>
      <div style={{ fontSize: 9, color: '#334155', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Syne', fontWeight: 700, marginBottom: 8 }}>
        Research Pipeline
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, i) => {
          const isDone   = completedSteps.has(i) || allDone;
          const isActive = i === activeStep && !allDone;
          const color    = ROLE_COLORS[step.role];
          const isPrev   = i < activeStep;

          return (
            <React.Fragment key={step.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, position: 'relative' }}>

                {/* Outer pulse ring — only when active */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `2px solid ${color}`,
                    animation: 'pipelinePulse 1.2s ease-out infinite',
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Second outer ring for extra glow when active */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    top: -4,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: `1px solid ${color}44`,
                    animation: 'pipelinePulse2 1.8s ease-out infinite',
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Main icon circle */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isActive
                    ? color
                    : isDone
                    ? `${color}22`
                    : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${isActive || isDone ? color : '#1e2a3a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: isActive ? '#000' : isDone ? color : '#334155',
                  transition: 'all 0.4s ease',
                  boxShadow: isActive ? `0 0 20px ${color}99, 0 0 40px ${color}44` : 'none',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  {isDone ? '✓' : step.icon}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 9,
                  color: isActive ? color : isDone ? `${color}99` : '#334155',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'Syne',
                  fontWeight: isActive ? 700 : 400,
                  transition: 'color 0.3s',
                  textShadow: isActive ? `0 0 8px ${color}` : 'none',
                }}>
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div style={{
                  height: 2,
                  width: 12,
                  flexShrink: 0,
                  marginBottom: 18,
                  background: (isDone && i < activeStep) || (allDone)
                    ? ROLE_COLORS[STEPS[i + 1].role]
                    : isActive
                    ? `linear-gradient(90deg, ${color}, ${ROLE_COLORS[STEPS[i+1].role]}44)`
                    : '#1e2a3a',
                  transition: 'background 0.5s ease',
                  borderRadius: 1,
                  boxShadow: isActive ? `0 0 6px ${color}66` : 'none',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        @keyframes pipelinePulse {
          0%   { transform: scale(1);    opacity: 0.9; }
          100% { transform: scale(1.9);  opacity: 0;   }
        }
        @keyframes pipelinePulse2 {
          0%   { transform: scale(1);    opacity: 0.5; }
          100% { transform: scale(2.2);  opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
