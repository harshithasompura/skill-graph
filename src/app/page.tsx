'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import SearchBar from '@/components/SearchBar'
import InsightsPanel from '@/components/InsightsPanel'

const GraphCanvas = dynamic(() => import('@/components/GraphCanvas'), { ssr: false })
import type { GraphData, InsightsData } from '@/lib/types'

function SkillGraph() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  useEffect(() => {
    const skill = searchParams.get('skill')
    if (skill) setSelectedNode(`skill:${skill}`)
  }, [searchParams])

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(prev => (prev === nodeId ? null : nodeId))
      const colonIdx = nodeId.indexOf(':')
      const type = nodeId.slice(0, colonIdx)
      const label = nodeId.slice(colonIdx + 1)
      if (type === 'skill') {
        router.replace(`/?skill=${encodeURIComponent(label)}`, { scroll: false })
      } else {
        router.replace('/', { scroll: false })
      }
    },
    [router]
  )

  const handleClose = useCallback(() => {
    setSelectedNode(null)
    router.replace('/', { scroll: false })
  }, [router])

  const { data: graphData, isLoading } = useQuery<GraphData>({
    queryKey: ['graph'],
    queryFn: () => fetch('/api/graph').then(r => r.json()),
  })

  const { data: insights } = useQuery<InsightsData>({
    queryKey: ['insights', selectedNode],
    queryFn: () =>
      fetch(`/api/insights?id=${encodeURIComponent(selectedNode!)}`).then(r => r.json()),
    enabled: !!selectedNode,
  })

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <span className="text-sm font-mono text-foreground font-medium whitespace-nowrap">
          ai / skill-graph
        </span>
        <div className="flex-1 max-w-sm">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search skills, roles, companies..."
          />
        </div>
        {graphData && (
          <span className="text-xs text-muted font-mono whitespace-nowrap">
            {graphData.nodes.length} nodes · {graphData.edges.length} edges
          </span>
        )}
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-muted font-mono">loading graph...</span>
            </div>
          )}
          {graphData && (
            <GraphCanvas
              data={graphData}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              searchQuery={searchQuery}
            />
          )}
        </div>
        <InsightsPanel insights={insights ?? null} onClose={handleClose} />
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <SkillGraph />
    </Suspense>
  )
}
