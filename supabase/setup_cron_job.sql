-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to trigger the likability computation Edge Function
CREATE OR REPLACE FUNCTION public.compute_likability_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result RECORD;
BEGIN
  -- Call the Edge Function using pg_net extension
  SELECT
    net.http_post(
      url := 'https://zpthvazjsiaggadifzmh.supabase.co/functions/v1/compute-likability',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) INTO result;

  RAISE NOTICE 'Likability computation triggered: %', result;
END;
$$;

-- Schedule the cron job to run every hour
SELECT cron.schedule(
  'compute-likability-hourly',
  '0 * * * *', -- Every hour at minute 0
  'SELECT public.compute_likability_scores();'
);

-- List all cron jobs to verify it was created
SELECT * FROM cron.job;

-- Check if we have any game sessions
SELECT
  COUNT(*) as total_sessions,
  COUNT(DISTINCT game_id) as unique_games,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(started_at) as earliest_session,
  MAX(started_at) as latest_session
FROM public.game_sessions;

-- Check Color Rush sessions specifically
SELECT * FROM public.game_sessions
WHERE game_id IN (SELECT id FROM public.games WHERE slug = 'color-rush')
ORDER BY started_at DESC
LIMIT 10;