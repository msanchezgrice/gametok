-- Add three new demo games to the catalog
INSERT INTO games (
    slug,
    title,
    short_description,
    genre,
    play_instructions,
    asset_bundle_url,
    thumbnail_url,
    tags,
    estimated_duration_seconds,
    runtime_version,
    status
) VALUES
(
    'memory-match',
    'Memory Match',
    'Test your memory with this classic card matching game',
    'puzzle',
    'Tap cards to flip them and find matching pairs',
    '/games/memory-match/index.html',
    'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop',
    ARRAY['memory', 'puzzle', 'cards', 'matching', 'brain'],
    120,
    '1.0.0',
    'published'
),
(
    'bubble-pop',
    'Bubble Pop',
    'Pop colorful bubbles before they float away',
    'arcade',
    'Tap bubbles to pop them - smaller bubbles give more points!',
    '/games/bubble-pop/index.html',
    'https://images.unsplash.com/photo-1530651788726-1dbf58eeef1f?w=400&h=600&fit=crop',
    ARRAY['bubbles', 'arcade', 'casual', 'pop', 'fun'],
    60,
    '1.0.0',
    'published'
),
(
    'quick-math',
    'Quick Math',
    'Solve math equations as fast as you can',
    'educational',
    'Choose the correct answer before time runs out',
    '/games/quick-math/index.html',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=600&fit=crop',
    ARRAY['math', 'educational', 'numbers', 'brain', 'learning'],
    60,
    '1.0.0',
    'published'
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
    runtime_version = EXCLUDED.runtime_version,
    status = EXCLUDED.status,
    updated_at = NOW();