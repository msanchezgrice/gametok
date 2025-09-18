
# GameTok Multi‑Agent Orchestrator — Implementation Spec (Cursor Edition)

> **Purpose**: Stand up an end‑to‑end, Claude‑powered, multi‑agent pipeline that
> (1) scans the market, (2) deconstructs winning concepts, (3) prioritizes a slate,
> (4) builds mini‑games (engine‑agnostic), (5) deploys to the GameTok feed (iframe + SDK),
> and (6) closes the loop with a **Likeability Score (LS)** that drives the next cycle.
>
> **This spec is optimized for building inside _Cursor_**: TypeScript‑first, minimal infra,
> strong scaffolding, precise interfaces, and step‑by‑step tasks you can give to Cursor.

---

## 0) Goals & Non‑Goals

**Goals**
- Automate market research → prioritization → build → deploy → validate for hyper/mini‑games.
- Produce durable, cited artifacts (JSON/MD) per step for review and reproducibility.
- Keep engine choice open (Phaser/PlayCanvas/Unity) via an **Engine Adapter** seam.
- Unify analytics via the existing **feed SDK** (iframe `postMessage`) and compute **LS** reliably.

**Non‑Goals (v1)**
- Monetization (ads/IAP) optimization.
- A single mandated engine.
- Cross‑platform native app delivery (focus = mobile web feed).

---

## 1) High‑Level Architecture

```
apps/web (Next.js feed) ──► displays cards & iframes; emits telemetry
services/orchestrator     ──► multi‑agent pipeline (Node/TS + Claude APIs + MCP)
packages/agents           ──► agent library (prompts, tools, evaluators)
packages/schemas          ──► zod types for runs/steps/artifacts/LS/experiments
packages/experiment       ──► bandit + power calculator + exposure allocation
packages/game-adapter     ──► contract for games (postMessage, perf budgets)
supabase/                 ──► tables: runs, steps, artifacts, experiments, ls_scores, games, variants
infra/                    ──► GitHub Actions, seed scripts, (optional) pg-boss init
```

**Runtime pattern**
- Orchestrator runs a **state machine** over `runs` & `steps` tables.
- Work is executed as **jobs** (pg‑boss) with **idempotency** keys per step.
- Agents call tools via **MCP** (e.g., data.ai / Sensor Tower / AppMagic / TikTok / Meta / Supabase / Storage).
- All outputs are written as files (JSON/MD) to `/artifacts/<runId>/…` and indexed in `artifacts` table.

---

## 2) Monorepo Layout (Cursor‑friendly)

```
/apps
  /web                           # Next.js (existing feed), uses game SDK iframe contract
/services
  /orchestrator                  # Node/TS service; state machine; job runner; MCP clients
/packages
  /agents                        # Agent classes + prompts + tools; LLM-as-judge; citation pass
  /schemas                       # zod schemas + types
  /experiment                    # thompson sampling, power calc, stop rules
  /game-adapter                  # postMessage types + perf budget checks + QA autoplayer hooks
  /utils                         # logger, retry, idempotency, OpenTelemetry
/supabase
  /migrations
  /seed
/infra
  /github                        # CI: lint, typecheck, tests, dry-run market cycle
/docs
  /specs
  /diagrams
```

**Naming conventions**
- Packages publish as `@gametok/<name>` in the workspace.
- Use **pnpm**. ESM modules. `ts-node` for scripts.

---

## 3) Data Model (Supabase / Postgres)

```sql
-- core run state
create table runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  status text check (status in ('queued','running','needs_review','paused','failed','done')),
  brief jsonb not null,          -- intake constraints/goals
  budget jsonb,                  -- token/search/ad spans
  locale text[],                 -- e.g., ['US','CA']
  notes text
);

create table steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  phase text not null,           -- 'market','synthesis','deconstruct','prioritize','build','deploy','measure','decision'
  status text check (status in ('queued','running','needs_review','paused','failed','done')),
  started_at timestamptz, finished_at timestamptz,
  input jsonb, output jsonb,     -- step-specific IO
  cost jsonb,                    -- { tokens: {input:…, output:…}, searches: … }
  unique (run_id, phase)
);

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  step_id uuid references steps(id) on delete cascade,
  kind text,                     -- 'market_scan','creative_trends','deconstruction','portfolio','build_brief','deployment','validation','judge_memo','playbook_memory'
  path text not null,            -- object store or repo path
  sha256 text,
  meta jsonb
);

-- experiments & telemetry linkage
create table experiments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  game_slug text not null,
  variant_id text not null,
  policy text not null,          -- 'thompson','epsilon','fixed'
  min_impressions int default 2000,
  exposure jsonb,                -- per-arm exposure targets / current
  status text default 'running',
  started_at timestamptz default now(),
  finished_at timestamptz
);

create table ls_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  game_slug text,
  variant_id text,
  window text,                   -- '72h', '24h'
  inputs jsonb,                  -- raw metrics (play_rate, depth, save, share, replay, type_metric, penalties)
  norm jsonb,                    -- normalized values
  weights jsonb,                 -- applied weights
  score numeric,                 -- LS
  ci_low numeric, ci_high numeric,
  baseline_delta numeric,
  decided boolean default false
);
```

