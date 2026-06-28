# AI Engineering Skill Graph — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js app that visualizes AI engineering skills as an interactive graph — search a skill or role, see connections, click a node for an insights panel.

**Architecture:** Jobs data lives in `data/jobs.json` (committed, generated once by `scripts/fetch-jobs.ts`). A graph builder transforms that JSON into Graphology graph topology at request time. Two rate-limited API routes serve graph data and per-node insights. Frontend: search bar floats in the header above a full-screen Sigma.js canvas; clicking a node slides in an insights panel from the right; URL params (`?skill=LangGraph`) load with that node pre-selected.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v3, Zod v3, TanStack Query v5, Sigma.js v3 + Graphology v0.26, @react-sigma/core v3, @upstash/ratelimit, @upstash/redis, tsx (pipeline runner)

## Global Constraints

- Node.js ≥ 20, npm
- Next.js 15, App Router only — no Pages Router
- One accent color: `#2DD4BF` (teal). All other colors gray-scale only.
- Background: `#F5F4F0`. Text: `#1A1A1A`. Muted: `#9CA3AF`. Border: `#E5E4E0`.
- All UI text: monospace (`font-mono` Tailwind class)
- No decorative CSS — zero gradients, shadows, or `rounded` > `rounded-sm`
- Rate limit: 60 req/hour/IP on `/api/graph` and `/api/insights`
- `data/jobs.json` committed to repo — pipeline never runs at server request time
- Required env vars: `AIDEVJOBS_API_KEY`, `OPENROUTER_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- OpenRouter model: `mistralai/mistral-7b-instruct`

---

### Task 1: Project Scaffold & Dependencies

**Files:**
- Create: `package.json` (via create-next-app, then modified)
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/app/globals.css`
- Create: `.env.example`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

**Interfaces:**
- Produces: runnable Next.js 15 dev server, passing empty test suite, configured Tailwind with custom colors

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/som/Desktop/skill-graph
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --eslint \
  --yes
```

Expected: Next.js app files created, `npm install` run automatically.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install \
  graphology \
  graphology-layout-forceatlas2 \
  sigma \
  @react-sigma/core \
  @tanstack/react-query \
  zod \
  @upstash/ratelimit \
  @upstash/redis

npm install -D tsx @types/node
```

- [ ] **Step 3: Install Jest and React Testing Library**

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @types/jest
```

- [ ] **Step 5: Write `jest.config.ts`**

```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(config)
```

- [ ] **Step 6: Write `jest.setup.ts`**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Update `tailwind.config.ts`**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: '#2DD4BF',
        background: '#F5F4F0',
        foreground: '#1A1A1A',
        muted: '#9CA3AF',
        border: '#E5E4E0',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 8: Write `src/app/globals.css`**

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #F5F4F0;
  --foreground: #1A1A1A;
  --accent: #2DD4BF;
  --muted: #9CA3AF;
  --border: #E5E4E0;
}

* { box-sizing: border-box; }

html, body {
  height: 100%;
  background-color: var(--background);
  color: var(--foreground);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

- [ ] **Step 9: Write `.env.example`**

```
AIDEVJOBS_API_KEY=your_aidevjobs_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
```

- [ ] **Step 10: Write `next.config.ts`**

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

- [ ] **Step 11: Add scripts to `package.json`**

Add to the `"scripts"` section:
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "pipeline": "tsx scripts/fetch-jobs.ts"
}
```

- [ ] **Step 12: Verify dev server starts**

```bash
npm run dev
```
Expected: `▲ Next.js 15.x.x` with `Local: http://localhost:3000`, no errors.

- [ ] **Step 13: Verify tests pass**

```bash
npm test -- --passWithNoTests
```
Expected: `Test Suites: 0 passed`.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with all dependencies"
```

---

### Task 2: Types & Zod Schemas

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/tests/lib/types.test.ts`

**Interfaces:**
- Produces:
  - `Job` — raw job record matching `data/jobs.json` shape
  - `JobSchema` — Zod schema for `Job`
  - `NodeType` — `'skill' | 'role' | 'company'`
  - `EdgeType` — `'REQUIRES' | 'COMMONLY_PAIRED_WITH' | 'HIRED_BY'`
  - `GraphNode` — serializable node for API/frontend
  - `GraphEdge` — serializable edge for API/frontend
  - `GraphData` — `{ nodes: GraphNode[], edges: GraphEdge[] }`
  - `InsightsData` — per-node insights returned by `/api/insights`

