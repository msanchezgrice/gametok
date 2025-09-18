-- Seed game_sessions table with test data
-- First, delete existing test sessions to avoid duplicates
DELETE FROM public.game_sessions WHERE source = 'test_seed';

-- Insert test sessions for each game
-- Using NULL for user_id to represent anonymous sessions
INSERT INTO public.game_sessions (
  id,
  game_id,
  user_id,
  source,
  started_at,
  ended_at,
  total_seconds,
  completed,
  score,
  restarts,
  shares,
  heartbeats,
  device_info
)
SELECT
  gen_random_uuid() as id,
  g.id as game_id,
  NULL as user_id, -- All anonymous sessions for testing
  'test_seed' as source,
  NOW() - (random() * INTERVAL '30 days') as started_at,
  NOW() - (random() * INTERVAL '30 days') + (INTERVAL '1 minute' * (30 + random() * 300)) as ended_at,
  30 + floor(random() * 300)::integer as total_seconds,
  random() > 0.4 as completed,
  CASE WHEN random() > 0.5 THEN floor(random() * 10000) ELSE NULL END as score,
  floor(random() * 5)::integer as restarts,
  floor(random() * 3)::integer as shares,
  floor(random() * 20)::integer as heartbeats,
  '{"platform": "test", "browser": "chrome"}' as device_info
FROM
  public.games g,
  generate_series(1, 20) as s -- Generate 20 sessions per game
WHERE g.status = 'published';

-- Create the analytics views if they don't exist
CREATE OR REPLACE VIEW public.game_analytics_summary AS
WITH session_metrics AS (
  SELECT
    gs.game_id,
    COUNT(DISTINCT gs.id) as total_sessions,
    COUNT(DISTINCT gs.user_id) as unique_users,
    COUNT(DISTINCT CASE WHEN gs.user_id IS NULL THEN gs.id END) as anonymous_sessions,
    AVG(gs.total_seconds) as avg_session_seconds,
    SUM(gs.total_seconds) as total_seconds,
    COUNT(CASE WHEN gs.completed = true THEN 1 END) as completions,
    SUM(COALESCE(gs.restarts, 0)) as total_restarts,
    SUM(COALESCE(gs.shares, 0)) as total_shares,
    COUNT(CASE WHEN gs.ended_at IS NOT NULL AND gs.completed = false THEN 1 END) as abandonments,
    MAX(gs.started_at) as last_played_at,
    MIN(gs.started_at) as first_played_at
  FROM public.game_sessions gs
  GROUP BY gs.game_id
),
favorite_metrics AS (
  SELECT
    f.game_id,
    COUNT(DISTINCT f.user_id) as favorite_count,
    MAX(f.created_at) as last_favorited_at
  FROM public.favorites f
  GROUP BY f.game_id
)
SELECT
  g.id as game_id,
  g.slug,
  g.title,
  g.genre,
  g.status,
  g.tags,
  g.created_at as game_created_at,
  COALESCE(sm.total_sessions, 0) as total_plays,
  COALESCE(sm.unique_users, 0) as unique_players,
  COALESCE(sm.anonymous_sessions, 0) as anonymous_plays,
  COALESCE(sm.avg_session_seconds, 0) as avg_session_seconds,
  COALESCE(sm.total_seconds, 0) as total_play_time,
  COALESCE(sm.completions, 0) as total_completions,
  CASE
    WHEN sm.total_sessions > 0
    THEN ROUND((sm.completions::numeric / sm.total_sessions) * 100, 2)
    ELSE 0
  END as completion_rate,
  COALESCE(sm.total_restarts, 0) as total_restarts,
  CASE
    WHEN sm.total_sessions > 0
    THEN ROUND(sm.total_restarts::numeric / sm.total_sessions, 2)
    ELSE 0
  END as restart_rate,
  COALESCE(sm.total_shares, 0) as total_shares,
  CASE
    WHEN sm.total_sessions > 0
    THEN ROUND((sm.total_shares::numeric / sm.total_sessions) * 100, 2)
    ELSE 0
  END as share_rate,
  COALESCE(sm.abandonments, 0) as total_abandonments,
  CASE
    WHEN sm.total_sessions > 0
    THEN ROUND((sm.abandonments::numeric / sm.total_sessions) * 100, 2)
    ELSE 0
  END as abandonment_rate,
  COALESCE(fm.favorite_count, 0) as favorite_count,
  ls.score as likability_score,
  sm.last_played_at,
  sm.first_played_at,
  fm.last_favorited_at
FROM public.games g
LEFT JOIN session_metrics sm ON g.id = sm.game_id
LEFT JOIN favorite_metrics fm ON g.id = fm.game_id
LEFT JOIN public.likability_scores ls ON g.id = ls.game_id
ORDER BY COALESCE(sm.total_sessions, 0) DESC;

-- Grant permissions
GRANT SELECT ON public.game_analytics_summary TO anon, authenticated;

-- Test the view
SELECT * FROM public.game_analytics_summary LIMIT 5;