Indexes to add later: `(variant_id, started_at)`, `(run_id, phase)`, JSONB GIN on `artifacts.meta`.

---

## 4) Contracts & Types (TypeScript + zod)

### 4.1 Game SDK (iframe postMessage)

```ts
// packages/game-adapter/src/types.ts
export type HostMsg =
  | { type: 'host:init'; sessionId: string; width: number; height: number; muted: boolean }
  | { type: 'host:pause' } | { type: 'host:resume' }
  | { type: 'host:mute' }  | { type: 'host:unmute' }
  | { type: 'host:end' };

export type GameEvt =
  | { type: 'game:ready' }
  | { type: 'game:loaded'; gameId: string; sessionId: string }
  | { type: 'game:start';  gameId: string; sessionId: string }
  | { type: 'game:progress'; gameId: string; sessionId: string; seconds: number; fps?: number; memoryMB?: number }
  | { type: 'game:end'; gameId: string; sessionId: string; reason: 'success'|'fail'|'quit'; seconds: number; distance_m?: number }
  | { type: 'ui:like'|'ui:save'|'ui:share'|'ui:replay'; gameId: string; sessionId: string };
```

### 4.2 Runs/Steps/Artifacts (zod)

```ts
// packages/schemas/src/index.ts
import { z } from 'zod';

export const Phase = z.enum(['market','synthesis','deconstruct','prioritize','build','deploy','measure','decision']);

export const RunBrief = z.object({
  goals: z.string(),
  locales: z.array(z.string()).default(['US']),
  genres_prefer: z.array(z.string()).default([]),
  genres_avoid: z.array(z.string()).default([]),
  budgets: z.object({
    tokens: z.number().default(1_000_000),
    searches: z.number().default(200),
    ad_spend_usd: z.number().default(0)
  }),
  success: z.object({ ls_threshold: z.number().default(0.55), tts_hours: z.number().default(72) })
});

export const StepIO = z.object({ input: z.any().optional(), output: z.any().optional() });
export const Artifact = z.object({ kind: z.string(), path: z.string(), sha256: z.string().optional(), meta: z.any().optional() });
```

### 4.3 Likeability Score (LS)

```ts
export type LSInputs = {
  play_rate: number;          // 0..1
  depth_sec: number;          // seconds
  save_rate: number;          // 0..1
  share_rate: number;         // 0..1
  replay_rate: number;        // 0..1
  type_metric: number;        // 0..1 (e.g., level1_clear_rate)
  penalties: number;          // 0..1 normalized perf penalties
  score_class: 'runner'|'arcade'|'puzzle'|'skill'|'strategy'|'idle'|'board';
};
```

---

## 5) Agents (phases, models, IO, prompts)

All agents run inside `services/orchestrator` using a common base:

```ts
// packages/agents/src/base.ts
export interface AgentCtx {
  runId: string;
  stepId: string;
  clock: () => Date;
  log: (msg: string, meta?: any) => void;
  saveArtifact: (a: { kind: string; data: Buffer|string; ext: 'json'|'md' }) => Promise<{ path: string; sha256: string }>;
  tools: { web: WebSearch; mcp: MCP; code: CodeExec; supabase: SupaClient };
}

export interface Agent<I, O> {
  name: string;
  model: 'claude-opus'|'claude-sonnet';
  run(input: I, ctx: AgentCtx): Promise<O>;
}
```

> **Model guidance (default):** Orchestrator & Judge on **Opus**; workers on **Sonnet**. Configure via env (see §10).

### A — Market scan & signals
- **Top‑Charts Agent** (Sonnet + MCP/Web): inputs = brief; outputs = `market_scan.json` (rankings & growth).  
- **Creative‑Trends Agent** (Sonnet + Web/MCP): outputs = `creative_trends.json` (hooks, first‑3‑seconds, titles).  
- **Genre‑Shift Analyst** (Sonnet): outputs = `genre_heatmap.json`.  
- **Citation Pass** (Sonnet): rewrites artifacts adding citations and flags weak sources.

