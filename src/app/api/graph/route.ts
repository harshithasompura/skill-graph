import { checkRateLimit } from '@/lib/rate-limit'
import { buildGraph } from '@/lib/graph-builder'
import { loadJobs } from '@/lib/jobs-data'

export async function GET(request: Request) {
  const { limited, response } = await checkRateLimit(request)
  if (limited) return response!

  const jobs = loadJobs()
  const graph = buildGraph(jobs)
  return Response.json(graph)
}