- [ ] **Step 1: Write failing test first**

```typescript
// src/tests/lib/types.test.ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/tests/lib/types.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/types'`

- [ ] **Step 3: Write `src/lib/types.ts`**

```typescript
// src/lib/types.ts
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
  topCoSkills: string[]   // top 5 co-occurring skills (skill nodes)
  topRoles: string[]      // top 5 roles (skill/company nodes)
  topCompanies: string[]  // top 5 companies (skill/role nodes)
  topSkills: string[]     // top 5 skills required (role/company nodes)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- src/tests/lib/types.test.ts
```
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/tests/lib/types.test.ts
git commit -m "feat: Zod schemas and TypeScript types"
```

---

### Task 3: Seed Data

**Files:**
- Create: `data/jobs.json`

**Interfaces:**
- Produces: 20 job records matching `Job` schema, covering 17+ skills, 7 roles, 10 companies

(Validated by graph builder in Task 4. No separate test needed.)

- [ ] **Step 1: Write `data/jobs.json`**

```json
[
  {
    "id": "job-001",
    "title": "AI Engineer",
    "company": "Anthropic",
    "role": "AI Engineer",
    "skills": ["Python", "TypeScript", "MCP", "LangGraph", "Claude API", "Redis", "RAG", "Vector DB"]
  },
  {
    "id": "job-002",
    "title": "Applied ML Engineer",
    "company": "OpenAI",
    "role": "Applied ML Engineer",
    "skills": ["Python", "PyTorch", "LangGraph", "RAG", "OpenAI API", "FastAPI", "PostgreSQL"]
  },
  {
    "id": "job-003",
    "title": "LLM Engineer",
    "company": "Mistral AI",
    "role": "LLM Engineer",
    "skills": ["Python", "PyTorch", "Fine-tuning", "RLHF", "Transformers", "HuggingFace", "CUDA"]
  },
  {
    "id": "job-004",
    "title": "AI Product Engineer",
    "company": "Cursor",
    "role": "AI Product Engineer",
    "skills": ["TypeScript", "React", "OpenAI API", "Claude API", "MCP", "Redis", "PostgreSQL"]
  },
  {
    "id": "job-005",
    "title": "AI Engineer",
    "company": "Perplexity",
    "role": "AI Engineer",
    "skills": ["Python", "RAG", "Vector DB", "FastAPI", "Redis", "LangChain", "OpenAI API"]
  },
  {
    "id": "job-006",
    "title": "ML Infrastructure Engineer",
    "company": "Scale AI",
    "role": "ML Infrastructure Engineer",
    "skills": ["Python", "Kubernetes", "Docker", "PyTorch", "CUDA", "FastAPI", "PostgreSQL"]
  },
  {
    "id": "job-007",
    "title": "Research Engineer",
    "company": "Anthropic",
    "role": "Research Engineer",
    "skills": ["Python", "PyTorch", "RLHF", "Fine-tuning", "Transformers", "CUDA", "Claude API"]
  },
  {
    "id": "job-008",
    "title": "LLM Engineer",
    "company": "Cohere",
    "role": "LLM Engineer",
    "skills": ["Python", "Transformers", "HuggingFace", "Fine-tuning", "RAG", "Vector DB", "FastAPI"]
  },
  {
    "id": "job-009",
    "title": "AI Engineer",
    "company": "Replit",
    "role": "AI Engineer",
    "skills": ["TypeScript", "Python", "OpenAI API", "MCP", "LangGraph", "Redis", "Docker"]
  },
  {
    "id": "job-010",
    "title": "Full-Stack AI Engineer",
    "company": "Linear",
    "role": "Full-Stack AI Engineer",
    "skills": ["TypeScript", "React", "Claude API", "MCP", "PostgreSQL", "Redis", "RAG"]
  },
  {
    "id": "job-011",
    "title": "Applied ML Engineer",
    "company": "Databricks",
    "role": "Applied ML Engineer",
    "skills": ["Python", "PyTorch", "Spark", "MLflow", "Fine-tuning", "Transformers", "Kubernetes"]
  },
  {
    "id": "job-012",
    "title": "AI Engineer",
    "company": "Harvey AI",
    "role": "AI Engineer",
    "skills": ["Python", "TypeScript", "LangChain", "RAG", "Vector DB", "OpenAI API", "PostgreSQL"]
  },
  {
    "id": "job-013",
    "title": "LLM Engineer",
    "company": "Together AI",
    "role": "LLM Engineer",
    "skills": ["Python", "PyTorch", "CUDA", "Fine-tuning", "RLHF", "HuggingFace", "Docker"]
  },
  {
    "id": "job-014",
    "title": "AI Product Engineer",
    "company": "Notion AI",
    "role": "AI Product Engineer",
    "skills": ["TypeScript", "React", "OpenAI API", "LangChain", "PostgreSQL", "Redis"]
  },
  {
    "id": "job-015",
    "title": "Research Engineer",
    "company": "Imbue",
    "role": "Research Engineer",
    "skills": ["Python", "PyTorch", "RLHF", "Fine-tuning", "CUDA", "Transformers", "LangGraph"]
  },
  {
    "id": "job-016",
    "title": "Full-Stack AI Engineer",
    "company": "Cursor",
    "role": "Full-Stack AI Engineer",
    "skills": ["TypeScript", "React", "Claude API", "OpenAI API", "MCP", "Redis", "PostgreSQL"]
  },
  {
    "id": "job-017",
    "title": "ML Infrastructure Engineer",
    "company": "Anthropic",
    "role": "ML Infrastructure Engineer",
    "skills": ["Python", "Kubernetes", "Docker", "CUDA", "PyTorch", "Redis", "PostgreSQL"]
  },
  {
    "id": "job-018",
    "title": "AI Engineer",
    "company": "Perplexity",
    "role": "AI Engineer",
    "skills": ["Python", "TypeScript", "LangGraph", "MCP", "RAG", "Vector DB", "FastAPI"]
  },
  {
    "id": "job-019",
    "title": "Applied ML Engineer",
    "company": "OpenAI",
    "role": "Applied ML Engineer",
    "skills": ["Python", "PyTorch", "Fine-tuning", "RLHF", "OpenAI API", "Docker", "Kubernetes"]
  },
  {
    "id": "job-020",
    "title": "AI Engineer",
    "company": "Harvey AI",
    "role": "AI Engineer",
    "skills": ["TypeScript", "Python", "Claude API", "LangGraph", "RAG", "Vector DB", "Redis"]
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add data/jobs.json
git commit -m "feat: seed jobs data (20 AI engineering jobs)"
```

---

### Task 4: Graph Builder

**Files:**
- Create: `src/lib/graph-builder.ts`
- Create: `src/tests/lib/graph-builder.test.ts`
- Create: `src/tests/fixtures/test-jobs.json`

**Interfaces:**
- Consumes: `Job`, `GraphData`, `GraphNode`, `GraphEdge`, `InsightsData`, `NodeType` (all from Task 2 — `src/lib/types.ts`)
- Produces:
  - `buildGraph(jobs: Job[]): GraphData`
  - `getNodeInsights(jobs: Job[], nodeId: string): InsightsData`
  - Node IDs follow pattern `skill:<label>`, `role:<label>`, `company:<label>`

- [ ] **Step 1: Write `src/tests/fixtures/test-jobs.json`**

```json
[
  {
    "id": "job-001",
    "title": "AI Engineer",
    "company": "TestCo",
    "role": "AI Engineer",
    "skills": ["Python", "TypeScript", "LangGraph"]
  },
  {
    "id": "job-002",
    "title": "ML Engineer",
    "company": "TestCo",
    "role": "ML Engineer",
    "skills": ["Python", "PyTorch", "LangGraph"]
  },
  {
    "id": "job-003",
    "title": "AI Engineer",
    "company": "OtherCo",
    "role": "AI Engineer",
    "skills": ["TypeScript", "Redis"]
  }
]
```

- [ ] **Step 2: Write failing tests**

```typescript
// src/tests/lib/graph-builder.test.ts
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
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npm test -- src/tests/lib/graph-builder.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/graph-builder'`

- [ ] **Step 4: Write `src/lib/graph-builder.ts`**

```typescript
// src/lib/graph-builder.ts
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
      return {
        id: `pair-${i}`,
        source: `skill:${a}`,
        target: `skill:${b}`,
        type: 'COMMONLY_PAIRED_WITH' as const,
        weight,
      }
    }),
  ]

  return { nodes, edges }
}

export function getNodeInsights(jobs: Job[], nodeId: string): InsightsData {
  const colonIdx = nodeId.indexOf(':')
  const type = nodeId.slice(0, colonIdx) as 'skill' | 'role' | 'company'
  const label = nodeId.slice(colonIdx + 1)

  const relevantJobs =
    type === 'skill'
      ? jobs.filter(j => j.skills.includes(label))
      : type === 'role'
      ? jobs.filter(j => j.role === label)
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
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k)

  return {
    id: nodeId,
    label,
    type,
    jobCount: relevantJobs.length,
    topCoSkills: type === 'skill' ? topN(skillCounts) : [],
    topRoles: topN(roleCounts),
    topCompanies: topN(companyCounts),
    topSkills: type !== 'skill' ? topN(skillCounts) : [],
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test -- src/tests/lib/graph-builder.test.ts
```
Expected: PASS — all 9 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/graph-builder.ts src/tests/lib/graph-builder.test.ts src/tests/fixtures/test-jobs.json
git commit -m "feat: graph builder — builds nodes/edges from jobs data"
```

---

### Task 5: Rate Limiter

**Files:**
- Create: `src/lib/rate-limit.ts`

**Interfaces:**
- Produces: `checkRateLimit(request: Request): Promise<{ limited: boolean; response?: Response }>`

(No unit test — requires live Upstash. Verified via curl in Task 6.)

- [ ] **Step 1: Write `src/lib/rate-limit.ts`**

```typescript
// src/lib/rate-limit.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: Upstash Redis rate limiter (60 req/hr per IP)"
```

---

### Task 6: API Routes

**Files:**
- Create: `src/lib/jobs-data.ts`
- Create: `src/app/api/graph/route.ts`
- Create: `src/app/api/insights/route.ts`

**Interfaces:**
- Consumes: `buildGraph` and `getNodeInsights` from `src/lib/graph-builder.ts` (Task 4); `checkRateLimit` from `src/lib/rate-limit.ts` (Task 5); `JobSchema` from `src/lib/types.ts` (Task 2)
- Produces:
  - `GET /api/graph` → `GraphData` JSON, 200 (or 429 if rate limited)
  - `GET /api/insights?id=<nodeId>` → `InsightsData` JSON, 200 (400 if missing id, 429 if rate limited)

- [ ] **Step 1: Write `src/lib/jobs-data.ts`**

```typescript
// src/lib/jobs-data.ts
import { z } from 'zod'
import { JobSchema } from './types'
import type { Job } from './types'
import jobsRaw from '../../data/jobs.json'

export function loadJobs(): Job[] {
  const result = z.array(JobSchema).safeParse(jobsRaw)
  if (!result.success) throw new Error(`Invalid jobs.json: ${result.error.message}`)
  return result.data
}
```

- [ ] **Step 2: Confirm `resolveJsonModule` is enabled in `tsconfig.json`**

Open `tsconfig.json` and verify `"resolveJsonModule": true` is present under `"compilerOptions"`. Next.js sets this by default; add it if missing.

- [ ] **Step 3: Write `src/app/api/graph/route.ts`**

```typescript
// src/app/api/graph/route.ts
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
```

- [ ] **Step 4: Write `src/app/api/insights/route.ts`**

```typescript
// src/app/api/insights/route.ts
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
```

- [ ] **Step 5: Copy credentials to `.env.local`**

Create `.env.local` in project root (git-ignored):
```
UPSTASH_REDIS_REST_URL=<your-url>
UPSTASH_REDIS_REST_TOKEN=<your-token>
AIDEVJOBS_API_KEY=<your-key>
OPENROUTER_API_KEY=<your-key>
```

- [ ] **Step 6: Start dev server and verify routes**

```bash
npm run dev
```

In a second terminal:
```bash
# Full graph
curl http://localhost:3000/api/graph
# Expected: {"nodes":[...],"edges":[...]}

# Node insights
curl "http://localhost:3000/api/insights?id=skill:Python"
# Expected: {"id":"skill:Python","label":"Python","type":"skill","jobCount":9,...}

# Missing param
curl "http://localhost:3000/api/insights"
# Expected: {"error":"Missing required param: id"} — HTTP 400
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/jobs-data.ts src/app/api/graph/route.ts src/app/api/insights/route.ts
git commit -m "feat: /api/graph and /api/insights routes with Upstash rate limiting"
```

---

### Task 7: SearchBar Component

**Files:**
- Create: `src/components/SearchBar.tsx`
- Create: `src/tests/components/SearchBar.test.tsx`

**Interfaces:**
- Produces: `<SearchBar value={string} onChange={(v: string) => void} placeholder?: string />`
- Debounces `onChange` by 300ms — parent never receives intermediate keystrokes

- [ ] **Step 1: Write failing test**

```typescript
// src/tests/components/SearchBar.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react'
import SearchBar from '@/components/SearchBar'

jest.useFakeTimers()

describe('SearchBar', () => {
  test('renders input with placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} placeholder="Search skills..." />)
    expect(screen.getByPlaceholderText('Search skills...')).toBeInTheDocument()
  })

  test('calls onChange after 300ms debounce', () => {
    const onChange = jest.fn()
    render(<SearchBar value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'LangGraph' } })
    expect(onChange).not.toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledWith('LangGraph')
  })

  test('does not fire before debounce window closes', () => {
    const onChange = jest.fn()
    render(<SearchBar value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'La' } })
    act(() => jest.advanceTimersByTime(100))
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/tests/components/SearchBar.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/SearchBar'`

- [ ] **Step 3: Write `src/components/SearchBar.tsx`**

```tsx
// src/components/SearchBar.tsx
'use client'

import { useState, useEffect, useRef } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search skills, roles...',
}: SearchBarProps) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocal(value) }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocal(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), 300)
  }

  return (
    <input
      type="text"
      value={local}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full bg-transparent border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
    />
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- src/tests/components/SearchBar.test.tsx
```
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchBar.tsx src/tests/components/SearchBar.test.tsx
git commit -m "feat: debounced SearchBar component"
```

---

### Task 8: GraphCanvas Component

**Files:**
- Create: `src/components/GraphCanvas.tsx`
- Create: `src/tests/components/GraphCanvas.test.tsx`

**Interfaces:**
- Consumes: `GraphData` from `src/lib/types.ts` (Task 2)
- Produces:
  ```tsx
  <GraphCanvas
    data={GraphData}
    selectedNode={string | null}
    onNodeClick={(nodeId: string) => void}
    searchQuery={string}
  />
  ```
- Node coloring rules: selected = teal + 1.5× size; neighbor of selected = teal; search match = teal + 1.3× size; all others = gray (or faded `#D1D5DB` when a node is selected)

- [ ] **Step 1: Write failing test**

```typescript
// src/tests/components/GraphCanvas.test.tsx
import { render, screen } from '@testing-library/react'
import GraphCanvas from '@/components/GraphCanvas'
import type { GraphData } from '@/lib/types'

jest.mock('@react-sigma/core', () => ({
  SigmaContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sigma-container">{children}</div>
  ),
  useLoadGraph: () => jest.fn(),
  useRegisterEvents: () => jest.fn(),
  useSigma: () => ({
    setSetting: jest.fn(),
    refresh: jest.fn(),
    getGraph: () => ({ neighbors: () => [], source: () => '', target: () => '' }),
  }),
}))

jest.mock('graphology', () =>
  jest.fn().mockImplementation(() => ({
    addNode: jest.fn(),
    addEdge: jest.fn(),
    hasNode: jest.fn().mockReturnValue(true),
  }))
)

const mockData: GraphData = {
  nodes: [{ id: 'skill:Python', label: 'Python', type: 'skill', jobCount: 5, size: 6, color: '#9CA3AF' }],
  edges: [],
}

test('renders sigma container', () => {
  render(
    <GraphCanvas data={mockData} selectedNode={null} onNodeClick={() => {}} searchQuery="" />
  )
  expect(screen.getByTestId('sigma-container')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/tests/components/GraphCanvas.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/GraphCanvas'`

- [ ] **Step 3: Write `src/components/GraphCanvas.tsx`**

```tsx
// src/components/GraphCanvas.tsx
'use client'

import { useEffect } from 'react'
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core'
import Graph from 'graphology'
import type { GraphData } from '@/lib/types'

const TEAL = '#2DD4BF'
const GRAY = '#9CA3AF'
const FADED = '#D1D5DB'

interface GraphCanvasProps {
  data: GraphData
  selectedNode: string | null
  onNodeClick: (nodeId: string) => void
  searchQuery: string
}

function GraphInner({ data, selectedNode, onNodeClick, searchQuery }: GraphCanvasProps) {
  const loadGraph = useLoadGraph()
  const registerEvents = useRegisterEvents()
  const sigma = useSigma()

  useEffect(() => {
    const graph = new Graph()
    data.nodes.forEach(n =>
      graph.addNode(n.id, { label: n.label, size: n.size, color: GRAY, type: n.type, jobCount: n.jobCount })
    )
    data.edges.forEach(e => {
      if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) return
      graph.addEdge(e.source, e.target, { size: Math.min(e.weight * 0.5, 3), color: '#E5E4E0', type: e.type })
    })
    loadGraph(graph)
  }, [data, loadGraph])

  useEffect(() => {
    registerEvents({ clickNode: ({ node }: { node: string }) => onNodeClick(node) })
  }, [registerEvents, onNodeClick])

  useEffect(() => {
    if (!sigma) return
    const g = sigma.getGraph()
    sigma.setSetting('nodeReducer', (node: string, attrs: Record<string, unknown>) => {
      if (searchQuery && (attrs.label as string).toLowerCase().includes(searchQuery.toLowerCase()))
        return { ...attrs, color: TEAL, size: (attrs.size as number) * 1.3 }
      if (!selectedNode) return { ...attrs, color: GRAY }
      if (node === selectedNode) return { ...attrs, color: TEAL, size: (attrs.size as number) * 1.5 }
      if ((g.neighbors(selectedNode) as string[]).includes(node)) return { ...attrs, color: TEAL }
      return { ...attrs, color: FADED, size: (attrs.size as number) * 0.7 }
    })
    sigma.setSetting('edgeReducer', (edge: string, attrs: Record<string, unknown>) => {
      if (!selectedNode) return { ...attrs, color: '#E5E4E0' }
      if (g.source(edge) === selectedNode || g.target(edge) === selectedNode) return { ...attrs, color: TEAL }
      return { ...attrs, color: '#F0EFEB' }
    })
    sigma.refresh()
  }, [selectedNode, searchQuery, sigma])

  return null
}

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <SigmaContainer
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      settings={{
        labelFont: 'ui-monospace, monospace',
        labelSize: 11,
        labelColor: { color: '#1A1A1A' },
        defaultEdgeColor: '#E5E4E0',
        defaultNodeColor: GRAY,
        renderEdgeLabels: false,
        allowInvalidContainer: true,
      }}
    >
      <GraphInner {...props} />
    </SigmaContainer>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- src/tests/components/GraphCanvas.test.tsx
```
Expected: PASS — 1 test green.

- [ ] **Step 5: Commit**

```bash
git add src/components/GraphCanvas.tsx src/tests/components/GraphCanvas.test.tsx
git commit -m "feat: Sigma.js GraphCanvas with teal selection and fade effects"
```

---

### Task 9: InsightsPanel Component

**Files:**
- Create: `src/components/InsightsPanel.tsx`
- Create: `src/tests/components/InsightsPanel.test.tsx`

**Interfaces:**
- Consumes: `InsightsData` from `src/lib/types.ts` (Task 2)
- Produces: `<InsightsPanel insights={InsightsData | null} onClose={() => void} />`
- Renders `null` when `insights` is `null`

- [ ] **Step 1: Write failing tests**

```typescript
// src/tests/components/InsightsPanel.test.tsx
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/tests/components/InsightsPanel.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/InsightsPanel'`

- [ ] **Step 3: Write `src/components/InsightsPanel.tsx`**

```tsx
// src/components/InsightsPanel.tsx
import type { InsightsData } from '@/lib/types'

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="mt-4">
      <p className="text-xs text-muted font-mono uppercase tracking-wider mb-1">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <span key={item} className="text-xs font-mono border border-border px-1.5 py-0.5 text-foreground">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

interface InsightsPanelProps {
  insights: InsightsData | null
  onClose: () => void
}

export default function InsightsPanel({ insights, onClose }: InsightsPanelProps) {
  if (!insights) return null

  const typeLabel =
    insights.type === 'skill' ? 'SKILL' : insights.type === 'role' ? 'ROLE' : 'COMPANY'

  return (
    <div className="h-full border-l border-border bg-background p-4 overflow-y-auto w-72 flex-shrink-0">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted font-mono">{typeLabel}</p>
          <h2 className="text-base font-mono font-medium text-foreground mt-0.5">{insights.label}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          className="text-muted hover:text-foreground font-mono text-sm leading-none ml-2"
        >
          ×
        </button>
      </div>

      <p className="text-sm font-mono text-accent">{insights.jobCount} jobs</p>

      {insights.type === 'skill' && (
        <>
          <Section title="Most common with" items={insights.topCoSkills} />
          <Section title="Roles" items={insights.topRoles} />
          <Section title="Companies hiring" items={insights.topCompanies} />
        </>
      )}

      {insights.type === 'role' && (
        <>
          <Section title="Skills required" items={insights.topSkills} />
          <Section title="Companies hiring" items={insights.topCompanies} />
        </>
      )}

      {insights.type === 'company' && (
        <>
          <Section title="Skills sought" items={insights.topSkills} />
          <Section title="Roles" items={insights.topRoles} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/tests/components/InsightsPanel.test.tsx
```
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/InsightsPanel.tsx src/tests/components/InsightsPanel.test.tsx
git commit -m "feat: InsightsPanel with co-skills, roles, companies"
```

---

### Task 10: Main Page & Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/providers.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `SearchBar` (Task 7), `GraphCanvas` (Task 8), `InsightsPanel` (Task 9), `GraphData` and `InsightsData` from `src/lib/types.ts` (Task 2)
- Produces: working single-page app — graph loads on mount, search highlights nodes, click opens insights, URL reflects selected skill node

- [ ] **Step 1: Write `src/app/providers.tsx`**

```tsx
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } } })
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] **Step 2: Write `src/app/layout.tsx`**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'AI Skill Graph',
  description: 'Explore skills, roles, and companies in the AI engineering landscape',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Write `src/app/page.tsx`**