### B — Deconstructor
- **Store‑Page Miner** (Sonnet + Web): extracts core loop, input grammar, session curve, pain points.  
- **Ad‑Creative Classifier** (Sonnet): motifs from TikTok/Meta ads.  
- **Deconstructor (Opus + Code)**: consolidates into `deconstruction/<slug>.md` + JSON.

### C — Prioritization & portfolio
- **Scoring Agent (Opus)**: multi‑objective score `F=αM+βW+γS+δD+εRAR`.  
- **Portfolio Optimizer (Opus)**: pick K=5–10 diverse candidates; emits `prioritized_portfolio.json`.  
- **Gate (Judge + Human)**: rubric scoring & approval.

### D — Build orchestration (engine‑agnostic)
- **Build‑Planner (Sonnet)**: `build_brief/<slug>.md` (controls, budgets, telemetry, acceptance).  
- **Game‑Crafter Squad (Sonnet + Code)**: generates or integrates bundles; ensures game SDK contract.  
- **QA Autoplayer (Code)**: headless tests (TTFI, FPS, input thresholds, telemetry check).

### E — Deploy & experiment
- **Publisher (Sonnet + MCP)**: upload bundle → CDN/Storage; create rows in `games`/`game_variants`.  
- **Experiment Runner (Sonnet)**: configure policy (Thompson), min impressions, stop rules.  
- **Telemetry Harvester (Code + MCP)**: aggregate features for LS.

### F — Evaluate & learn
- **Judge (Opus)**: decision memo (Go/Pivot/Kill) with evidence & citation scoring.  
- **Memory‑Writer (Sonnet)**: update `playbook_memory.json` with motif learnings.

**Prompt skeleton (example)**

```md
# System (Top‑Charts Agent)
You are a disciplined market researcher for mobile hyper/mini‑games. Your job is to produce a
machine‑readable JSON with top charts, growth momentum, and genre deltas for locales {{locales}}.
Every claim must cite at least two diverse sources. Use tools to fetch primary data.

# Output JSON schema
{ "timestamp": "...", "sources": [...], "locales": [...], "genres": [ { "name": "...", "momentum": 0.0, "top_titles": [ ... ] } ] }

# Steps
1) Query Sensor Tower/data.ai/AppMagic (via MCP if available) ...
2) Normalize genres and rank by momentum ...
3) Emit JSON; keep under 1MB.
```

---

## 6) Likeability Score (LS) — implementation

**Normalization & weights**

```ts
// packages/experiment/src/ls.ts
export type WeightMap = Record<LSInputs['score_class'], {
  play: number; depth: number; replay: number; save: number; share: number; type: number; penalty: number;
}>;

export const DEFAULT_WEIGHTS: WeightMap = {
  runner:   { play:0.40, depth:0.35, replay:0.15, save:0.05, share:0.05, type:0.10, penalty:0.10 },
  arcade:   { play:0.45, depth:0.25, replay:0.15, save:0.05, share:0.10, type:0.05, penalty:0.10 },
  puzzle:   { play:0.35, depth:0.30, replay:0.10, save:0.20, share:0.05, type:0.10, penalty:0.10 },
  skill:    { play:0.40, depth:0.25, replay:0.20, save:0.05, share:0.10, type:0.05, penalty:0.10 },
  strategy: { play:0.35, depth:0.35, replay:0.05, save:0.15, share:0.10, type:0.10, penalty:0.10 },
  idle:     { play:0.30, depth:0.40, replay:0.10, save:0.15, share:0.05, type:0.10, penalty:0.10 },
  board:    { play:0.35, depth:0.30, replay:0.10, save:0.20, share:0.05, type:0.10, penalty:0.10 }
};

export function normalizeDepth(depthSec: number, p75ByClass: Record<string, number>, cls: LSInputs['score_class']) {
  const p75 = p75ByClass[cls] ?? 60;
  const r = Math.min(depthSec / p75, 1.5);
  return Math.min(r / 1.5, 1);
}

export function lsScore(inp: LSInputs, p75Depth: Record<string, number>, weights=DEFAULT_WEIGHTS) {
  const w = weights[inp.score_class];
  const depth = normalizeDepth(inp.depth_sec, p75Depth, inp.score_class);
  const s = w.play*inp.play_rate + w.depth*depth + w.replay*inp.replay_rate +
            w.save*inp.save_rate + w.share*inp.share_rate + w.type*inp.type_metric -
            w.penalty*inp.penalties;
  return Math.max(0, Math.min(1, s));
}
```

**Power targets & stop rules**

