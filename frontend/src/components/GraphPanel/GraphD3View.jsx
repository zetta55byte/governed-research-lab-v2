import React, { useEffect, useRef } from "react"
import * as d3 from "d3"

export default function GraphD3View({ nodes, edges }) {
  const ref = useRef(null)

  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll("*").remove()

    const g = svg.append("g")

    g.selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)

    g.selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 4)
      .attr("fill", "#fff")

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).distance(40))
      .force("charge", d3.forceManyBody().strength(-40))
      .force("center", d3.forceCenter(300, 200))

    sim.on("tick", () => {
      g.selectAll("line")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)

      g.selectAll("circle")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
    })
  }, [nodes, edges])

  return <svg ref={ref} width={600} height={400} />
}