```tsx
// src/app/page.tsx
'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import SearchBar from '@/components/SearchBar'
import GraphCanvas from '@/components/GraphCanvas'
import InsightsPanel from '@/components/InsightsPanel'
import type { GraphData, InsightsData } from '@/lib/types'

function SkillGraph() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Load ?skill= param on mount
  useEffect(() => {
    const skill = searchParams.get('skill')
    if (skill) setSelectedNode(`skill:${skill}`)
  }, [searchParams])

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(prev => (prev === nodeId ? null : nodeId))
      const colonIdx = nodeId.indexOf(':')
      const type = nodeId.slice(0, colonIdx)
      const label = nodeId.slice(colonIdx + 1)
      if (type === 'skill') {
        router.replace(`/?skill=${encodeURIComponent(label)}`, { scroll: false })
      } else {
        router.replace('/', { scroll: false })
      }
    },
    [router]
  )

  const handleClose = useCallback(() => {
    setSelectedNode(null)
    router.replace('/', { scroll: false })
  }, [router])

  const { data: graphData, isLoading } = useQuery<GraphData>({
    queryKey: ['graph'],
    queryFn: () => fetch('/api/graph').then(r => r.json()),
  })

  const { data: insights } = useQuery<InsightsData>({
    queryKey: ['insights', selectedNode],
    queryFn: () =>
      fetch(`/api/insights?id=${encodeURIComponent(selectedNode!)}`).then(r => r.json()),
    enabled: !!selectedNode,
  })

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <span className="text-sm font-mono text-foreground font-medium whitespace-nowrap">
          ai / skill-graph
        </span>
        <div className="flex-1 max-w-sm">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search skills, roles, companies..."
          />
        </div>
        {graphData && (
          <span className="text-xs text-muted font-mono whitespace-nowrap">
            {graphData.nodes.length} nodes · {graphData.edges.length} edges
          </span>
        )}
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-muted font-mono">loading graph...</span>
            </div>
          )}
          {graphData && (
            <GraphCanvas
              data={graphData}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              searchQuery={searchQuery}
            />
          )}
        </div>
        <InsightsPanel insights={insights ?? null} onClose={handleClose} />
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <SkillGraph />
    </Suspense>
  )
}
```

