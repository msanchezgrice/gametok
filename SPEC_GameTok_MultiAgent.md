# GameTok Multi-Agent Integration Spec

_Last updated: $(date +"%Y-%m-%d %H:%M %Z")_

## 1. Context
GameTok currently ships as a mobile-first Next.js PWA backed by Supabase for data and PostHog for analytics. Key capabilities already live:
- Swipe feed with Supabase-backed catalog fetch and likability-aware ordering (`apps/web/app/(tabs)/browse/page.tsx`, `apps/web/lib/games.ts`).
- Analytics ingestion via `track-session` Edge Function writing to `game_sessions` / `session_events`.
- Likability scoring pipeline via `compute-likability` Edge Function and `game_engagement_rollup` view.
- Favorites sync tied to Supabase Auth (`apps/web/lib/favorites.ts`, `apps/web/app/(tabs)/browse/_components/game-feed.tsx`).

### Relationship to **SPEC_GameTok_MultiAgent flow.md**
The previously authored "flow" spec describes a much broader multi-agent orchestrator: new workspaces (`services/orchestrator`, `packages/agents`, `packages/experiment`, etc.), a pg-boss powered state machine, comprehensive Supabase schema (runs/steps/artifacts/experiments), and cursor-friendly scaffolding prompts. The current codebase implements only the feed + analytics layers; none of the orchestrator packages or tables exist yet. This document narrows scope to the integration seam between the existing app and the upcoming orchestrator so we can bridge them without bloating the feed code.

| Flow Spec Area | Current Code | Gap / Alignment Action |
|----------------|--------------|------------------------|
| `/services/orchestrator` service, agents packages, experiment library | not present | Stage future additions under `/services` and `/packages` once APIs defined; keep main app untouched until interfaces stable. |
| Supabase tables: `runs`, `steps`, `artifacts`, `experiments`, etc. | not created | Treat orchestrator schema as future migration set; meanwhile expose analytics/game upload APIs the orchestrator will consume. |
| Engine Adapter contract | partial: `@gametok/game-sdk` + new `GamePlayer` component | Continue evolving adapter in shared package; ensure orchestration workflow references same contract. |
| Likeability Score loop | implemented via `compute-likability` but limited metrics | Expand analytics export to match flow spec's LS expectations once orchestrator online. |

This doc therefore focuses on the two immediate integration points (analytics data and game ingestion) while leaving room for the orchestrator to plug in via APIs once its packages land.

Upcoming work introduces additional agents/services that must access analytics data and ingest new game builds without bloating the existing feed/analytics code.

## 2. Spec vs Implementation Review
| Area | Spec (current docs) | Implementation | Notes / Inconsistencies |
|------|---------------------|----------------|-------------------------|
| Analytics window | `docs/analytics.md` describes 24h aggregation | `compute-likability` uses 7-day window (view filters last 7 days) | Update spec to allow configurable window (default 7 days) or adjust function. |
| Event dispatcher | Docs reference React Query mutation dispatcher | Implementation uses `sendTelemetry` helper in `game-feed.tsx` with direct Supabase function calls | Spec should reflect direct function invocation; plan to extract into reusable hook to reduce component weight. |
| Inline gameplay | Architecture doc states iframe shell; UI currently shows placeholder canvas | New `GamePlayer` component added but not wired to feed yet. Spec should note staged rollout. |
| Game ingestion | Docs speak to seed scripts; no managed upload pipeline | Need API/function to accept AI-generated game bundles. |
| Analytics access | No documented API for external agents | Plan required for sanitized analytics export (PostHog + Supabase).

## 3. Objectives
1. **Expose analytics data** (session metrics, likability scores) via stable API/Edge Functions for downstream agents without impacting the existing feed logic.
2. **Enable automated game uploads** produced by generation agents, including metadata + asset handling.
3. **Constrain frontend complexity** by moving shared logic into hooks/modules so `game-feed.tsx` and related files don’t balloon.

## 4. Proposed Plan (for Approval)
1. **Stabilize integration seams (Phase 0) — _now_**
   - Modularize feed logic by extracting hooks (`useGameTelemetry`, `useFavorites`) so `game-feed.tsx` stays lean (<200 LOC) and reusable for orchestrator-driven features.
   - Harden analytics pipeline (`compute-likability` cron, `likability_jobs` monitoring) and document the 7-day window in both specs.
2. **Expose orchestrator APIs (Phase 1)**
   - **Analytics export**: Supabase Edge Function `analytics-export` returning rollup + LS data; align response schema with flow spec expectations for experiments. Publish TS client in `@gametok/schemas` once package scaffold lands.
   - **Game ingestion**: Edge Function `ingest-game` handling metadata + storage upload, using shared Zod schemas. Provide CLI/agent helper in `scripts/upload-game.mjs` (later move into orchestrator repo).
   - Extend Supabase policies to allow service role writes from orchestrator without touching feed auth flow.
