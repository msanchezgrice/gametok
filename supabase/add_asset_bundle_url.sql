-- Add asset_bundle_url column to games table if it doesn't exist
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS asset_bundle_url TEXT;

-- Update existing games to have the asset_bundle_url
UPDATE public.games
SET asset_bundle_url = CASE
    WHEN slug = 'runner-skyline' THEN '/games/runner-skyline/index.html'
    WHEN slug = 'color-rush' THEN '/games/color-rush/index.html'
    WHEN slug = 'puzzle-master' THEN '/games/puzzle-master/index.html'
    WHEN slug = 'space-blaster' THEN '/games/space-blaster/index.html'
    WHEN slug = 'tower-defense-pro' THEN '/games/tower-defense-pro/index.html'
    WHEN slug = 'drift-king' THEN '/games/drift-king/index.html'
    WHEN slug = 'ninja-jump' THEN '/games/ninja-jump/index.html'
    ELSE '/games/' || slug || '/index.html'
END
WHERE asset_bundle_url IS NULL;

-- Now add Color Rush if it doesn't exist
INSERT INTO public.games (
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
  asset_bundle_url,
  created_at,
  updated_at
) VALUES (
  'color-rush',
  'Color Rush',
  'Tap the falling blocks that match the target color!',
  'arcade',
  'Tap blocks matching the color shown at the bottom. Build combos for bonus points!',
  60,
  '1.0.0',
  'published',
  ARRAY['casual', 'arcade', 'colors', 'reflex'],
  'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=400&fit=crop',
  '/games/color-rush/index.html',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  short_description = EXCLUDED.short_description,
  asset_bundle_url = EXCLUDED.asset_bundle_url,
  updated_at = NOW();