```ts
// packages/experiment/src/power.ts
export function impressionsForDelta(p: number, delta: number, z=1.96, power=0.84) {
  // approx two-proportion z-test per arm
  const p1 = p, p2 = p + delta;
  const pbar = (p1 + p2) / 2;
  const num = Math.pow(z*Math.sqrt(2*pbar*(1-pbar)) + power*Math.sqrt(p1*(1-p1)+p2*(1-p2)), 2);
  const den = Math.pow(p2 - p1, 2);
  return Math.ceil(num/den);
}
```

**Bandit policy (Thompson / Beta‑Bernoulli on Play Rate)**

```ts
// packages/experiment/src/bandit.ts
export type Arm = { id: string; success: number; trials: number; minImpr: number };
export function thompson(arms: Arm[], rng=Math.random) {
  return arms
    .map(a => ({ a, sample: betaSample(1+a.success, 1+(a.trials-a.success), rng) }))
    .sort((x,y) => y.sample - x.sample)[0].a.id;
}
function betaSample(alpha:number, beta:number, rng=Math.random) {
  // quick-and-dirty; replace with a robust sampler later
  const x = -Math.log(rng()) / alpha;
  const y = -Math.log(rng()) / beta;
  return x / (x + y);
}
```

---

## 7) Orchestrator & Job Runner

- **State machine** per run: `market → synthesis → deconstruct → prioritize → build → deploy → measure → decision`.
- **Queue**: use **pg‑boss** (Postgres‑native job queue) to avoid extra infra.
- **Idempotency**: step key = `${runId}:${phase}`; reentrant jobs read `steps.status`, skip if `done`.
- **Observability**: OpenTelemetry traces; per‑step cost aggregation (tokens/searches/runtime).

```ts
// services/orchestrator/src/state.ts
type Phase = 'market'|'synthesis'|'deconstruct'|'prioritize'|'build'|'deploy'|'measure'|'decision';
export async function advance(runId: string) {
  const s = await db.currentStep(runId);
  switch (s?.phase ?? 'market') {
    case 'market':      return runMarket(runId);
    case 'synthesis':   return runSynthesis(runId);
    // ...
    case 'decision':    return finalize(runId);
  }
}
```

---

## 8) UI / API Integration (minimal surface)

**Read‑only APIs for apps/web**
- `GET /api/runs/:id` → run overview (+ step statuses, costs)
- `GET /api/runs/:id/graph` → current DAG nodes/edges
- `GET /api/runs/:id/experiments` → variants, exposures, metrics
- `GET /api/runs/:id/artifacts` → file list (signed URLs)

**Write actions (gated)**
- `POST /api/runs` (create from Intake brief)
- `POST /api/runs/:id/gate` (approve portfolio / QA / decision)
- `POST /api/experiments/:id/allocate` (override exposure)

---

## 9) Security & Compliance

- Sandboxed iframes for games; restrict `postMessage` **targetOrigin** in production.
- Store and display **citations** for all external claims/summaries.
- Do not store raw PII from external APIs; keep only aggregate metrics / IDs needed for joins.
- Rate‑limit outbound search/API calls; enforce budget ceilings from the Intake brief.

---

## 10) Environment & Secrets (`.env.example`)

```
# Claude
ANTHROPIC_API_KEY=…
ANTHROPIC_MODEL_ORCH=claude-3-opus-latest
ANTHROPIC_MODEL_WORKER=claude-3.5-sonnet-latest

# Supabase
NEXT_PUBLIC_SUPABASE_URL=…
SUPABASE_SERVICE_ROLE_KEY=…

# Storage/CDN (R2/S3 compatible or Supabase storage)
STORAGE_BUCKET_URL=…
STORAGE_SIGNING_KEY=…

# PostHog / Telemetry
POSTHOG_PROJECT_TOKEN=…
POSTHOG_HOST=https://app.posthog.com

# Optional data vendors (stubs OK at first)
DATAAI_API_KEY=…
SENSOR_TOWER_API_KEY=…
APPMAGIC_API_KEY=…

# Job queue
DATABASE_URL=postgres://…
```

---

## 11) Local Dev — **Cursor Tasks**

> Use these “micro‑prompts” inside Cursor to scaffold quickly.

1. **Scaffold packages**
   - *Prompt:* “Create workspace `pnpm` monorepo with packages: `@gametok/agents`, `@gametok/schemas`, `@gametok/experiment`, `@gametok/game-adapter`, and service `services/orchestrator` (Node/TS, ESM). Add basic `tsconfig`, `eslint`, `vitest`.”

