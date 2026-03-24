import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ROLE_COLORS = {
  query:       '#64748b',
  planner:     '#3b82f6',
  research:    '#10b981',
  critic:      '#f97316',
  synthesizer: '#a855f7',
  human:       '#f59e0b',
  tool:        '#475569',
};

const VERDICT_COLORS = {
  allow: '#10b981',
  block: '#ef4444',
  defer: '#f59e0b',
};

// Role layout — synthesizer center, others on a ring
// These are fractions of width/height, resolved at render time
const ROLE_POSITIONS = {
  synthesizer: { rx: 0.5,  ry: 0.5  },
  query:       { rx: 0.5,  ry: 0.18 },
  planner:     { rx: 0.72, ry: 0.28 },
  critic:      { rx: 0.78, ry: 0.55 },
  human:       { rx: 0.62, ry: 0.78 },
};

// Researchers spread evenly on the left arc
const RESEARCHER_POSITIONS = [
  { rx: 0.22, ry: 0.28 },
  { rx: 0.18, ry: 0.55 },
  { rx: 0.30, ry: 0.78 },
];

function getRolePos(role, researcherIndex, width, height) {
  if (role === 'research') {
    const p = RESEARCHER_POSITIONS[researcherIndex % RESEARCHER_POSITIONS.length];
    return { x: p.rx * width, y: p.ry * height };
  }
  const p = ROLE_POSITIONS[role];
  if (!p) return { x: width / 2, y: height / 2 };
  return { x: p.rx * width, y: p.ry * height };
}

export function useGraph(svgRef, graph) {
  const simRef = useRef(null);

  useEffect(() => {
    if (!graph?.nodes?.length || !svgRef.current) return;

    const rect   = svgRef.current.getBoundingClientRect();
    const width  = rect.width  || 800;
    const height = rect.height || 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Subtle grid
    const grid = svg.append('g');
    for (let x = 0; x < width;  x += 40) grid.append('line').attr('x1',x).attr('y1',0).attr('x2',x).attr('y2',height).attr('stroke','rgba(255,255,255,0.02)');
    for (let y = 0; y < height; y += 40) grid.append('line').attr('x1',0).attr('y1',y).attr('x2',width).attr('y2',y).attr('stroke','rgba(255,255,255,0.02)');

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id','arr').attr('viewBox','-0 -5 10 10').attr('refX',18).attr('refY',0)
      .attr('orient','auto').attr('markerWidth',6).attr('markerHeight',6)
      .append('path').attr('d','M 0,-5 L 10,0 L 0,5').attr('fill','rgba(255,255,255,.2)');

    // Assign initial positions based on role — researchers get indexed slots
    let researcherCount = 0;
    const nodes = graph.nodes.map(n => {
      const idx = n.role === 'research' ? researcherCount++ : 0;
      const pos = getRolePos(n.role, idx, width, height);
      return {
        ...n,
        x: pos.x,
        y: pos.y,
        // Synthesizer is pinned at center — everything flows to it
        fx: n.role === 'synthesizer' ? width  / 2 : null,
        fy: n.role === 'synthesizer' ? height / 2 : null,
      };
    });

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = (graph.links || [])
      .filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return nodeIds.has(s) && nodeIds.has(t);
      })
      .map(l => ({
        ...l,
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      }));

    if (simRef.current) simRef.current.stop();

    simRef.current = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(links).id(d => d.id).distance(110).strength(0.3))
      .force('charge',  d3.forceManyBody().strength(-180))
      .force('center',  d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collide', d3.forceCollide(34))
      // Radial force — pulls non-synthesizer nodes to a ring around center
      .force('radial',  d3.forceRadial(d => d.role === 'synthesizer' ? 0 : 160, width / 2, height / 2).strength(0.4))
      .alphaDecay(0.025) // settle a bit slower so it animates in nicely
      .on('tick', ticked);

    const linkG = svg.append('g');
    const nodeG = svg.append('g');

    const link = linkG.selectAll('line').data(links).enter().append('line')
      .attr('stroke',       d => VERDICT_COLORS[d.membrane_result] || 'rgba(255,255,255,0.12)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.kind === 'delta' ? '4 3' : null)
      .attr('marker-end', 'url(#arr)')
      .attr('opacity', 1); // no transition on links — avoids "too late; already running"

    const nodeGrp = nodeG.selectAll('g.node').data(nodes).enter()
      .append('g').attr('class','node').style('cursor','pointer')
      .attr('opacity', 1) // no transition — render immediately, no conflict
      .call(d3.drag()
        .on('start', (e,d) => { if (!e.active) simRef.current.alphaTarget(.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',  (e,d) => { d.fx=e.x; d.fy=e.y; })
        .on('end',   (e,d) => { if (!e.active) simRef.current.alphaTarget(0); if (d.role !== 'synthesizer') { d.fx=null; d.fy=null; } })
      );

    // Glow halo
    nodeGrp.append('circle')
      .attr('r', d => d.role === 'synthesizer' ? 28 : 22)
      .attr('fill', d => ROLE_COLORS[d.role] || '#fff')
      .attr('opacity', 0.07);

    // Main circle
    nodeGrp.append('circle')
      .attr('r', d => d.role === 'synthesizer' ? 14 : 10)
      .attr('fill',         d => ROLE_COLORS[d.role] || '#fff')
      .attr('fill-opacity', 0.25)
      .attr('stroke',       d => ROLE_COLORS[d.role] || '#fff')
      .attr('stroke-width', 2);

    // Label
    nodeGrp.append('text')
      .attr('dy', d => d.role === 'synthesizer' ? 30 : 26)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', d => ROLE_COLORS[d.role] || '#fff')
      .attr('opacity', 0.85)
      .text(d => d.label || d.id);

    function ticked() {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeGrp.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    return () => { if (simRef.current) simRef.current.stop(); };
  }, [graph, svgRef]);
}
