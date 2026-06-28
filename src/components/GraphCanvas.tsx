'use client'

import '@react-sigma/core/lib/style.css'
import { useEffect } from 'react'
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core'
import Graph from 'graphology'
import type { GraphData } from '@/lib/types'

const TEAL = '#0D9488'
const FADED = '#D6D5D1'
const FADED_LABEL = '#BBBBBB'

function drawPillLabel(
  context: CanvasRenderingContext2D,
  data: { x: number; y: number; size: number; label: string; color: string },
  settings: { labelFont: string; labelSize: number }
) {
  if (!data.label) return
  const size = settings.labelSize ?? 12
  context.font = `500 ${size}px ${settings.labelFont ?? 'ui-monospace, monospace'}`
  const tw = context.measureText(data.label).width
  const px = 7, py = 3
  const w = tw + px * 2
  const h = size + py * 2
  const x = data.x + data.size + 5
  const y = data.y - h / 2
  const r = h / 2
  // pill
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + w, y, x + w, y + h, r)
  context.arcTo(x + w, y + h, x, y + h, r)
  context.arcTo(x, y + h, x, y, r)
  context.arcTo(x, y, x + w, y, r)
  context.closePath()
  context.fillStyle = 'rgba(255,255,255,0.85)'
  context.fill()
  context.strokeStyle = 'rgba(0,0,0,0.08)'
  context.lineWidth = 0.75
  context.stroke()
  // text
  context.fillStyle = data.color === TEAL ? TEAL : '#2A2A2A'
  context.fillText(data.label, x + px, y + py + size * 0.82)
}

const NODE_COLORS: Record<string, string> = {
  skill: '#0D9488',   // teal — primary
  role: '#52525B',    // zinc-600 — legible mid-gray
  company: '#A8A8A4', // warm gray — tertiary
}

interface GraphCanvasProps {
  data: GraphData
  selectedNode: string | null
  onNodeClick: (nodeId: string) => void
  searchQuery: string
}

function GraphInner({ data, selectedNode, onNodeClick, searchQuery }: GraphCanvasProps) {
  const loadGraph = useLoadGraph()
  const registerEvents = useRegisterEvents()
  const sigma = useSigma()

  useEffect(() => {
    const g = new Graph()
    data.nodes.forEach(n =>
      g.addNode(n.id, {
        label: n.label,
        size: Math.max(n.size, 5),
        color: NODE_COLORS[n.type] ?? '#888888',
        nodeType: n.type,
        jobCount: n.jobCount,
        x: Math.random() * 100,
        y: Math.random() * 100,
      })
    )
    data.edges.forEach(e => {
      if (!g.hasNode(e.source) || !g.hasNode(e.target)) return
      if (e.weight < 2) return  // ponytail: skip weak edges to reduce visual noise; lower threshold if graph feels sparse
      g.addEdge(e.source, e.target, { size: Math.min(e.weight * 0.25, 1.2), color: '#DDDCDA', edgeType: e.type })
    })
    loadGraph(g)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sigma.setSetting('defaultDrawNodeLabel', drawPillLabel as any)
    sigma.resize()
    sigma.refresh()
  }, [data, loadGraph, sigma])

  useEffect(() => {
    registerEvents({ clickNode: ({ node }: { node: string }) => onNodeClick(node) })
  }, [registerEvents, onNodeClick])

  useEffect(() => {
    const ro = new ResizeObserver(() => { sigma.resize(); sigma.refresh() })
    ro.observe(sigma.getContainer())
    return () => ro.disconnect()
  }, [sigma])

  useEffect(() => {
    const g = sigma.getGraph()
    sigma.setSetting('nodeReducer', (node: string, attrs: Record<string, unknown>) => {
      const typeColor = NODE_COLORS[attrs.nodeType as string] ?? '#888888'
      const baseSize = attrs.size as number

      if (searchQuery && (attrs.label as string).toLowerCase().includes(searchQuery.toLowerCase()))
        return { ...attrs, color: TEAL, size: baseSize * 1.4, borderColor: TEAL, borderSize: 1.5 }

      if (!selectedNode)
        return { ...attrs, color: typeColor }

      if (node === selectedNode)
        return { ...attrs, color: TEAL, size: baseSize * 1.8, borderColor: '#065F46', borderSize: 2.5 }

      if (g.hasNode(selectedNode) && (g.neighbors(selectedNode) as string[]).includes(node))
        return { ...attrs, color: typeColor, borderColor: TEAL, borderSize: 1 }

      return { ...attrs, color: FADED, size: baseSize * 0.65, labelColor: FADED_LABEL }
    })
    sigma.setSetting('edgeReducer', (_edge: string, attrs: Record<string, unknown>) => {
      if (!selectedNode) return { ...attrs, color: '#DDDCDA' }
      if (g.source(_edge) === selectedNode || g.target(_edge) === selectedNode)
        return { ...attrs, color: TEAL, size: (attrs.size as number) * 2 }
      return { ...attrs, color: '#ECEBE8' }
    })
    sigma.refresh()
  }, [selectedNode, searchQuery, sigma])

  return null
}

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <SigmaContainer
      style={{ position: 'absolute', inset: 0, background: '#F8F8F8' }}
      settings={{
        labelFont: 'ui-monospace, monospace',
        labelSize: 11,
        labelWeight: '500',
        labelColor: { color: '#2A2A2A' },
        labelRenderedSizeThreshold: 4,
        defaultEdgeColor: '#DDDCDA',
        defaultNodeColor: NODE_COLORS.company,
        renderEdgeLabels: false,
        allowInvalidContainer: true,
        minCameraRatio: 0.2,
        maxCameraRatio: 3,
      }}
    >
      <GraphInner {...props} />
    </SigmaContainer>
  )
}
