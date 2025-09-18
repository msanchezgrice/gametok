-- Create an optimized view for game analytics
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_analytics
ON public.game_sessions (game_id, started_at, completed, user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_analytics
ON public.favorites (game_id, user_id, created_at);

-- Grant permissions
GRANT SELECT ON public.game_analytics_summary TO anon, authenticated;

-- Create a function to get analytics for a specific time range
CREATE OR REPLACE FUNCTION public.get_game_analytics(
  time_range_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  game_id UUID,
  title TEXT,
  genre TEXT,
  total_plays BIGINT,
  unique_players BIGINT,
  avg_session_seconds NUMERIC,
  completion_rate NUMERIC,
  share_count BIGINT,
  favorite_count BIGINT,
  likability_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH recent_sessions AS (
    SELECT
      gs.game_id,
      COUNT(DISTINCT gs.id) as total_sessions,
      COUNT(DISTINCT gs.user_id) as unique_users,
      AVG(gs.total_seconds) as avg_seconds,
      COUNT(CASE WHEN gs.completed = true THEN 1 END) as completions,
      SUM(COALESCE(gs.shares, 0)) as shares
    FROM public.game_sessions gs
    WHERE gs.started_at >= NOW() - INTERVAL '1 day' * time_range_days
    GROUP BY gs.game_id
  ),
  recent_favorites AS (
    SELECT
      f.game_id,
      COUNT(DISTINCT f.user_id) as fav_count
    FROM public.favorites f
    WHERE f.created_at >= NOW() - INTERVAL '1 day' * time_range_days
    GROUP BY f.game_id
  )
  SELECT
    g.id,
    g.title,
    g.genre,
    COALESCE(rs.total_sessions, 0)::BIGINT,
    COALESCE(rs.unique_users, 0)::BIGINT,
    COALESCE(rs.avg_seconds, 0)::NUMERIC,
    CASE
      WHEN rs.total_sessions > 0
      THEN ROUND((rs.completions::numeric / rs.total_sessions) * 100, 2)
      ELSE 0
    END,
    COALESCE(rs.shares, 0)::BIGINT,
    COALESCE(rf.fav_count, 0)::BIGINT,
    COALESCE(ls.score, 0)::NUMERIC
  FROM public.games g
  LEFT JOIN recent_sessions rs ON g.id = rs.game_id
  LEFT JOIN recent_favorites rf ON g.id = rf.game_id
  LEFT JOIN public.likability_scores ls ON g.id = ls.game_id
  WHERE g.status = 'published'
  ORDER BY COALESCE(rs.total_sessions, 0) DESC;
END;
$$;

-- Create a simpler summary table for quick stats
CREATE OR REPLACE VIEW public.game_quick_stats AS
SELECT
  g.id,
  g.title,
  g.genre,
  COUNT(DISTINCT gs.id) as plays_today,
  COUNT(DISTINCT CASE WHEN gs.started_at >= NOW() - INTERVAL '7 days' THEN gs.id END) as plays_week,
  COUNT(DISTINCT CASE WHEN gs.started_at >= NOW() - INTERVAL '30 days' THEN gs.id END) as plays_month,
  AVG(CASE WHEN gs.started_at >= NOW() - INTERVAL '7 days' THEN gs.total_seconds END) as avg_time_week,
  COUNT(CASE WHEN gs.completed = true AND gs.started_at >= NOW() - INTERVAL '7 days' THEN 1 END) as completions_week,
  ls.score as likability_score
FROM public.games g
LEFT JOIN public.game_sessions gs ON g.id = gs.game_id AND gs.started_at >= NOW() - INTERVAL '1 day'
LEFT JOIN public.likability_scores ls ON g.id = ls.game_id
WHERE g.status = 'published'
GROUP BY g.id, g.title, g.genre, ls.score
ORDER BY COUNT(DISTINCT gs.id) DESC;

-- Grant permissions
GRANT SELECT ON public.game_quick_stats TO anon, authenticated;

-- Test the views
SELECT * FROM public.game_analytics_summary LIMIT 5;
SELECT * FROM public.game_quick_stats LIMIT 5;