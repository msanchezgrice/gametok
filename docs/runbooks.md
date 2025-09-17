# Runbooks

## Local Development
1. Install dependencies: `make setup`.
2. Start Supabase locally (`supabase start`) and export env vars (see `.env.example`).
3. Run the web app: `make dev`.
4. Run tests: `make test` (Vitest) and lint via `make lint`.

## Database Migrations
- Write SQL migrations under `supabase/migrations` and apply with `supabase db push`.
- Never edit historical migrations; create a new file per change.
- Keep the Supabase CLI linked (`supabase link --project-ref <ref>`) so deployments remain reproducible.

## Seeding Catalog Data
Use the service-role key only from a trusted environment.

```bash
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE=service-role-key \
npm run seed
```

The script reads `seed/seed-games.json`, upserts rows into `games` (conflict target: slug), and replaces related `game_variants`. Re-run it any time you update the seed file.

## Deployments
- Vercel previews build automatically from pull requests.
- Production deploys from `main`. Ensure migrations are applied via Supabase migration workflow prior to tagging releases.
- Monitor Vercel + Supabase status webhooks (hook into Slack/Discord) for deploy health.

## Incident Response
- **Game Embed Failure**: Disable the game via Supabase status flag (`status = 'archived'`). Feed will drop it immediately.
- **Analytics Outage**: Capture events locally and retry queue when PostHog returns 200-series responses. Fallback to Supabase logging for minimum viable metrics.
- **Supabase Cron Failure**: Re-run the likability Edge Function manually (`supabase functions invoke compute-likability`).

## Access Management
- Use Supabase dashboard roles to grant read-only vs curator access.
- Store PostHog API keys and service-role keys in Vercel environment variables only.
- Rotate keys quarterly; document rotations in this file with date + owner.
