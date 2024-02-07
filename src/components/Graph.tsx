// @ts-nocheck

"use client"
import React, { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import * as d3 from "d3"
import { Simulation, SimulationNodeDatum, SimulationLinkDatum } from "d3-force"

interface Link {
  source: { x: number; y: number }
  target: { x: number; y: number }
}

function linkArc(d: Link) {
  const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y)
  return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}`
}

const drag = (simulation: Simulation<CustomNode, undefined>) => {
  function dragstarted(
    event: d3.D3DragEvent<SVGGElement, CustomNode, CustomNode>,
    d: CustomNode,
  ) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(
    event: d3.D3DragEvent<SVGGElement, CustomNode, CustomNode>,
    d: CustomNode,
  ) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragended(
    event: d3.D3DragEvent<SVGGElement, CustomNode, CustomNode>,
    d: CustomNode,
  ) {
    if (!event.active) simulation.alphaTarget(0)
    d.fx = null
    d.fy = null
  }

  return d3
    .drag<SVGGElement, CustomNode>()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended)
}

interface GraphProps {
  messageId: string // Specify that messageId is a string
  isProcess?: boolean
}

interface ChartDataItem {
  source: string
  target: string
  type: string
  action: string
}

interface CustomNode extends SimulationNodeDatum {
  id: string
}

interface CustomLink extends SimulationNodeDatum {
  source: string | CustomNode
  target: string | CustomNode
  type: string
  action: string
}

export const Graph: React.FC<GraphProps> = ({ messageId, isProcess = false }) => {
  const [chartData, setChartData] = useState<ChartDataItem[]>([])

  // Function to call the Supabase RPC
  const fetchChartData = async () => {
    try {
      const { data, error } = await supabase.rpc("get_message_network", {
        p_id: messageId,
        is_process: isProcess,
      })

      if (error) {
        console.error("Error calling Supabase RPC:", error.message)
        return
      }

      // Update the chartData state with the data received from the RPC call
      setChartData(data)
    } catch (error) {
      console.error("Error fetching chart data:", error)
    }
  }

  // useEffect to call the RPC when the component mounts
  useEffect(() => {
    fetchChartData()
  }, [])

  const svgRef = useRef(null)

  useEffect(() => {
    if (chartData.length === 0) return

    // Initialize chart only once and update it on data changes
    const svg = d3.select(svgRef.current)
    const width = 500
    const height = 480
    svg
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr(
        "style",
        "max-width: 100%; height: auto; font: 12px sans-serif; background: #f9f9f9;",
      )

    const types = Array.from(new Set(chartData.map((d) => d.type)))
    const nodes: CustomNode[] = Array.from(
      new Set(chartData.flatMap((l) => [l.source, l.target])),
      (id) => ({ id }),
    )
    const links: CustomLink[] = chartData.map((d) => ({
      ...d,
      source: nodes.find((n) => n.id === d.source),
      target: nodes.find((n) => n.id === d.target),
    }))
    const myColors = ["#FF9C67"]
    const color = d3.scaleOrdinal(types, myColors)

    const simulation = d3
      .forceSimulation<CustomNode>(nodes) // Ensure simulation is initialized with CustomNode type
      .force(
        "link",
        d3
          .forceLink<CustomNode, CustomLink<CustomNode>>(links) // Assuming CustomLink is your link type
          .id(
            (
              d: SimulationNodeDatum,
              i?: number,
              nodesData?: SimulationNodeDatum[],
            ) => {
              // Use type assertion here to tell TypeScript that `d` is indeed a CustomNode
              return (d as CustomNode).id
            },
          )
          .distance(200),
      ) // Set fixed distance to 100
      .force("charge", d3.forceManyBody().strength(-400))
      .force("x", d3.forceX())
      .force("y", d3.forceY())

    const linkText = svg
      .append("g")
      .attr("class", "link-texts")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("id", (d) => `link-text-${d.source.id}-${d.target.id}`)
      .attr("visibility", "hidden")
      .text((d) => d.action) // Use the 'action' property for labeling

    // Per-type markers, as they don't inherit styles.
    const link = svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("id", (d) => `link-${d.source.id}-${d.target.id}`)
      .attr("stroke", (d) =>
        d.type === "User Message" ? "#FE7171" : color(d.type),
      )
      .attr(
        "marker-end",
        (d) => `url(${new URL(`#arrow-${d.type}`, location.href)})`,
      )
      .on("mouseclick", function (event, d) {
        svg
          .select(`#${CSS.escape(`#link-text-${d.source.id}-${d.target.id}`)}`)
          .attr("visibility", "visible")
      })
      .on("mouseout", function (event, d) {
        svg
          .select(`#${CSS.escape(`#link-text-${d.source.id}-${d.target.id}`)}`)
          .attr("visibility", "hidden")
      })

    svg
      .append("defs")
      .selectAll("marker")
      .data(types)
      .join("marker")
      .attr("id", (d) => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", -0.5)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", (d) => (d === "User Message" ? "#FE7171" : color(d)))
      .attr("d", "M0,-5L10,0L0,5")

    const node = svg
      .append("g")
      .attr("fill", "currentColor")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .selectAll<SVGGElement, CustomNode>("g")
      .data(nodes)
      .join("g")
      .call(drag(simulation))

    node
      .append("circle")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("r", 8)
      .attr("fill", (d) => (d.id === "User" ? "#FE7171" : color(d.type)))

    const text = node
      .append("text")
      .attr("x", 10)
      .attr("y", "0.31em")
      .text((d) => d.id)
      .style("visibility", "hidden") // Initially hide the text
      .style("pointer-events", "none") // Ensure the text doesn't interfere with mouse events

    node
      .on("mouseover", function () {
        d3.select(this).select("text").style("visibility", "visible")
      })
      .on("mouseout", function () {
        d3.select(this).select("text").style("visibility", "hidden")
      })

    simulation.on("tick", () => {
      link.attr("d", linkArc)
      node.attr("transform", (d) => `translate(${d.x},${d.y})`)
      linkText
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2)
    })

    // invalidation.then(() => simulation.stop());
    // Clean up the effect
    return () => {
      // Stop the simulation or any intervals/timers here
    }
  }, [chartData]) // Re-run the effect when 'chartData' data changes

  return <svg ref={svgRef}></svg>
}
