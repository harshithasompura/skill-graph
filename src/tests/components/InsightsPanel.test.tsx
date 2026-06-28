import { render, screen, fireEvent } from '@testing-library/react'
import InsightsPanel from '@/components/InsightsPanel'
import type { InsightsData } from '@/lib/types'

const mockInsights: InsightsData = {
  id: 'skill:LangGraph',
  label: 'LangGraph',
  type: 'skill',
  jobCount: 8,
  topCoSkills: ['Python', 'TypeScript', 'MCP', 'Redis', 'RAG'],
  topRoles: ['AI Engineer', 'LLM Engineer'],
  topCompanies: ['Anthropic', 'Perplexity', 'Replit'],
  topSkills: [],
}

describe('InsightsPanel', () => {
  test('renders node label and job count', () => {
    render(<InsightsPanel insights={mockInsights} onClose={() => {}} />)
    expect(screen.getByText('LangGraph')).toBeInTheDocument()
    expect(screen.getByText('8 jobs')).toBeInTheDocument()
  })

  test('renders top co-skills for skill node', () => {
    render(<InsightsPanel insights={mockInsights} onClose={() => {}} />)
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  test('renders top companies', () => {
    render(<InsightsPanel insights={mockInsights} onClose={() => {}} />)
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
  })

  test('calls onClose when close button clicked', () => {
    const onClose = jest.fn()
    render(<InsightsPanel insights={mockInsights} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('renders nothing when insights is null', () => {
    const { container } = render(<InsightsPanel insights={null} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