- [ ] **Step 4: Run dev server and manually verify full flow**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
1. Graph loads — nodes visible, status line shows "N nodes · M edges"
2. Type "Python" in search → Python node highlights teal
3. Click any node → InsightsPanel opens on right
4. Panel shows: type badge, label, job count, co-skills/roles/companies
5. Close button (×) dismisses panel
6. URL becomes `/?skill=Python` when skill node clicked
7. Load `http://localhost:3000/?skill=Python` directly → Python node pre-selected, panel opens

- [ ] **Step 5: Run full test suite**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/providers.tsx src/app/page.tsx
git commit -m "feat: main page — graph + search + insights panel + shareable URLs"
```

---

### Task 11: Data Pipeline Script

**Files:**
- Create: `scripts/fetch-jobs.ts`

**Interfaces:**
- Consumes: `AIDEVJOBS_API_KEY` env var (optional, sent as `X-API-Key` header), `OPENROUTER_API_KEY` env var (required), `JobSchema` from `src/lib/types.ts` (Task 2)
- Produces: `data/jobs.json` overwritten with fresh extracted jobs
- Run: `npm run pipeline` (live) or `npm run pipeline -- --dry-run` (tests first 3 jobs, no file write)

- [ ] **Step 1: Write `scripts/fetch-jobs.ts`**

```typescript
// scripts/fetch-jobs.ts
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
      model: 'mistralai/mistral-7b-instruct',
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
```

- [ ] **Step 2: Test pipeline in dry-run mode**

```bash
npm run pipeline -- --dry-run
```
Expected:
```
Fetching jobs from aidevboard.com [DRY RUN]...
Fetched N jobs. Extracting skills via OpenRouter...
[1/3] ✓ <title> @ <company>
[2/3] ✓ ...
[3/3] ✓ ...

