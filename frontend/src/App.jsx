import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { grlReducer, INITIAL_STATE, filteredChain } from './store/reducer';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ─── Design tokens ────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  query:       '#64748b',
  planner:     '#3b82f6',
  research:    '#10b981',
  critic:      '#f97316',
  synthesizer: '#a855f7',
  human:       '#f59e0b',
  tool:        '#475569',
};

const STATUS_COLORS = {
  idle:     'rgba(255,255,255,0.15)',
  running:  '#3b82f6',
  done:     '#10b981',
  blocked:  '#ef4444',
  deferred: '#f59e0b',
};

const MEMBRANE_COLORS = {
  M1_SAFETY:        '#ef4444',
  M2_REVERSIBILITY: '#f59e0b',
  M3_PLURALISM:     '#a855f7',
  M4_HUMAN_PRIMACY: '#06b6d4',
};

const VERDICT_COLORS = {
  allow: '#10b981',
  block: '#ef4444',
  defer: '#f59e0b',
};

const PROFILES = ['ai_safety', 'evals', 'governance', 'planning', 'custom'];
const RUNTIMES = ['claude', 'openai', 'autogen'];

// ─── CSS ─────────────────────────────────────────────────────────────────────

const css = `
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #07090f;
  --surface: #0d111a;
  --surface2: #131929;
  --border: #1e2a3a;
  --border2: #263040;
  --text: #e2e8f0;
  --muted: #64748b;
  --dim: #334155;
  --accent: #3b82f6;
  --green: #10b981;
  --red: #ef4444;
  --orange: #f97316;
  --purple: #a855f7;
  --yellow: #f59e0b;
  --font-mono: 'Space Mono', monospace;
  --font-display: 'Syne', sans-serif;
}
body { background: var(--bg); color: var(--text); font-family: var(--font-mono); font-size: 12px; overflow: hidden; height: 100vh; }
#root { height: 100vh; display: flex; flex-direction: column; }

.app { display: grid; grid-template-rows: 48px 1fr; height: 100vh; }

/* Header */
.header { background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 16px; gap: 16px; }
.logo { font-family: var(--font-display); font-weight: 800; font-size: 14px; letter-spacing: -0.5px; color: var(--text); }
.logo span { color: var(--accent); }
.header-sep { flex: 1; }
.stability-chip { display: flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; border: 1px solid var(--border2); font-size: 11px; }
.pulse { width: 6px; height: 6px; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

/* Main grid: 5 panels */
.main { display: grid; grid-template-columns: 300px 1fr 280px; grid-template-rows: auto 1fr; overflow: hidden; height: calc(100vh - 48px); }

/* Panel base */
.panel { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.panel-title { font-family: var(--font-display); font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--dim); padding: 10px 14px 6px; border-bottom: 1px solid var(--border); }

/* Panel 1: Control */
.control-panel { grid-column: 1; grid-row: 1 / 3; }
.query-area { padding: 12px; border-bottom: 1px solid var(--border); }
.query-input { width: 100%; background: var(--surface2); border: 1px solid var(--border2); border-radius: 6px; padding: 8px 10px; color: var(--text); font-family: var(--font-mono); font-size: 12px; resize: vertical; min-height: 64px; outline: none; transition: border-color .15s; }
.query-input:focus { border-color: var(--accent); }
.query-input::placeholder { color: var(--dim); }

.selector-row { display: flex; gap: 6px; margin-top: 8px; }
.selector { flex: 1; background: var(--surface2); border: 1px solid var(--border2); border-radius: 4px; padding: 5px 8px; color: var(--text); font-family: var(--font-mono); font-size: 11px; outline: none; cursor: pointer; }

.run-btn { width: 100%; margin-top: 8px; padding: 9px; background: var(--accent); color: #fff; border: none; border-radius: 6px; font-family: var(--font-display); font-weight: 700; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: opacity .15s; }
.run-btn:hover:not(:disabled) { opacity: .85; }
.run-btn:disabled { opacity: .4; cursor: not-allowed; }

/* Agent pipeline */
.pipeline { padding: 8px; border-bottom: 1px solid var(--border); }
.agent-row { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 5px; margin-bottom: 2px; transition: background .15s; }
.agent-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; transition: background .3s; }
.agent-label { font-size: 11px; flex: 1; }
.agent-status-tag { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--dim); }
.agent-status-tag.running { color: var(--accent); animation: pulse 1s infinite; }
.agent-status-tag.done { color: var(--green); }
.agent-status-tag.blocked { color: var(--red); }

/* Stats */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 10px; border-bottom: 1px solid var(--border); }
.stat-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 8px; text-align: center; }
.stat-val { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--accent); }
.stat-label { font-size: 9px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }

/* Chain filters */
.filters { padding: 10px; flex: 1; overflow-y: auto; }
.filter-section { margin-bottom: 10px; }
.filter-label { font-size: 9px; color: var(--dim); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 5px; }
.filter-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { padding: 3px 7px; border-radius: 12px; border: 1px solid var(--border2); font-size: 10px; cursor: pointer; color: var(--muted); transition: all .15s; }
.chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.toggle-chip { padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border2); font-size: 10px; cursor: pointer; color: var(--muted); transition: all .15s; }
.toggle-chip.active { background: rgba(239,68,68,.2); border-color: var(--red); color: var(--red); }

/* Panel 2: D3 Graph */
.graph-panel { grid-column: 2; grid-row: 1 / 3; background: var(--bg); border-right: 1px solid var(--border); position: relative; overflow: hidden; }
.graph-svg { width: 100%; height: 100%; }
.graph-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--dim); gap: 10px; pointer-events: none; }
.graph-empty-icon { font-size: 48px; opacity: .2; }

/* Panel 3: Membrane log */
.membrane-panel { grid-column: 3; grid-row: 1; border-bottom: 1px solid var(--border); max-height: 240px; }
.membrane-log { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 3px; }
.membrane-log::-webkit-scrollbar { width: 3px; }
.membrane-log::-webkit-scrollbar-thumb { background: var(--border2); }
.membrane-entry { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 4px; font-size: 10px; border-left: 2px solid transparent; animation: fadeIn .2s; }
.membrane-entry.allow { border-color: var(--green); background: rgba(16,185,129,.05); }
.membrane-entry.block { border-color: var(--red); background: rgba(239,68,68,.08); }
.membrane-entry.defer { border-color: var(--yellow); background: rgba(245,158,11,.08); }
@keyframes fadeIn { from{opacity:0;transform:translateX(4px)} to{opacity:1;transform:translateX(0)} }
.m-badge { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 10px; }
.m-result { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
.m-agent { color: var(--muted); font-size: 9px; }

/* Panel 4: Continuity chain viewer */
.chain-panel { grid-column: 3; grid-row: 2; display: flex; flex-direction: column; overflow: hidden; border-left: 1px solid var(--border); }
.chain-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.chain-list::-webkit-scrollbar { width: 3px; }
.chain-list::-webkit-scrollbar-thumb { background: var(--border2); }

.delta-card { border-radius: 6px; border: 1px solid var(--border2); padding: 8px; cursor: pointer; transition: border-color .15s; }
.delta-card:hover { border-color: var(--accent); }
.delta-card.selected { border-color: var(--accent); background: rgba(59,130,246,.05); }
.delta-card.allow { border-left: 3px solid var(--green); }
.delta-card.block { border-left: 3px solid var(--red); }
.delta-card.defer { border-left: 3px solid var(--yellow); }
.delta-card.contested { border-left: 3px solid var(--purple); }

.delta-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.delta-id { font-size: 9px; color: var(--dim); font-weight: 700; }
.delta-agent { font-size: 9px; color: var(--accent); }
.delta-desc { font-size: 11px; color: var(--text); margin-bottom: 4px; line-height: 1.4; }
.delta-membranes { display: flex; gap: 3px; flex-wrap: wrap; }
.m-pill { font-size: 8px; padding: 1px 4px; border-radius: 8px; }
.delta-stability { font-size: 9px; color: var(--muted); margin-top: 4px; }
.delta-contested { font-size: 9px; color: var(--purple); margin-top: 2px; }

/* Stability sparkline */
.sparkline { display: inline-block; vertical-align: middle; }

/* Stability panel (bottom) */
.stability-panel { grid-column: 1 / 4; background: var(--surface); border-top: 1px solid var(--border); height: 80px; display: flex; align-items: center; padding: 0 16px; gap: 20px; flex-shrink: 0; }
.stability-label { font-family: var(--font-display); font-size: 11px; color: var(--muted); white-space: nowrap; }
.stability-score-big { font-family: var(--font-display); font-size: 24px; font-weight: 800; white-space: nowrap; }
.stability-chart { flex: 1; height: 50px; }

/* Brief panel */
.brief-panel { position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: rgba(7,9,15,.96); z-index: 50; display: flex; flex-direction: column; padding: 24px; overflow: hidden; }
.brief-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.brief-title { font-family: var(--font-display); font-size: 16px; font-weight: 800; }
.brief-close { background: var(--surface2); border: 1px solid var(--border2); border-radius: 4px; padding: 5px 10px; color: var(--text); font-family: var(--font-mono); font-size: 11px; cursor: pointer; }
.brief-content { flex: 1; overflow-y: auto; font-size: 12px; line-height: 1.8; color: var(--text); white-space: pre-wrap; background: var(--surface2); border-radius: 6px; padding: 16px; }
.brief-content::-webkit-scrollbar { width: 4px; }
.brief-content::-webkit-scrollbar-thumb { background: var(--border2); }
`;

