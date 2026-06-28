import { z } from 'zod'

export const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  role: z.string(),
  skills: z.array(z.string()).min(1),
})

export type Job = z.infer<typeof JobSchema>

export type NodeType = 'skill' | 'role' | 'company'
export type EdgeType = 'REQUIRES' | 'COMMONLY_PAIRED_WITH' | 'HIRED_BY'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  jobCount: number
  size: number
  color: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface InsightsData {
  id: string
  label: string
  type: NodeType
  jobCount: number
  topCoSkills: string[]
  topRoles: string[]
  topCompanies: string[]
  topSkills: string[]
}
