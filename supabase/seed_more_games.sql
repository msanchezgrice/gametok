-- Insert more games for scrolling
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
) VALUES
  (
    'space-blaster',
    'Space Blaster',
    'Defend Earth from alien invaders in this retro arcade shooter!',
    'arcade',
    'Use arrow keys to move, space to shoot',
    '/games/runner-skyline/index.html',
    '',
    ARRAY['shooter', 'space', 'arcade', 'retro'],
    'published',
    '1.0.0'
  ),
  (
    'puzzle-master',
    'Puzzle Master',
    'Match colors and solve challenging puzzles to advance through levels',
    'puzzle',
    'Click to swap tiles and match 3 or more',
    '/games/runner-skyline/index.html',
    '',
    ARRAY['puzzle', 'match3', 'casual', 'strategy'],
    'published',
    '1.0.0'
  ),
  (
    'drift-king',
    'Drift King',
    'Master the art of drifting in this high-speed racing game!',
    'arcade',
    'Tap to drift around corners',
    '/games/runner-skyline/index.html',
    '',
    ARRAY['racing', 'drift', 'arcade', 'speed'],
    'published',
    '1.0.0'
  ),
  (
    'tower-defense-pro',
    'Tower Defense Pro',
    'Build towers and defend your base from waves of enemies',
    'tower_defense',
    'Tap to place towers, upgrade with coins',
    '/games/runner-skyline/index.html',
    '',
    ARRAY['strategy', 'tower', 'defense', 'tactical'],
    'published',
    '1.0.0'
  ),
  (
    'ninja-jump',
    'Ninja Jump',
    'Jump between walls and avoid obstacles in this fast-paced ninja game',
    'arcade',
    'Tap to jump between walls',
    '/games/runner-skyline/index.html',
    '',
    ARRAY['ninja', 'jump', 'arcade', 'action'],
    'published',
    '1.0.0'
  )
ON CONFLICT (slug) DO UPDATE SET
  status = 'published',
  updated_at = NOW();