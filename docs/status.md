# Project Status – GameTok

_Last updated: $(date +"%Y-%m-%d %H:%M %Z")_

## Work Completed
- **Monorepo foundation**: Next.js App Router PWA (`apps/web`), shared packages (`game-sdk`, `game-shell`, `types`), Supabase migrations, Makefile scripts, and Vitest/ESLint tooling.
- **Feed experience**: TikTok-style swipe feed with loading/empty states, PostHog + Supabase telemetry integration, Supabase-backed game fetch with likability-aware ordering, favorites toggle, and share/restart scaffolding.
- **Favorites sync**: React Query hooks syncing favorites with Supabase, optimistic updates, auth-aware states, and dedicated favorites tab UI.
- **Analytics pipeline**: `track-session` Edge Function for telemetry ingestion, `compute-likability` Edge Function, rollup view + job log migration, likability scoring logic with genre weights, and documentation.
- **Seeding + tooling**: Service-role seeding script (`npm run seed`), sample game metadata, migration to add `asset_bundle_url`, docs covering setup/runbooks.
- **Sample game bundle**: Phaser-based runner prototype and iframe host component to validate game SDK messaging.

## Remaining Plan & Next Actions
1. **Apply pending migrations** – run `supabase db remote commit supabase/migrations/0002_add_asset_bundle_url.sql` and `0003_likability_scoring.sql` (or via SQL editor) to align the remote schema.
2. **Backfill & schedule likability** – `supabase functions invoke compute-likability` then schedule nightly cron `supabase cron schedule --function compute-likability --schedule "0 0 * * *"`.
3. **Seed live catalog** – use `SUPABASE_URL=… SUPABASE_SERVICE_ROLE=… npm run seed` to populate `games`/`game_variants`; verify feed surfaces new entries.
4. **Auth-friendly favorites** – implement sign-in UI (magic link or OAuth) to unlock favorites syncing on production.
5. **Embed real gameplay** – replace placeholder “canvas” block with `<GamePlayer>` wiring (iframe host) and ensure bundle assets load via Supabase Storage or CDN.
6. **Edge observability** – add monitoring/alerts for function failures (Supabase logs + Slack/Email) and capture error events in PostHog.
7. **Admin tooling** – build curator dashboard (Next.js route) to manage game metadata, scores, and feature flags.
8. **QA & polish** – expand automated tests (Playwright smoke, component coverage), run Lighthouse audit, and prep launch checklist.

## Full Project Plan Snapshot
- **Week 1**: Spec, SDK contract, Supabase/Vercel setup ✅
- **Week 2**: Data model, seeding, admin groundwork ✅ (foundational pieces complete; admin UI pending)
- **Week 3**: Swipe feed shell, telemetry plumbing ✅
- **Week 4**: Favorites/settings UX, sharing/restart polish ✅ (auth UI and inline gameplay still to ship)
- **Week 5**: Analytics dashboards, likability cron, QA instrumentation ⚙️ _In progress_ (cron scheduling/dashboards outstanding)
- **Week 6**: Perf tuning, full QA, accessibility, launch playbook ⏳

## Verification Checklist
- [ ] Supabase migrations 0002/0003 applied remotely.
- [ ] `track-session` & `compute-likability` functions deployed with secrets set (✅ deployed 2025-09-17; confirm secrets).
- [ ] Likability cron scheduled and initial run logged in `likability_jobs`.
- [ ] Feed displays seeded games w/ thumbnails and ordered by score.
- [ ] Favorites toggles create `favorites` rows for signed-in users.
- [ ] PostHog events visible for `game_start`, `game_restart`, `game_share`, `favorite_toggle`.
- [ ] Inline game iframe tested with `runner-skyline` bundle.

## Notes
- Environment variables (Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
- CLI secrets for functions: `supabase functions secrets set SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…`.
- Seed data lives in `seed/seed-games.json`; extend for additional games.

