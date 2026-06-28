# skill-graph

An interactive graph visualization of AI dev job market skills, roles, and companies — built from live job postings.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Sigma.js](https://img.shields.io/badge/Sigma.js-3-teal)

## What it does

Fetches AI developer job listings, extracts skills and roles via an LLM, and renders the relationships as an interactive force-directed graph. Click any node to see co-occurring skills, hiring companies, and role context in a sidebar panel.

## Graph topology

Three node types with directional edges:

- **skill** — e.g. `Python`, `PyTorch`, `LangChain`
- **role** — e.g. `ML Engineer`, `AI Research Scientist`
- **company** — e.g. `OpenAI`, `Anthropic`

Three edge types:

- `REQUIRES` — role → skill
- `COMMONLY_PAIRED_WITH` — skill ↔ skill (co-occurrence)
- `HIRED_BY` — role → company

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Graph rendering | Sigma.js 3 + Graphology + ForceAtlas2 |
| Data fetching | TanStack Query |
| Rate limiting | Upstash Redis (60 req/hr/IP) |
| Validation | Zod |
| Styling | Tailwind CSS (monospace, no gradients) |
| LLM (pipeline) | OpenRouter — `mistral-7b-instruct` |

## Getting started

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). The repo ships with a committed `data/jobs.json` so the app works without running the pipeline.

## Environment variables

```bash
UPSTASH_REDIS_REST_URL=   # required at runtime (rate limiting)
UPSTASH_REDIS_REST_TOKEN= # required at runtime (rate limiting)
OPENROUTER_API_KEY=       # required to run the data pipeline
AIDEVJOBS_API_KEY=        # optional — sent as X-API-Key to aidevboard.com
```

## Data pipeline

The pipeline is a one-shot CLI — it does not run at request time.

```bash
npm run pipeline                    # fetch live jobs → data/jobs.json
npm run pipeline -- --dry-run       # test first 3 jobs, no file write
```

Flow: `aidevboard.com` → OpenRouter extraction → Zod validation → `data/jobs.json`

## Commands

```bash
npm run dev      # dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint
npm test         # all tests
npm test -- --watch  # watch mode
```

## URL params

`?skill=<label>` — pre-selects a skill node on load. Example: `/?skill=Python`

## API routes

| Route | Description |
|---|---|
| `GET /api/graph` | Full graph data (`GraphData`) |
| `GET /api/insights?id=skill:Python` | Node insights (`InsightsData`) |

Both routes are rate-limited via Upstash sliding window.
