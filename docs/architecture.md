# GameTok Architecture

## Overview
GameTok is a mobile-first progressive web app that mimics the TikTok swipe flow for instant-play arcade and hyper-casual games. The stack combines:

- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS) deployed on Vercel with PWA capabilities.
- **Backend**: Supabase (Postgres, Auth, Storage) for authoritative data with nightly Edge Functions for analytics aggregation.
- **Analytics**: PostHog for product analytics, session funnels, and experimentation.
- **Shared packages**: Monorepo workspace housing a game iframe SDK, React host utilities, and shared domain types.

## High-Level Flow
1. Feed requests game metadata (`games`, `game_variants`) from Supabase edge cache.
2. Mini-games load through a standardized iframe contract (see `docs/game-sdk.md`).
3. Gameplay events dispatch to the host shell, which forwards telemetry to Supabase Edge Functions and PostHog.
4. Nightly cron jobs compute genre-aware likability scores stored in `likability_scores`.
5. Feed ranking prioritizes high-scoring games while respecting genre diversity and freshness.

## Project Layout
```
apps/
  web/           # Next.js application
packages/
  game-sdk/      # Vanilla JS SDK for iframe ↔ host messaging
  game-shell/    # React hooks/components that wrap the SDK
  types/         # Shared domain types (games, sessions, analytics)
supabase/
  migrations/    # SQL migrations managed via Supabase CLI
docs/            # Specs, analytics, SDK agreements
scripts/         # Developer utilities (seeders, automation)
```

## Data Responsibilities
- **Supabase Postgres** holds curated game metadata, user personalization, sessions, and computed likability metrics.
- **Supabase Storage** (not yet wired) stores mini-game bundles, thumbnails, and marketing assets under signed URLs.
- **PostHog** captures granular feature usage, retention cohorts, and experiment flags; critical counters are persisted back into Postgres via batch jobs for ranking.

## Future Integrations
- Introduce Convex or a similar realtime engine if we need synchronized multiplayer or rapid leaderboards.
- Implement CDN-backed asset pipelines (Vercel Edge + Supabase Storage) with roll-forward deploy scripts.
- Add internal operations dashboard (Next.js route behind admin role) to curate catalog and review analytics.
