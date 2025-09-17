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
1. Hook Supabase Auth/Storage using the provided providers.
2. Implement Edge Functions for telemetry ingestion and likability scoring.
3. Build the internal curation dashboard and integrate real HTML5 game bundles.
4. Wire PostHog feature flags to experiment with autoplay and ranking tweaks.
