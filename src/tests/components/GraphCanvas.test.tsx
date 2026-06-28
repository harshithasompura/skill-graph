import { render, screen } from '@testing-library/react'
import GraphCanvas from '@/components/GraphCanvas'
import type { GraphData } from '@/lib/types'

jest.mock('@react-sigma/core', () => ({
  SigmaContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sigma-container">{children}</div>
  ),
  useLoadGraph: () => jest.fn(),
  useRegisterEvents: () => jest.fn(),
  useSigma: () => ({
    setSetting: jest.fn(),
    refresh: jest.fn(),
    getGraph: () => ({ neighbors: () => [], source: () => '', target: () => '' }),
  }),
}))

jest.mock('graphology', () =>
  jest.fn().mockImplementation(() => ({
    addNode: jest.fn(),
    addEdge: jest.fn(),
    hasNode: jest.fn().mockReturnValue(true),
  }))
)

const mockData: GraphData = {
  nodes: [{ id: 'skill:Python', label: 'Python', type: 'skill', jobCount: 5, size: 6, color: '#9CA3AF' }],
  edges: [],
}

test('renders sigma container', () => {
  render(
    <GraphCanvas data={mockData} selectedNode={null} onNodeClick={() => {}} searchQuery="" />
  )
  expect(screen.getByTestId('sigma-container')).toBeInTheDocument()
})
