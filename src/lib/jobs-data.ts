import { z } from 'zod'
import { JobSchema } from './types'
import type { Job } from './types'
import jobsRaw from '../../data/jobs.json'

export function loadJobs(): Job[] {
  const result = z.array(JobSchema).safeParse(jobsRaw)
  if (!result.success) throw new Error(`Invalid jobs.json: ${result.error.message}`)
  return result.data
}
