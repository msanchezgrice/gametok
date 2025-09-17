-- Insert the runner-skyline game into the games table
INSERT INTO public.games (
  slug,
  title,
  short_description,
  genre,
  play_instructions,
  asset_bundle_url,
  thumbnail_url,
  tags,
  status,
  runtime_version
) VALUES (
  'runner-skyline',
  'Skyline Runner',
  'Run, jump, and dodge obstacles in this endless runner through the city skyline!',
  'arcade',
  'Tap to jump, avoid obstacles',
  '/games/runner-skyline/index.html',
  '/games/runner-skyline/assets/preview.png',
  ARRAY['runner', 'endless', 'arcade', 'action'],
  'published',
  '1.0.0'
) ON CONFLICT (slug) DO UPDATE SET
  asset_bundle_url = EXCLUDED.asset_bundle_url,
  status = 'published',
  updated_at = NOW();