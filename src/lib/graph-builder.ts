import type { Job, GraphData, GraphNode, GraphEdge, InsightsData } from './types'

const GRAY = '#9CA3AF'

export function buildGraph(jobs: Job[]): GraphData {
  const skillCounts = new Map<string, number>()
  const roleCounts = new Map<string, number>()
  const companyCounts = new Map<string, number>()
  const coOccurrence = new Map<string, number>()
  const requires = new Map<string, number>()
  const hiredBy = new Map<string, number>()

  for (const job of jobs) {
    job.skills.forEach(s => skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1))
    roleCounts.set(job.role, (roleCounts.get(job.role) ?? 0) + 1)
    companyCounts.set(job.company, (companyCounts.get(job.company) ?? 0) + 1)

    job.skills.forEach(s => {
      const key = `role:${job.role}|||skill:${s}`
      requires.set(key, (requires.get(key) ?? 0) + 1)
    })

    const hk = `role:${job.role}|||company:${job.company}`
    hiredBy.set(hk, (hiredBy.get(hk) ?? 0) + 1)

    for (let i = 0; i < job.skills.length; i++) {
      for (let j = i + 1; j < job.skills.length; j++) {
        const si = job.skills[i], sj = job.skills[j]
        const key = si < sj ? `${si}|||${sj}` : `${sj}|||${si}`
        coOccurrence.set(key, (coOccurrence.get(key) ?? 0) + 1)
      }
    }
  }

  const maxCount = Math.max(
    ...skillCounts.values(),
    ...roleCounts.values(),
    ...companyCounts.values(),
    1
  )

  const nodes: GraphNode[] = []
  for (const [label, count] of skillCounts)
    nodes.push({ id: `skill:${label}`, label, type: 'skill', jobCount: count, size: 3 + (count / maxCount) * 10, color: GRAY })
  for (const [label, count] of roleCounts)
    nodes.push({ id: `role:${label}`, label, type: 'role', jobCount: count, size: 5 + (count / maxCount) * 10, color: GRAY })
  for (const [label, count] of companyCounts)
    nodes.push({ id: `company:${label}`, label, type: 'company', jobCount: count, size: 4 + (count / maxCount) * 8, color: GRAY })

  const edges: GraphEdge[] = [
    ...Array.from(requires.entries()).map(([key, weight], i) => {
      const [source, target] = key.split('|||')
      return { id: `req-${i}`, source, target, type: 'REQUIRES' as const, weight }
    }),
    ...Array.from(hiredBy.entries()).map(([key, weight], i) => {
      const [source, target] = key.split('|||')
      return { id: `hired-${i}`, source, target, type: 'HIRED_BY' as const, weight }
    }),
    ...Array.from(coOccurrence.entries()).map(([key, weight], i) => {
      const [a, b] = key.split('|||')
      return { id: `pair-${i}`, source: `skill:${a}`, target: `skill:${b}`, type: 'COMMONLY_PAIRED_WITH' as const, weight }
    }),
  ]

  return { nodes, edges }
}

export function getNodeInsights(jobs: Job[], nodeId: string): InsightsData {
  const colonIdx = nodeId.indexOf(':')
  const type = nodeId.slice(0, colonIdx) as 'skill' | 'role' | 'company'
  const label = nodeId.slice(colonIdx + 1)

  const relevantJobs =
    type === 'skill' ? jobs.filter(j => j.skills.includes(label))
    : type === 'role' ? jobs.filter(j => j.role === label)
    : jobs.filter(j => j.company === label)

  const roleCounts = new Map<string, number>()
  const companyCounts = new Map<string, number>()
  const skillCounts = new Map<string, number>()

  for (const job of relevantJobs) {
    roleCounts.set(job.role, (roleCounts.get(job.role) ?? 0) + 1)
    companyCounts.set(job.company, (companyCounts.get(job.company) ?? 0) + 1)
    job.skills.forEach(s => {
      if (type === 'skill' && s === label) return
      skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1)
    })
  }

  const topN = (map: Map<string, number>, n = 5) =>
    Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)

  return {
    id: nodeId, label, type, jobCount: relevantJobs.length,
    topCoSkills: type === 'skill' ? topN(skillCounts) : [],
    topRoles: topN(roleCounts),
    topCompanies: topN(companyCounts),
    topSkills: type !== 'skill' ? topN(skillCounts) : [],
  }
}
