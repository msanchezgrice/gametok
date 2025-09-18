-- Add Color Rush game to the games table
INSERT INTO public.games (
  id,
  slug,
  title,
  short_description,
  genre,
  play_instructions,
  estimated_duration_seconds,
  runtime_version,
  status,
  tags,
  thumbnail_url,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'color-rush',
  'Color Rush',
  'Tap the falling blocks that match the target color!',
  'arcade',
  'Tap blocks matching the color shown at the bottom. Build combos for bonus points!',
  60,
  '1.0.0',
  'published',
  ARRAY['casual', 'arcade', 'colors', 'reflex'],
  'https://i.imgur.com/colorRush.jpg',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();

-- Add game variant for Color Rush
INSERT INTO public.game_variants (
  id,
  game_id,
  entry_html_path,
  build_hash,
  build_size_kb,
  orientation,
  min_app_version,
  created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.games WHERE slug = 'color-rush'),
  '/games/color-rush/index.html',
  'color-rush-v1',
  15,
  'portrait',
  '1.0.0',
  NOW()
);