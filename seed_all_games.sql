-- Seed all games that exist in the public/games folder
-- Run this in Supabase SQL Editor to populate your games table

INSERT INTO public.games (
  slug,
  title,
  short_description,
  genre,
  play_instructions,
  asset_bundle_url,
  thumbnail_url,
  tags,
  estimated_duration_seconds,
  status,
  runtime_version
) VALUES
  (
    'runner-skyline',
    'Runner Skyline',
    'Run, jump, and dodge through a neon-lit cityscape!',
    'arcade',
    'Tap to jump, avoid obstacles',
    '/games/runner-skyline/index.html',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=600&fit=crop',
    ARRAY['runner', 'arcade', 'endless', 'action'],
    60,
    'published',
    '1.0.0'
  ),
  (
    'brick-breaker',
    'Brick Breaker',
    'Classic arcade game - break all the bricks to win!',
    'arcade',
    'Move paddle to bounce ball and break bricks',
    '/games/brick-breaker/index.html',
    'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=600&fit=crop',
    ARRAY['arcade', 'classic', 'paddle', 'bricks'],
    120,
    'published',
    '1.0.0'
  ),
  (
    'bubble-pop',
    'Bubble Pop',
    'Pop bubbles and match colors in this relaxing puzzle game',
    'puzzle',
    'Tap matching bubbles to pop them',
    '/games/bubble-pop/index.html',
    'https://images.unsplash.com/photo-1601987177651-8edfe6c20009?w=400&h=600&fit=crop',
    ARRAY['puzzle', 'bubbles', 'casual', 'relaxing'],
    90,
    'published',
    '1.0.0'
  ),
  (
    'color-rush',
    'Color Rush',
    'Match colors quickly before time runs out!',
    'puzzle',
    'Tap the matching color as fast as you can',
    '/games/color-rush/index.html',
    'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=600&fit=crop',
    ARRAY['puzzle', 'colors', 'speed', 'reflex'],
    45,
    'published',
    '1.0.0'
  ),
  (
    'memory-match',
    'Memory Match',
    'Test your memory by matching pairs of cards',
    'puzzle',
    'Flip cards to find matching pairs',
    '/games/memory-match/index.html',
    'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop',
    ARRAY['puzzle', 'memory', 'cards', 'brain'],
    120,
    'published',
    '1.0.0'
  ),
  (
    'quick-math',
    'Quick Math',
    'Solve math problems as fast as you can!',
    'educational',
    'Type the answer to math problems quickly',
    '/games/quick-math/index.html',
    'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=400&h=600&fit=crop',
    ARRAY['educational', 'math', 'brain', 'numbers'],
    60,
    'published',
    '1.0.0'
  ),
  (
    'reaction-time',
    'Reaction Time',
    'Test your reflexes - how fast can you react?',
    'arcade',
    'Tap as quickly as possible when the screen changes',
    '/games/reaction-time/index.html',
    'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&h=600&fit=crop',
    ARRAY['arcade', 'reflex', 'speed', 'quick'],
    30,
    'published',
    '1.0.0'
  ),
  (
    'sky-hop',
    'Sky Hop',
    'Jump from cloud to cloud and reach for the sky!',
    'arcade',
    'Tap to jump between platforms',
    '/games/sky-hop/index.html',
    'https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=400&h=600&fit=crop',
    ARRAY['arcade', 'jump', 'platform', 'endless'],
    90,
    'published',
    '1.0.0'
  ),
  (
    'snake-classic',
    'Snake Classic',
    'The classic snake game - eat food and grow longer!',
    'arcade',
    'Use arrow keys or swipe to control the snake',
    '/games/snake-classic/index.html',
    'https://images.unsplash.com/photo-1635514874042-beb2447d392e?w=400&h=600&fit=crop',
    ARRAY['arcade', 'classic', 'snake', 'retro'],
    180,
    'published',
    '1.0.0'
  ),
  (
    'tile-match',
    'Tile Match',
    'Match tiles and clear the board in this puzzle game',
    'puzzle',
    'Click matching tiles to remove them',
    '/games/tile-match/index.html',
    'https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=400&h=600&fit=crop',
    ARRAY['puzzle', 'tiles', 'matching', 'strategy'],
    150,
    'published',
    '1.0.0'
  ),
  (
    'word-guess',
    'Word Guess',
    'Guess the word letter by letter before time runs out',
    'puzzle',
    'Type letters to guess the hidden word',
    '/games/word-guess/index.html',
    'https://images.unsplash.com/photo-1632501641765-e568c28f1e11?w=400&h=600&fit=crop',
    ARRAY['puzzle', 'words', 'educational', 'spelling'],
    120,
    'published',
    '1.0.0'
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  short_description = EXCLUDED.short_description,
  genre = EXCLUDED.genre,
  play_instructions = EXCLUDED.play_instructions,
  asset_bundle_url = EXCLUDED.asset_bundle_url,
  thumbnail_url = EXCLUDED.thumbnail_url,
  tags = EXCLUDED.tags,
  estimated_duration_seconds = EXCLUDED.estimated_duration_seconds,
  status = EXCLUDED.status,
  runtime_version = EXCLUDED.runtime_version,
  updated_at = NOW();

-- Add some sample likability scores for testing
UPDATE public.games
SET likability_score = (RANDOM() * 40 + 60)::integer
WHERE likability_score IS NULL OR likability_score = 0;