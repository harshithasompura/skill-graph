import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 h'),
  prefix: 'skill-graph',
})

export async function checkRateLimit(
  request: Request
): Promise<{ limited: boolean; response?: Response }> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'

  const { success, limit, remaining, reset } = await ratelimit.limit(ip)

  if (!success) {
    return {
      limited: true,
      response: Response.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          },
        }
      ),
    }
  }

  return { limited: false }
}
