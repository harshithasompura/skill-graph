import { buildGraph, getNodeInsights } from '@/lib/graph-builder'
import testJobs from '../fixtures/test-jobs.json'
import type { Job } from '@/lib/types'

const jobs = testJobs as Job[]

describe('buildGraph', () => {
  test('creates skill, role, and company nodes', () => {
    const { nodes } = buildGraph(jobs)
    expect(nodes.some(n => n.type === 'skill' && n.label === 'Python')).toBe(true)
    expect(nodes.some(n => n.type === 'role' && n.label === 'AI Engineer')).toBe(true)
    expect(nodes.some(n => n.type === 'company' && n.label === 'TestCo')).toBe(true)
  })

  test('deduplicates nodes', () => {
    const { nodes } = buildGraph(jobs)
    expect(nodes.filter(n => n.label === 'Python')).toHaveLength(1)
  })

  test('sets jobCount correctly on skill nodes', () => {
    const { nodes } = buildGraph(jobs)
    const python = nodes.find(n => n.label === 'Python')!
    expect(python.jobCount).toBe(2)
  })

  test('creates REQUIRES edges from role to skill', () => {
    const { edges } = buildGraph(jobs)
    const req = edges.filter(e => e.type === 'REQUIRES')
    expect(req.length).toBeGreaterThan(0)
    expect(req[0].source).toMatch(/^role:/)
    expect(req[0].target).toMatch(/^skill:/)
  })

  test('creates COMMONLY_PAIRED_WITH edges for co-occurring skills', () => {
    const { edges } = buildGraph(jobs)
    const paired = edges.filter(e => e.type === 'COMMONLY_PAIRED_WITH')
    const pythonLangGraph = paired.find(
      e =>
        (e.source === 'skill:Python' && e.target === 'skill:LangGraph') ||
        (e.source === 'skill:LangGraph' && e.target === 'skill:Python')
    )
    expect(pythonLangGraph).toBeDefined()
    expect(pythonLangGraph!.weight).toBe(2)
  })

  test('creates HIRED_BY edges from role to company', () => {
    const { edges } = buildGraph(jobs)
    expect(edges.filter(e => e.type === 'HIRED_BY').length).toBeGreaterThan(0)
  })
})

describe('getNodeInsights', () => {
  test('returns correct jobCount for skill node', () => {
    const ins = getNodeInsights(jobs, 'skill:Python')
    expect(ins.jobCount).toBe(2)
    expect(ins.label).toBe('Python')
    expect(ins.type).toBe('skill')
  })

  test('returns topCoSkills for skill node', () => {
    const ins = getNodeInsights(jobs, 'skill:Python')
    expect(ins.topCoSkills).toContain('LangGraph')
  })

  test('returns topCompanies for skill node', () => {
    const ins = getNodeInsights(jobs, 'skill:Python')
    expect(ins.topCompanies).toContain('TestCo')
  })
})
