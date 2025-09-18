# GameTok Multi-Agent Integration Spec

_Last updated: $(date +"%Y-%m-%d %H:%M %Z")_

## 1. Context
GameTok currently ships as a mobile-first Next.js PWA backed by Supabase for data and PostHog for analytics. Key capabilities already live:
- Swipe feed with Supabase-backed catalog fetch and likability-aware ordering (`apps/web/app/(tabs)/browse/page.tsx`, `apps/web/lib/games.ts`).
- Analytics ingestion via `track-session` Edge Function writing to `game_sessions` / `session_events`.
- Likability scoring pipeline via `compute-likability` Edge Function and `game_engagement_rollup` view.
- Favorites sync tied to Supabase Auth (`apps/web/lib/favorites.ts`, `apps/web/app/(tabs)/browse/_components/game-feed.tsx`).

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
1. **Modularize feed session handling**
   - Extract telemetry & favorites logic into hooks (`useGameTelemetry`, `useFavorites`) under `apps/web/hooks/` to keep components <250 lines.
   - Reuse these hooks in feed and future inline players.
2. **Analytics Service Surface**
   - Create Supabase Edge Function `analytics-export` that:
     - Accepts service-role token-authenticated requests (or signed JWT from internal agents).
     - Returns summarized metrics from `game_engagement_rollup`, `likability_scores`, and optionally raw session counts filtered by date/game.
   - Document request/response schema in `docs/analytics.md` and provide TypeScript client in `packages/types` to avoid duplication.
3. **Game Upload Pipeline**
   - Introduce Edge Function `ingest-game` that accepts signed payload (metadata + asset manifest) and writes to `games`, `game_variants`, `game_assets`. Assets stored in Supabase Storage bucket `game-bundles/`.
   - Provide CLI helper (`scripts/upload-game.mjs`) consumed by generation agents; keep seeding script for manual bootstrap.
   - Enforce schema validation via Zod shared in `@gametok/types` to catch malformed inputs.
4. **Cron & Monitoring**
   - Schedule `compute-likability` daily; store job results in `likability_jobs` (already created) and surface via analytics API.
   - Add PostHog events for function failures; tie into Slack/email alerts via Supabase logs.
5. **Documentation & Governance**
   - Update `docs/analytics.md` and `docs/runbooks.md` with new endpoints, cron instructions, and operational steps.
   - Keep `SPEC_GameTok_MultiAgent.md` synced as the single source of truth for multi-agent interactions.

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
