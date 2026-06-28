# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Next.js dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npm test             # run all tests
npm test -- src/tests/lib/types.test.ts   # run single test file
npm test -- --watch  # watch mode
npm run pipeline     # fetch live jobs → data/jobs.json (requires env vars)
npm run pipeline -- --dry-run  # test first 3 jobs, no file write
```

## Architecture

**Data flow:** `data/jobs.json` (committed, static) → `src/lib/graph-builder.ts` (transforms at request time) → `/api/graph` and `/api/insights` routes → React frontend via TanStack Query.

The pipeline (`scripts/fetch-jobs.ts`) is a one-shot CLI that calls aidevboard.com, extracts skills/roles via OpenRouter (mistral-7b-instruct), validates with Zod, and overwrites `data/jobs.json`. It never runs at server request time.

**Graph topology:** Three node types (`skill`, `role`, `company`) with IDs prefixed `skill:`, `role:`, `company:`. Three edge types: `REQUIRES` (role→skill), `COMMONLY_PAIRED_WITH` (skill↔skill co-occurrence), `HIRED_BY` (role→company).

**Key files:**
- `src/lib/types.ts` — all shared types and `JobSchema` (Zod). Single source of truth for `Job`, `GraphNode`, `GraphEdge`, `GraphData`, `InsightsData`.
- `src/lib/graph-builder.ts` — `buildGraph(jobs)` and `getNodeInsights(jobs, nodeId)`, pure functions over `Job[]`.
- `src/lib/rate-limit.ts` — Upstash sliding window, 60 req/hr/IP, shared by both API routes.
- `src/app/api/graph/route.ts` — loads jobs, returns `GraphData`.
- `src/app/api/insights/route.ts` — takes `?id=skill:Python`, returns `InsightsData`.
- `src/components/GraphCanvas.tsx` — Sigma.js canvas via `@react-sigma/core`. Node coloring: selected = teal + 1.5× size, neighbors = teal, search match = teal + 1.3× size, others = gray (faded when selection active).
- `src/components/InsightsPanel.tsx` — slides in from right when node selected.
- `src/components/SearchBar.tsx` — 300ms debounced, controlled input.
- `src/app/page.tsx` — wires everything; URL param `?skill=<label>` pre-selects a skill node.

## Design Constraints

One accent color: `#2DD4BF` (teal). All other colors grayscale only. Background `#F5F4F0`, text `#1A1A1A`, muted `#9CA3AF`, border `#E5E4E0`. All UI text `font-mono`. No gradients, no shadows, no `rounded` > `rounded-sm`.

## Required Env Vars

```
AIDEVJOBS_API_KEY        # optional, sent as X-API-Key to aidevboard.com
OPENROUTER_API_KEY       # required for pipeline
UPSTASH_REDIS_REST_URL   # required at runtime for rate limiting
UPSTASH_REDIS_REST_TOKEN
```

## Tests

Tests live in `src/tests/` mirroring `src/lib/` and `src/components/`. Pattern is TDD: write failing test first, then implement. `@react-sigma/core` and `graphology` must be mocked in component tests (no canvas in jsdom).

## Implementation Plan

Full task-by-task plan at `docs/superpowers/plans/2026-06-27-skill-graph.md`. Tasks 1–2 complete; Tasks 3–11 remaining.