[DRY RUN] Would write 3 jobs. Sample:
{
  "id": "...",
  "title": "...",
  ...
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-jobs.ts
git commit -m "feat: data pipeline — aidevboard.com → OpenRouter → jobs.json"
```

---

## Self-Review

### Spec coverage

| Requirement | Task covering it |
|---|---|
| Search skill/role → interactive graph | Task 10 (SearchBar + GraphCanvas) |
| Click node → insights panel | Task 10 (handleNodeClick) + Task 9 |
| Next.js, TanStack Query, Zod, Sigma.js + Graphology, Tailwind, Upstash | Tasks 1, 2, 4, 5, 8 |
| AI Dev Jobs API → OpenRouter → Zod → jobs.json | Task 11 |
| Nodes: Skill, Role, Company | Task 4 (buildGraph) |
| Edges: REQUIRES, COMMONLY_PAIRED_WITH, HIRED_BY | Task 4 (buildGraph) |
| Unselected gray, selected + neighbors teal, others faded | Task 8 (GraphInner reducers) |
| Insights: job count, co-skills, companies, roles | Task 9 (InsightsPanel + Section) |
| hojiben.com aesthetic — off-white, mono, hairline, no decoration, one accent | Tasks 1, 7, 8, 9, 10 |
| Rate limiting on /api/graph and /api/insights | Tasks 5 + 6 |
| Shareable URLs `/?skill=LangGraph` | Task 10 (useSearchParams + router.replace) |

All requirements covered. No gaps.

### Placeholder scan

No TBDs, "implement later", or "similar to Task N" patterns. All code blocks complete.

### Type consistency

- `GraphData`, `GraphNode`, `GraphEdge`, `InsightsData`, `Job` defined in Task 2, consumed correctly in Tasks 4, 6, 8, 9, 10.
- `buildGraph` returns `GraphData` ✓
- `getNodeInsights` returns `InsightsData` ✓
- `checkRateLimit` returns `{ limited: boolean; response?: Response }` ✓
- `GraphCanvas` props match usage in `page.tsx` ✓
- `InsightsPanel` props match usage in `page.tsx` ✓
- `SearchBar` props match usage in `page.tsx` ✓
- Node IDs consistently follow `skill:<label>`, `role:<label>`, `company:<label>` pattern across builder, API routes, and page ✓
