-- Test if telemetry is working by manually inserting a test session
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
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.games WHERE slug = 'color-rush' LIMIT 1),
  NULL, -- Anonymous user
  'test',
  NOW() - INTERVAL '5 minutes',
  NOW(),
  300, -- 5 minutes
  true,
  450,
  2,
  1,
  10,
  '{"browser": "Chrome", "platform": "test"}'::jsonb
);

-- Check if it was inserted
SELECT * FROM public.game_sessions
WHERE source = 'test'
ORDER BY started_at DESC
LIMIT 5;

-- Check RLS policies on game_sessions
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'game_sessions';