import { JobSchema } from '@/lib/types'

describe('JobSchema', () => {
  test('validates a complete valid job', () => {
    const result = JobSchema.safeParse({
      id: 'job-001',
      title: 'AI Engineer',
      company: 'Anthropic',
      role: 'AI Engineer',
      skills: ['Python', 'TypeScript'],
    })
    expect(result.success).toBe(true)
  })

  test('rejects job with empty skills array', () => {
    const result = JobSchema.safeParse({
      id: 'job-001',
      title: 'AI Engineer',
      company: 'Anthropic',
      role: 'AI Engineer',
      skills: [],
    })
    expect(result.success).toBe(false)
  })

  test('rejects job missing required fields', () => {
    const result = JobSchema.safeParse({ id: 'job-001' })
    expect(result.success).toBe(false)
  })
})
