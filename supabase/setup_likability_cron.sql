-- Create the game_engagement_rollup view that compute-likability needs
CREATE OR REPLACE VIEW public.game_engagement_rollup AS
SELECT
  gs.game_id,
  g.genre,
  COUNT(DISTINCT gs.id) as sessions,
  COUNT(DISTINCT CASE WHEN gs.completed = true THEN gs.id END) as completions,
  COALESCE(SUM(gs.total_seconds), 0) as total_seconds,
  COALESCE(SUM(gs.restarts), 0) as restarts,
  COALESCE(SUM(gs.shares), 0) as shares,
  COUNT(DISTINCT CASE WHEN gs.ended_at IS NOT NULL AND gs.completed = false THEN gs.id END) as abandons,
  COUNT(DISTINCT f.id) as favorites
FROM public.game_sessions gs
LEFT JOIN public.games g ON g.id = gs.game_id
LEFT JOIN public.favorites f ON f.game_id = gs.game_id
GROUP BY gs.game_id, g.genre;

-- Create likability_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.likability_scores (
  game_id UUID PRIMARY KEY,
  genre TEXT,
  score DECIMAL(3,2),
  components JSONB,
  sample_size INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create likability_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.likability_jobs (
  id SERIAL PRIMARY KEY,
  status TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the likability computation to run every hour
SELECT cron.schedule(
  'compute-likability-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
    SELECT net.http_post(
      url := 'https://zpthvazjsiagqadifzmh.supabase.co/functions/v1/compute-likability',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Also run it once immediately for testing
SELECT net.http_post(
  url := 'https://zpthvazjsiagqadifzmh.supabase.co/functions/v1/compute-likability',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);