2. **Schemas & types**
   - *Prompt:* “Implement zod types from §4.2 into `packages/schemas` and export TS types. Add unit tests.”

3. **Game adapter types**
   - *Prompt:* “Add the postMessage contract from §4.1 to `packages/game-adapter`.”

4. **LS & Experiment**
   - *Prompt:* “Implement `ls.ts`, `power.ts`, `bandit.ts` from §6 into `@gametok/experiment` with tests.”

5. **Supabase SQL**
   - *Prompt:* “Generate SQL from §3 into `supabase/migrations/2025XXXX_init.sql`. Add a Node script that runs migrations using `postgres` client.”

6. **Orchestrator state machine**
   - *Prompt:* “In `services/orchestrator`, implement `advance(runId)` and per‑phase stubs that read/write `steps` and create `artifacts`. Integrate `pg-boss` for job scheduling.”

7. **Agents base & one example**
   - *Prompt:* “In `@gametok/agents`, add `base.ts` (ctx API) and implement `TopChartsAgent` that writes `market_scan.json` (stub data for now).”

8. **Publisher + Experiments API**
   - *Prompt:* “Add minimal REST API (Express/Fastify) endpoints from §8 for runs/experiments; return stub data if necessary.”

9. **Wire to apps/web**
   - *Prompt:* “Create `apps/web` pages: `/runs/:id` (Stage Rail + Flow canvas), `/runs/:id/experiments` (table + preview). Use static mock JSON first.”

10. **End‑to‑end dry run**
    - *Prompt:* “Add a script `pnpm run e2e:dry` that inserts a run, executes `market → synthesis → …` with stubs, writes artifacts, and prints a summary.”

---

## 12) QA & Testing

- **Unit tests**: `@gametok/experiment` (LS calc, power, bandit), `@gametok/schemas` validation.  
- **Integration tests**: orchestrator steps produce artifacts, idempotent retries, transitions obey guardrails.  
- **Fixture library**: mock responses for charts/ads to run offline.  
- **Performance guards**: LS function < 1ms per variant; orchestrator steps log token usage.

---

## 13) CI/CD (GitHub Actions)

- `lint-type-test.yml` → pnpm install, `pnpm -r build`, `pnpm -r test`  
- `orchestrator-dryrun.yml` → spin up Postgres (services), run migrations, then `pnpm --filter services/orchestrator start:dry` to validate the pipeline produces artifacts.  
- Optional: preview deploy for `apps/web` (Vercel/Cloudflare Pages).

---

## 14) Milestones & Acceptance

**M1 (Week 1):** packages scaffolded; schemas; LS library + tests; SQL migrations; orchestrator state machine skeleton; web UI stubs.  
**M2 (Week 2):** market/deconstructor agents generate real artifacts (stubs allowed); portfolio optimizer; judge gate; deploy & experiments API hooked to feed; LS computed from telemetry fixture.  
**M3 (Week 3–4):** QA autoplayer + perf gates; real bundles via Engine Adapter; bandit in production; dashboards; weekly loop executed with decision memos.

**Acceptance**: A dry run starting from an Intake brief yields: market scan → deconstruction sheets → prioritized portfolio → 1–2 built game variants (stub bundles OK) → deployment manifests → experiments with LS numbers → judge memo with Go/Pivot/Kill and a saved `playbook_memory.json`.

---

## 15) Appendix

### 15.1 Judge rubric (LLM‑as‑Judge)

```
Score each 0..1 with rationale:
- Factuality (claims match sources)
- Citation quality (diverse, reputable)
- Completeness (covers required sections)
- Tool efficiency (budget adherence)
- Decision clarity (Go/Pivot/Kill with explicit risks)
```

### 15.2 Deconstruction Sheet outline (MD)

```
# <Game/Comparable>
Core loop
Input grammar
Session curve & failure causes
Level cadence
Polish/VFX/SFX notes
Ad hooks (first 3s)
Risks & build effort estimate
Citations
```

### 15.3 Engine Adapter acceptance checks

- `postMessage` contract implemented (init/pause/resume/mute/end; loaded/start/progress/end; ui:*).  
- **Perf**: TTFI ≤ 1.5s, steady 30–60fps on baseline device, memory within limit.  
- **Assets**: preview.mp4 (5–10s), poster.jpg; manifest JSON.  
- **Security**: sandboxed iframe; origin‑locked messages.

---

**Done is better than perfect**. Ship a thin skeleton first (stubs + fixtures), then replace stubs with real MCP connectors and live telemetry. Cursor can generate most of the boilerplate from the snippets above—copy the prompts in §11 directly into your Cursor chat as you create each package/file.