// ─── Stability Sparkline ──────────────────────────────────────────────────────

function StabilitySparkline({ values, width = 80, height = 20 }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const last = values[values.length - 1];
  const color = last > 0.8 ? '#10b981' : last > 0.5 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={width} height={height} className="sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Stability Line Chart (D3) ────────────────────────────────────────────────

function StabilityChart({ history }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const scores = history.map(h => h.score);
    const { width, height } = ref.current.getBoundingClientRect();
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    if (!scores.length) return;

    const x = d3.scaleLinear().domain([0, Math.max(scores.length - 1, 1)]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height - 4, 4]);

    const color = scores[scores.length - 1] > 0.8 ? '#10b981'
                : scores[scores.length - 1] > 0.5 ? '#f59e0b' : '#ef4444';

    svg.append('path')
      .datum(scores)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', d3.line()
        .x((d, i) => x(i))
        .y(d => y(d))
        .curve(d3.curveMonotoneX)
      );

    // Current score dot
    const last = scores[scores.length - 1];
    svg.append('circle')
      .attr('cx', x(scores.length - 1))
      .attr('cy', y(last))
      .attr('r', 4)
      .attr('fill', color);

  }, [history]);

  return <svg ref={ref} style={{ width: '100%', height: '100%' }} />;
}

// ─── D3 Agent Graph ───────────────────────────────────────────────────────────

