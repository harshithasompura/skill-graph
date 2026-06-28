import { writeFileSync } from 'fs'
import { z } from 'zod'
import { JobSchema } from '../src/lib/types'
import type { Job } from '../src/lib/types'

const API_BASE = 'https://aidevboard.com/api/v1'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DRY_RUN = process.argv.includes('--dry-run')

const RawJobSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string(),
  company: z.string().optional().default('Unknown'),
  description: z.string().optional().default(''),
})

const JobsPageSchema = z.object({
  jobs: z.array(RawJobSchema),
  has_next: z.boolean().optional().default(false),
  total_pages: z.number().optional().default(1),
})

async function fetchAllJobs() {
  const results: z.infer<typeof RawJobSchema>[] = []
  let page = 1

  while (true) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.AIDEVJOBS_API_KEY) headers['X-API-Key'] = process.env.AIDEVJOBS_API_KEY

    const res = await fetch(`${API_BASE}/jobs?page=${page}&per_page=50`, { headers })
    if (!res.ok) throw new Error(`Jobs API ${res.status}: ${await res.text()}`)

    const parsed = JobsPageSchema.parse(await res.json())
    results.push(...parsed.jobs)

    if (!parsed.has_next || page >= parsed.total_pages) break
    page++
    await new Promise(r => setTimeout(r, 500))
  }

  return results
}

async function extractSkillsAndRole(raw: { title: string; company: string; description: string }) {
  const prompt = `Extract the job role and required technical skills from this AI engineering job.
Return ONLY valid JSON: {"role": "string", "skills": ["string"]}
Role must be one of: AI Engineer, Applied ML Engineer, LLM Engineer, AI Product Engineer, ML Infrastructure Engineer, Research Engineer, Full-Stack AI Engineer
Skills: specific technologies only (e.g. Python, TypeScript, LangGraph, PyTorch) — max 10 items.

Title: ${raw.title}
Company: ${raw.company}
Description: ${raw.description.slice(0, 800)}`

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-small-3.1-24b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)

  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? '{}'

  try {
    const match = content.match(/\{[\s\S]*\}/)
    const extracted = JSON.parse(match?.[0] ?? '{}')
    return {
      role: (extracted.role as string) ?? raw.title,
      skills: Array.isArray(extracted.skills) ? (extracted.skills as string[]).slice(0, 10) : [],
    }
  } catch {
    return { role: raw.title, skills: [] }
  }
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not set')
    process.exit(1)
  }

  console.log(`Fetching jobs from aidevboard.com${DRY_RUN ? ' [DRY RUN]' : ''}...`)
  const rawJobs = await fetchAllJobs()
  console.log(`Fetched ${rawJobs.length} jobs. Extracting skills via OpenRouter...`)

  const jobs: Job[] = []
  let skipped = 0
  const limit = DRY_RUN ? 3 : rawJobs.length

  for (let i = 0; i < limit; i++) {
    const raw = rawJobs[i]
    try {
      const { role, skills } = await extractSkillsAndRole({
        title: raw.title,
        company: raw.company,
        description: raw.description,
      })

      const result = JobSchema.safeParse({ id: raw.id, title: raw.title, company: raw.company, role, skills })

      if (result.success) {
        jobs.push(result.data)
        console.log(`[${i + 1}/${limit}] ✓ ${raw.title} @ ${raw.company}`)
      } else {
        skipped++
        console.log(`[${i + 1}/${limit}] ✗ validation failed`)
      }
    } catch (err) {
      skipped++
      console.error(`[${i + 1}/${limit}] ✗ ${err}`)
    }

    if (!DRY_RUN) await new Promise(r => setTimeout(r, 200))
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would write ${jobs.length} jobs. Sample:`)
    console.log(JSON.stringify(jobs[0], null, 2))
  } else {
    writeFileSync('data/jobs.json', JSON.stringify(jobs, null, 2))
    console.log(`\nWrote ${jobs.length} jobs to data/jobs.json (${skipped} skipped)`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
