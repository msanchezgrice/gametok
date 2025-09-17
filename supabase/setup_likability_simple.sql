-- Create the game_engagement_rollup view that compute-likability needs
CREATE OR REPLACE VIEW public.game_engagement_rollup AS
SELECT
  gs.game_id,
  COALESCE(g.genre, 'arcade') as genre,
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

-- Grant permissions
GRANT ALL ON public.game_engagement_rollup TO anon, authenticated;
GRANT ALL ON public.likability_scores TO anon, authenticated;
GRANT ALL ON public.likability_jobs TO anon, authenticated;

-- Create a function to manually trigger likability computation
CREATE OR REPLACE FUNCTION public.compute_likability_now()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a placeholder - the actual computation happens in the Edge Function
  -- You need to call the Edge Function manually or set up a cron job externally
  RAISE NOTICE 'Please call the compute-likability Edge Function to update scores';
END;
$$;

-- Test the view works
SELECT * FROM public.game_engagement_rollup LIMIT 5;