function AgentGraph({ graph, selectedDeltaId, onSelectAgent }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    if (!graph.nodes.length || !svgRef.current) return;
    const { width, height } = svgRef.current.getBoundingClientRect();
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Grid background
    const grid = svg.append('g');
    for (let x = 0; x < width; x += 40)
      grid.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', height).attr('stroke', 'rgba(255,255,255,0.02)');
    for (let y = 0; y < height; y += 40)
      grid.append('line').attr('x1', 0).attr('y1', y).attr('x2', width).attr('y2', y).attr('stroke', 'rgba(255,255,255,0.02)');

    svg.append('defs').append('marker').attr('id', 'arr').attr('viewBox', '-0 -5 10 10').attr('refX', 18).attr('refY', 0).attr('orient', 'auto').attr('markerWidth', 6).attr('markerHeight', 6).append('path').attr('d', 'M 0,-5 L 10,0 L 0,5').attr('fill', 'rgba(255,255,255,.15)');

    const nodes = graph.nodes.map(n => ({ ...n }));
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });
    const links = graph.links.map(l => ({ ...l, source: l.source, target: l.target }));

    if (simRef.current) simRef.current.stop();
    simRef.current = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(30))
      .on('tick', ticked);

    const linkG = svg.append('g');
    const nodeG = svg.append('g');

    const link = linkG.selectAll('line').data(links).enter().append('line')
      .attr('stroke', d => VERDICT_COLORS[d.membrane_result] || 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.kind === 'delta' ? '4 3' : null)
      .attr('marker-end', 'url(#arr)');

    const nodeGrp = nodeG.selectAll('g.node').data(nodes).enter().append('g').attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onSelectAgent && onSelectAgent(d.id))
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simRef.current.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simRef.current.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Glow
    nodeGrp.append('circle').attr('r', 20).attr('fill', d => ROLE_COLORS[d.role] || '#fff').attr('opacity', .08).attr('filter', 'blur(6px)');

    // Main circle
    nodeGrp.append('circle').attr('r', d => d.role === 'synthesizer' ? 14 : 10)
      .attr('fill', d => ROLE_COLORS[d.role] || '#fff')
      .attr('fill-opacity', .25)
      .attr('stroke', d => STATUS_COLORS[d.status] || ROLE_COLORS[d.role] || '#fff')
      .attr('stroke-width', 2);

    // Status halo
    nodeGrp.append('circle').attr('r', d => d.role === 'synthesizer' ? 18 : 14)
      .attr('fill', 'none')
      .attr('stroke', d => STATUS_COLORS[d.status] || 'transparent')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3 3')
      .attr('opacity', d => d.status === 'running' ? 0.8 : 0);

    // Label
    nodeGrp.append('text').attr('dy', 26).attr('text-anchor', 'middle').attr('font-size', '9px').attr('fill', d => ROLE_COLORS[d.role] || '#fff').attr('opacity', .8).text(d => d.label);

    function ticked() {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeGrp.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    return () => { if (simRef.current) simRef.current.stop(); };
  }, [graph, selectedDeltaId]);

  return (
    <div className="graph-panel">
      <svg ref={svgRef} className="graph-svg" />
      {!graph.nodes.length && (
        <div className="graph-empty">
          <div className="graph-empty-icon">◈</div>
          <div style={{ fontFamily: 'Syne', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Awaiting Research</div>
        </div>
      )}
    </div>
  );
}

// ─── Delta Card ───────────────────────────────────────────────────────────────

function DeltaCard({ delta, selected, onSelect }) {
  const verdict = delta.verdict || 'allow';
  const isContested = delta.contested_by && delta.contested_by.length > 0;
  const cn = `delta-card ${verdict} ${isContested ? 'contested' : ''} ${selected ? 'selected' : ''}`;
  const membraneResults = delta.membrane_results || {};

  return (
    <div className={cn} onClick={() => onSelect(delta.delta_id)}>
      <div className="delta-header">
        <span className="delta-id">Δ{delta.delta_id?.slice(-6)}</span>
        <span className="delta-agent">{delta.agent_id}</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: VERDICT_COLORS[verdict] || '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{verdict}</span>
      </div>
      <div className="delta-desc">{delta.description}</div>
      <div className="delta-membranes">
        {Object.entries(membraneResults).map(([m, r]) => (
          <span key={m} className="m-pill" style={{ background: `${MEMBRANE_COLORS[m] || '#666'}22`, color: MEMBRANE_COLORS[m] || '#fff', border: `1px solid ${MEMBRANE_COLORS[m] || '#666'}44` }}>
            {m.split('_')[0]} {r === 'allow' ? '✓' : r === 'block' ? '✕' : '⚠'}
          </span>
        ))}
      </div>
      {delta.stability_after != null && (
        <div className="delta-stability">S(t): {delta.stability_after.toFixed(3)}</div>
      )}
      {isContested && (
        <div className="delta-contested">⚡ Contested by: {delta.contested_by.join(', ')}</div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(grlReducer, INITIAL_STATE);
  const [showBrief, setShowBrief] = useState(false);
  const esRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [state.membraneLog]);

  const startResearch = useCallback(async () => {
    if (!state.query.trim() || state.status === 'running') return;
    dispatch({ type: 'RESET' });

    try {
      const res = await fetch(`${API}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: state.query,
          profile: state.profile,
          runtime: state.runtime,
        }),
      });
      const data = await res.json();
      dispatch({ type: 'SET_SESSION', sessionId: data.session_id });

      if (esRef.current) esRef.current.close();
      const es = new EventSource(`${API}/stream/${data.session_id}`);
      esRef.current = es;

      es.onmessage = (e) => {
        const event = JSON.parse(e.data);
        dispatch(event);
        if (event.type === 'stream_end') es.close();
        if (event.type === 'final_output') setShowBrief(true);
      };
      es.onerror = () => es.close();
    } catch (err) {
      dispatch({ type: 'error', message: err.message });
    }
  }, [state.query, state.profile, state.runtime, state.status]);

  const agentList = [
    { id: 'planner', name: 'Planner' },
    { id: 'researcher_1', name: 'Researcher #1' },
    { id: 'researcher_2', name: 'Researcher #2' },
    { id: 'researcher_3', name: 'Researcher #3' },
    { id: 'critic', name: 'Critic' },
    { id: 'synthesizer', name: 'Synthesizer' },
  ];

  const chain = filteredChain(state.continuityChain, state.filters);
  const stabilityScores = state.stabilityHistory.map(h => h.score);
  const currentS = state.currentStability;
  const stabilityColor = currentS > 0.8 ? '#10b981' : currentS > 0.5 ? '#f59e0b' : '#ef4444';

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="logo">◈ <span>GRL</span> v2</div>
          <span style={{ color: 'var(--dim)', fontSize: 10, letterSpacing: 1 }}>Constitutional OS · Multi-Agent · {state.runtime.toUpperCase()}</span>
          <div className="header-sep" />
          <div className="stability-chip">
            <div className="pulse" style={{ background: stabilityColor }} />
            <span>S(t) = {currentS.toFixed(3)}</span>
          </div>
          {state.runComplete && (
            <button style={{ marginLeft: 8, padding: '3px 10px', background: 'var(--purple)', border: 'none', borderRadius: 4, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }} onClick={() => setShowBrief(true)}>
              View Brief
            </button>
          )}
        </header>

        {/* Main */}
        <div className="main">
          {/* Panel 1: Control */}
          <div className="panel control-panel">
            <div className="panel-title">Research Configuration</div>

            <div className="query-area">
              <textarea
                className="query-input"
                placeholder="What would you like to research?"
                value={state.query}
                onChange={e => dispatch({ type: 'SET_QUERY', query: e.target.value })}
                disabled={state.status === 'running'}
              />
              <div className="selector-row">
                <select className="selector" value={state.profile} onChange={e => dispatch({ type: 'SET_PROFILE', profile: e.target.value })} disabled={state.status === 'running'}>
                  {PROFILES.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                </select>
                <select className="selector" value={state.runtime} onChange={e => dispatch({ type: 'SET_RUNTIME', runtime: e.target.value })} disabled={state.status === 'running'}>
                  {RUNTIMES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <button className="run-btn" onClick={startResearch} disabled={state.status === 'running' || !state.query.trim()}>
                {state.status === 'running' ? '◌ Running Governed Cycle...' : '▶ Run Governed Research Cycle'}
              </button>
            </div>

            <div className="panel-title" style={{ marginTop: 0 }}>Agent Pipeline</div>
            <div className="pipeline">
              {agentList.map(a => {
                const ag = state.agents[a.id] || {};
                return (
                  <div key={a.id} className="agent-row" style={{ background: ag.status === 'running' ? 'rgba(59,130,246,0.07)' : 'transparent' }}>
                    <div className="agent-dot" style={{ background: ag.status === 'running' ? '#3b82f6' : ag.status === 'done' ? '#10b981' : ag.status === 'blocked' ? '#ef4444' : 'rgba(255,255,255,0.15)' }} />
                    <span className="agent-label" style={{ color: ag.status === 'done' ? '#10b981' : ag.status === 'running' ? '#3b82f6' : 'var(--muted)' }}>{a.name}</span>
                    <span className={`agent-status-tag ${ag.status || ''}`}>{ag.status === 'done' ? '✓' : ag.status || '--'}</span>
                  </div>
                );
              })}
            </div>

            <div className="stats-grid">
              <div className="stat-card"><div className="stat-val">{state.continuityChain.length}</div><div className="stat-label">Deltas</div></div>
              <div className="stat-card"><div className="stat-val">{state.continuityChain.filter(d => d.verdict === 'block').length}</div><div className="stat-label">Blocked</div></div>
              <div className="stat-card"><div className="stat-val">{state.continuityChain.filter(d => (d.contested_by || []).length > 0).length}</div><div className="stat-label">Contested</div></div>
              <div className="stat-card"><div className="stat-val">{state.membraneLog.length}</div><div className="stat-label">Checks</div></div>
            </div>

            <div className="panel-title">Chain Filters</div>
            <div className="filters">
              <div className="filter-section">
                <div className="filter-label">Agents</div>
                <div className="filter-chips">
                  {agentList.map(a => (
                    <span key={a.id} className={`chip ${state.filters.agents.includes(a.id) ? 'active' : ''}`}
                      onClick={() => {
                        const agents = state.filters.agents.includes(a.id)
                          ? state.filters.agents.filter(x => x !== a.id)
                          : [...state.filters.agents, a.id];
                        dispatch({ type: 'SET_FILTER_AGENTS', agents });
                      }}>
                      {a.name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="filter-section">
                <div className="filter-label">Membranes</div>
                <div className="filter-chips">
                  {['M1_SAFETY', 'M2_REVERSIBILITY', 'M3_PLURALISM', 'M4_HUMAN_PRIMACY'].map(m => (
                    <span key={m} className={`chip ${state.filters.membranes.includes(m) ? 'active' : ''}`}
                      style={state.filters.membranes.includes(m) ? { background: MEMBRANE_COLORS[m], borderColor: MEMBRANE_COLORS[m] } : {}}
                      onClick={() => {
                        const membranes = state.filters.membranes.includes(m)
                          ? state.filters.membranes.filter(x => x !== m)
                          : [...state.filters.membranes, m];
                        dispatch({ type: 'SET_FILTER_MEMBRANES', membranes });
                      }}>
                      {m.split('_')[0]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="filter-section">
                <span className={`toggle-chip ${state.filters.contestedOnly ? 'active' : ''}`}
                  onClick={() => dispatch({ type: 'SET_FILTER_CONTESTED', value: !state.filters.contestedOnly })}>
                  ⚡ Contested only
                </span>
              </div>
            </div>
          </div>

          {/* Panel 2: D3 Graph */}
          <AgentGraph
            graph={state.graph}
            selectedDeltaId={state.filters.selectedDeltaId}
            onSelectAgent={(agentId) => dispatch({ type: 'SET_FILTER_AGENTS', agents: [agentId] })}
          />

          {/* Panel 3: Membrane log */}
          <div className="panel membrane-panel">
            <div className="panel-title">Membrane Log</div>
            <div className="membrane-log">
              {state.membraneLog.slice(-60).map((entry, i) => (
                <div key={entry.id || i} className={`membrane-entry ${entry.result}`}>
                  <span className="m-badge" style={{ background: `${MEMBRANE_COLORS[entry.membrane] || '#666'}22`, color: MEMBRANE_COLORS[entry.membrane] || '#fff' }}>
                    {entry.membrane?.split('_')[0]}
                  </span>
                  <span className="m-result" style={{ color: VERDICT_COLORS[entry.result] || '#fff' }}>{entry.result}</span>
                  <span className="m-agent">{entry.agent_id}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Panel 4: Continuity chain viewer */}
          <div className="panel chain-panel">
            <div className="panel-title">
              Continuity Chain · {chain.length}/{state.continuityChain.length}
              {state.filters.agents.length > 0 || state.filters.membranes.length > 0 || state.filters.contestedOnly
                ? ' (filtered)' : ''}
            </div>
            <div className="chain-list">
              {chain.slice().reverse().map(delta => (
                <DeltaCard
                  key={delta.delta_id}
                  delta={delta}
                  selected={state.filters.selectedDeltaId === delta.delta_id}
                  onSelect={(id) => dispatch({ type: 'SELECT_DELTA', delta_id: id })}
                />
              ))}
              {!chain.length && (
                <div style={{ color: 'var(--dim)', fontSize: 11, padding: 8, textAlign: 'center' }}>
                  {state.status === 'idle' ? 'No deltas yet' : 'No deltas match filters'}
                </div>
              )}
            </div>
          </div>

          {/* Stability bar (spans all columns) */}
          <div className="stability-panel" style={{ gridColumn: '1 / 4', gridRow: 3 }}>
            <span className="stability-label">V(t) = α·c + β·u + γ·d</span>
            <span className="stability-score-big" style={{ color: stabilityColor }}>{currentS.toFixed(3)}</span>
            <span className="stability-label">S(t) = 1 − V(t)</span>
            <div className="stability-chart">
              <StabilityChart history={state.stabilityHistory} />
            </div>
            {state.stabilityHistory.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--dim)', whiteSpace: 'nowrap' }}>
                Δ{state.stabilityHistory.length} · {state.stabilityHistory.length > 1
                  ? (state.stabilityHistory[state.stabilityHistory.length-1].score - state.stabilityHistory[0].score > 0 ? '↑' : '↓') + ' trend'
                  : 'stable'}
              </span>
            )}
          </div>
        </div>

        {/* Final Brief overlay */}
        {showBrief && state.finalBrief && (
          <div className="brief-panel">
            <div className="brief-header">
              <span className="brief-title">★ Final Research Brief</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {state.continuityChain.length} deltas · S(t) = {currentS.toFixed(3)}
                </span>
                <button className="brief-close" onClick={() => setShowBrief(false)}>Close</button>
              </div>
            </div>
            <div className="brief-content">{state.finalBrief}</div>
          </div>
        )}
      </div>
    </>
  );
}