3. **Orchestrator scaffolding (Phase 2)**
   - Introduce new workspaces from flow spec (`services/orchestrator`, `packages/agents`, etc.) in a separate PR series. These will consume the Phase-1 APIs rather than writing directly to feed tables.
   - Add migrations for orchestrator tables (`runs`, `steps`, `artifacts`, `experiments`, etc.) without disrupting existing schema.
   - Implement bandit & LS tooling per flow spec within `@gametok/experiment` referencing the same analytics export contract.
4. **Closed-loop validation (Phase 3)**
   - Orchestrator deploys new games via `ingest-game`, monitors LS via `analytics-export`, and records decisions. Feed remains a thin consumer—no direct orchestrator code inside `apps/web`.
5. **Documentation & governance**
   - Update `docs/analytics.md`, `docs/runbooks.md`, and original flow spec to cross-link to this integration doc. Keep `SPEC_GameTok_MultiAgent.md` as delta log tracking decisions between orchestrator and feed teams.

## 5. API Contracts
### 5.1 Analytics Export (`POST /functions/v1/analytics-export`)
Request body:
```json
{
  "gameIds": ["uuid"],
  "since": "2025-09-10T00:00:00.000Z",
  "metrics": ["sessions", "likability", "favorites"]
}
```
Response:
```json
{
  "meta": { "generatedAt": "2025-09-17T18:00:00Z", "windowDays": 7 },
  "data": [
    {
      "gameId": "uuid",
      "genre": "runner",
      "sessions": 120,
      "completions": 58,
      "likabilityScore": 0.73,
      "components": [...],
      "favoriteCount": 34
    }
  ]
}
```
Auth: service-role JWT or Supabase Auth user with `analytics_reader` role.

### 5.2 Game Ingestion (`POST /functions/v1/ingest-game`)
Payload (multipart or JSON with signed URLs):
```json
{
  "metadata": {
    "slug": "neon-runner",
    "title": "Neon Runner",
    "genre": "runner",
    "playInstructions": "Swipe to dodge",
    "estimatedDurationSeconds": 120,
    "tags": ["fast"],
    "thumbnailUrl": "https://..."
  },
  "bundle": {
    "entryHtmlPath": "index.html",
    "files": [{ "path": "index.html", "content": "<html>..." }]
  },
  "variants": [{ "orientation": "portrait", "buildSizeKb": 1450 }]
}
```
Behavior: Validate schema → upload assets → upsert `games`/`variants` → return canonical IDs.
Compatibility: matches flow spec §7 “Game Builder” outputs and §8 “Deployment Pipeline” so orchestrator can hand off manifest + bundle without direct DB access.

## 6. Implementation Guidelines
- **Code locality**: Keep telemetry/favorites logic within dedicated hooks to avoid inflating UI components (`game-feed.tsx` currently ~300 lines; target <200 post-refactor).
- **Testing**: Add Vitest coverage for new hooks and functions. Use Playwright smoke to ensure feed + favorites continue working.
- **Type reuse**: Extend `@gametok/types` with shared schemas (game ingestion, analytics export). Avoid duplicating Zod definitions in multiple packages.
- **Error handling**: Edge functions must return structured errors (`{ error: string, detail?: string }`) and log to Supabase for observability.

## 7. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Feed regression during refactor | High | Incrementally extract hooks with unit tests; keep existing component as fallback until parity confirmed. |
| Analytics API overfetch | Medium | Default to limited metric set & pagination; require explicit filters. |
| Asset upload size | Medium | Enforce size limits in `ingest-game`; store large bundles via signed URLs rather than inline payload. |
| Secrets exposure | High | Restrict ingestion/export functions to service-role or signed JWT; document rotation process in runbooks. |

## 8. Outstanding Tasks Summary
- [ ] Apply Supabase migrations 0002/0003 in production.
- [ ] Schedule likability cron and verify `likability_jobs` entries.
- [ ] Build `analytics-export` and `ingest-game` functions + documentation.
- [ ] Refactor feed into hooks to manage file size and reuse logic.
- [ ] Implement auth UI for favorites (magic link or OAuth).
- [ ] Wire `GamePlayer` into feed once ingestion/bundle hosting is stable.

---
For approval: confirm the above plan (Sections 4–8). Once signed off, we’ll proceed with hook extraction, new edge functions, and documentation updates before adding any major UI changes.
