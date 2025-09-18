-- Seed game_sessions table with test data
-- First, delete existing test sessions to avoid duplicates
DELETE FROM public.game_sessions WHERE source = 'test_seed';

-- Insert test sessions for each game
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
  CASE WHEN random() > 0.3 THEN gen_random_uuid() ELSE NULL END as user_id,
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

-- Also add some favorites for testing
INSERT INTO public.favorites (user_id, game_id, created_at)
SELECT DISTINCT
  gen_random_uuid() as user_id,
  g.id as game_id,
  NOW() - (random() * INTERVAL '30 days') as created_at
FROM
  public.games g,
  generate_series(1, 5) as s -- Generate 5 favorites per game
WHERE g.status = 'published'
  AND random() > 0.3 -- 70% chance to create each favorite
ON CONFLICT (user_id, game_id) DO NOTHING;
