import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function useStabilityChart(svgRef, history) {
  useEffect(() => {
    if (!svgRef.current || !history.length) return;
    const scores = history.map(h => h.score);
    const { width, height } = svgRef.current.getBoundingClientRect();
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const x = d3.scaleLinear().domain([0, Math.max(scores.length - 1, 1)]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height - 4, 4]);

    const last = scores[scores.length - 1];
    const color = last > 0.8 ? '#10b981' : last > 0.5 ? '#f59e0b' : '#ef4444';

    svg.append('path').datum(scores)
      .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2)
      .attr('d', d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX));

    svg.append('circle')
      .attr('cx', x(scores.length - 1)).attr('cy', y(last))
      .attr('r', 4).attr('fill', color);

  }, [history, svgRef]);
}
