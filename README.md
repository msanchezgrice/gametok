# GameTok

GameTok is a mobile-first web experience inspired by TikTok: swipe to discover, tap to play, and share quick-hit arcade games. This repository contains the initial scaffolding for the product, including a Next.js PWA shell, shared SDK packages, and Supabase database migrations.

## Getting Started

```bash
make setup
make dev
```

The app runs on [http://localhost:3000](http://localhost:3000) and currently ships with stub data for the swipe feed.

### Required Environment Variables
Create `apps/web/.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

For production (Vercel) also add:

```
SUPABASE_SERVICE_ROLE=... # never commit; used for Edge Functions and seeding
SUPABASE_JWT_SECRET=...
SUPABASE_URL=https://<project>.supabase.co # required for CLI tooling & scripts
```

Supabase Edge Functions expect `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` secrets set via `supabase functions secrets set` before deploying.

### Seeding sample games

```bash
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE=service-role-key \
npm run seed
```

The script upserts entries from `seed/seed-games.json` into `games` and replaces associated `game_variants` rows.

Additional service-role keys live in Vercel/Supabase secrets; never commit them.

## Monorepo Layout
- `apps/web`: Next.js App Router, Tailwind UI, and analytics wiring.
- `packages/game-sdk`: iframe messaging contract for games.
- `packages/game-shell`: React utilities for host controls.
- `packages/types`: Shared domain types and Supabase schema typings.
- `supabase/migrations`: SQL migrations aligning with `docs/analytics.md`.
- `docs/`: Architecture brief, analytics spec, SDK contract, runbooks.

## Analytics & Likability
See `docs/analytics.md` for the PostHog event taxonomy and likability weighting system. Nightly Supabase Edge Functions will persist scores that drive feed ranking.

## Next Steps
1. Deploy the `track-session` Supabase Edge Function (see `docs/analytics.md`) and add project secrets.
2. Seed `games`/`game_variants` using `scripts/seed.mjs` or Supabase SQL so the feed has live content.
3. Hook Supabase Auth/Storage with real session data and favorites.
4. Implement the likability scoring cron Edge Function.
5. Build the internal curation dashboard and integrate live HTML5 game bundles.
6. Wire PostHog feature flags to experiment with autoplay and ranking tweaks.
