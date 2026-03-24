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

export function useGraph(svgRef, graph) {
  const simRef = useRef(null);

  useEffect(() => {
    if (!graph?.nodes?.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = svgRef.current.getBoundingClientRect();

    // Grid
    const grid = svg.append('g');
    for (let x = 0; x < width; x += 40)
      grid.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', height).attr('stroke', 'rgba(255,255,255,0.02)');
    for (let y = 0; y < height; y += 40)
      grid.append('line').attr('x1', 0).attr('y1', y).attr('x2', width).attr('y2', y).attr('stroke', 'rgba(255,255,255,0.02)');

    svg.append('defs').append('marker')
      .attr('id', 'arr').attr('viewBox', '-0 -5 10 10').attr('refX', 18).attr('refY', 0)
      .attr('orient', 'auto').attr('markerWidth', 6).attr('markerHeight', 6)
      .append('path').attr('d', 'M 0,-5 L 10,0 L 0,5').attr('fill', 'rgba(255,255,255,.15)');

    const nodes = graph.nodes.map(n => ({ ...n }));
    const links = graph.links.map(l => ({ ...l }));

    if (simRef.current) simRef.current.stop();
    simRef.current = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(28))
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
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simRef.current.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simRef.current.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    nodeGrp.append('circle').attr('r', 18)
      .attr('fill', d => ROLE_COLORS[d.role] || '#fff').attr('opacity', .08).attr('filter', 'blur(6px)');

    nodeGrp.append('circle').attr('r', d => d.role === 'synthesizer' ? 13 : 10)
      .attr('fill', d => ROLE_COLORS[d.role] || '#fff').attr('fill-opacity', .25)
      .attr('stroke', d => ROLE_COLORS[d.role] || '#fff').attr('stroke-width', 2);

    nodeGrp.append('text').attr('dy', 24).attr('text-anchor', 'middle')
      .attr('font-size', '9px').attr('fill', d => ROLE_COLORS[d.role] || '#fff').attr('opacity', .8)
      .text(d => d.label || d.id);

    function ticked() {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeGrp.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    return () => { if (simRef.current) simRef.current.stop(); };
  }, [graph, svgRef]);
}
