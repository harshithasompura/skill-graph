'use client'

import '@react-sigma/core/lib/style.css'
import { useEffect } from 'react'
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core'
import Graph from 'graphology'
import type { GraphData } from '@/lib/types'

const TEAL = '#2DD4BF'
const GRAY = '#9CA3AF'
const FADED = '#D1D5DB'

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
        label: n.label, size: n.size, color: GRAY, nodeType: n.type, jobCount: n.jobCount,
        x: Math.random() * 100, y: Math.random() * 100,
      })
    )
    data.edges.forEach(e => {
      if (!g.hasNode(e.source) || !g.hasNode(e.target)) return
      g.addEdge(e.source, e.target, { size: Math.min(e.weight * 0.5, 3), color: '#E5E4E0', edgeType: e.type })
    })
    loadGraph(g)
    sigma.resize()
    sigma.refresh()
  }, [data, loadGraph, sigma])

  useEffect(() => {
    registerEvents({ clickNode: ({ node }: { node: string }) => onNodeClick(node) })
  }, [registerEvents, onNodeClick])

  useEffect(() => {
    const g = sigma.getGraph()
    sigma.setSetting('nodeReducer', (node: string, attrs: Record<string, unknown>) => {
      if (searchQuery && (attrs.label as string).toLowerCase().includes(searchQuery.toLowerCase()))
        return { ...attrs, color: TEAL, size: (attrs.size as number) * 1.3 }
      if (!selectedNode) return { ...attrs, color: GRAY }
      if (node === selectedNode) return { ...attrs, color: TEAL, size: (attrs.size as number) * 1.5 }
      if ((g.neighbors(selectedNode) as string[]).includes(node)) return { ...attrs, color: TEAL }
      return { ...attrs, color: FADED, size: (attrs.size as number) * 0.7 }
    })
    sigma.setSetting('edgeReducer', (_edge: string, attrs: Record<string, unknown>) => {
      if (!selectedNode) return { ...attrs, color: '#E5E4E0' }
      if (g.source(_edge) === selectedNode || g.target(_edge) === selectedNode)
        return { ...attrs, color: TEAL }
      return { ...attrs, color: '#F0EFEB' }
    })
    sigma.refresh()
  }, [selectedNode, searchQuery, sigma])

  return null
}

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <SigmaContainer
      style={{ position: 'absolute', inset: 0, background: 'transparent' }}
      settings={{
        labelFont: 'ui-monospace, monospace',
        labelSize: 11,
        labelColor: { color: '#1A1A1A' },
        defaultEdgeColor: '#E5E4E0',
        defaultNodeColor: GRAY,
        renderEdgeLabels: false,
        allowInvalidContainer: true,
      }}
    >
      <GraphInner {...props} />
    </SigmaContainer>
  )
}
