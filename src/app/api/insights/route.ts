import { checkRateLimit } from '@/lib/rate-limit'
import { getNodeInsights } from '@/lib/graph-builder'
import { loadJobs } from '@/lib/jobs-data'

export async function GET(request: Request) {
  const { limited, response } = await checkRateLimit(request)
  if (limited) return response!

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return Response.json({ error: 'Missing required param: id' }, { status: 400 })
  }

  const jobs = loadJobs()
  const insights = getNodeInsights(jobs, id)
  return Response.json(insights)
}
