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

  const { data: insights, isError: insightsError, error: insightsErr } = useQuery<InsightsData>({
    queryKey: ['insights', selectedNode],
    queryFn: async () => {
      const r = await fetch(`/api/insights?id=${encodeURIComponent(selectedNode!)}`)
      if (r.status === 429) throw Object.assign(new Error('rate_limited'), { status: 429 })
      return r.json()
    },
    enabled: !!selectedNode,
    retry: false,
  })

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">

      {/* centered card area */}
      <div className="flex-1 flex items-center justify-center p-6 min-w-0">
        <div className="w-full max-w-5xl h-full max-h-[78vh] bg-surface border border-border flex flex-col overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>

          {/* titlebar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex gap-1.5 flex-shrink-0">
              <span className="w-3 h-3 rounded-full border border-border bg-background" />
              <span className="w-3 h-3 rounded-full border border-border bg-background" />
              <span className="w-3 h-3 rounded-full border border-border bg-background" />
            </div>
            <span className="text-xs font-mono text-muted">
              <span className="text-foreground">ai</span> / skill-graph
            </span>
            <div className="flex-1 max-w-xs">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="search nodes..."
              />
            </div>
            {graphData?.nodes && (
              <span className="text-xs text-muted font-mono whitespace-nowrap tabular-nums ml-auto">
                {graphData.nodes.length} nodes · {graphData.edges.length} edges
              </span>
            )}
          </div>

          {/* graph */}
          <div className="flex-1 relative min-h-0">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-muted"
                    style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            )}
            {graphData?.nodes && (
              <GraphCanvas
                data={graphData}
                selectedNode={selectedNode}
                onNodeClick={handleNodeClick}
                searchQuery={searchQuery}
              />
            )}
            {searchQuery && graphData?.nodes && !graphData.nodes.some(n =>
              n.label.toLowerCase().includes(searchQuery.toLowerCase())
            ) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-mono text-muted">no nodes match &ldquo;{searchQuery}&rdquo;</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* sidebar — outside card, full viewport height */}
      <InsightsPanel
        insights={insights ?? null}
        rateLimited={insightsError && (insightsErr as {status?: number})?.status === 429}
        onClose={handleClose}
      />
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
