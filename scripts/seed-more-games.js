const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zpthvazjsiagqadifzmh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdGh2YXpqc2lhZ3FhZGlmem1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEyNTYzNSwiZXhwIjoyMDczNzAxNjM1fQ.wombXtZz8d6SLgBo7aqwDanwbhZmJBmGLs7Z8syntfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const games = [
  {
    slug: 'snake-classic',
    title: 'Snake Classic',
    short_description: 'Guide the snake to eat food and grow longer',
    genre: 'arcade',
    play_instructions: 'Use arrow keys or swipe to control the snake',
    asset_bundle_url: '/games/snake-classic/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc31?w=400&h=600&fit=crop',
    tags: ['snake', 'classic', 'arcade', 'retro', 'strategy'],
    estimated_duration_seconds: 180,
    runtime_version: '1.0.0',
    status: 'published'
  },
  {
    slug: 'word-guess',
    title: 'Word Guess',
    short_description: 'Guess the hidden word letter by letter',
    genre: 'puzzle',
    play_instructions: 'Choose letters to reveal the word before time runs out',
    asset_bundle_url: '/games/word-guess/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1632501641765-e568c28b0015?w=400&h=600&fit=crop',
    tags: ['words', 'puzzle', 'vocabulary', 'educational', 'letters'],
    estimated_duration_seconds: 90,
    runtime_version: '1.0.0',
    status: 'published'
  },
  {
    slug: 'brick-breaker',
    title: 'Brick Breaker',
    short_description: 'Break all the bricks with your bouncing ball',
    genre: 'arcade',
    play_instructions: 'Move paddle to keep the ball in play',
    asset_bundle_url: '/games/brick-breaker/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&h=600&fit=crop',
    tags: ['bricks', 'arcade', 'classic', 'breakout', 'paddle'],
    estimated_duration_seconds: 120,
    runtime_version: '1.0.0',
    status: 'published'
  },
  {
    slug: 'reaction-time',
    title: 'Reaction Time',
    short_description: 'Test your reflexes and reaction speed',
    genre: 'arcade',
    play_instructions: 'Tap as fast as you can when the screen turns green',
    asset_bundle_url: '/games/reaction-time/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1609205807107-e8ec6d120f9d?w=400&h=600&fit=crop',
    tags: ['reaction', 'reflexes', 'speed', 'test', 'timing'],
    estimated_duration_seconds: 30,
    runtime_version: '1.0.0',
    status: 'published'
  },
  {
    slug: 'sky-hop',
    title: 'Sky Hop',
    short_description: 'Hop through clouds and avoid obstacles',
    genre: 'arcade',
    play_instructions: 'Tap to jump and navigate through pipes',
    asset_bundle_url: '/games/sky-hop/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=400&h=600&fit=crop',
    tags: ['flappy', 'hop', 'sky', 'flying', 'endless'],
    estimated_duration_seconds: 60,
    runtime_version: '1.0.0',
    status: 'published'
  },
  {
    slug: 'tile-match',
    title: 'Tile Match',
    short_description: 'Match 3 or more tiles to score points',
    genre: 'puzzle',
    play_instructions: 'Swap adjacent tiles to create matches',
    asset_bundle_url: '/games/tile-match/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1570303345338-e1f0eddf4946?w=400&h=600&fit=crop',
    tags: ['match3', 'puzzle', 'tiles', 'fruit', 'matching'],
    estimated_duration_seconds: 60,
    runtime_version: '1.0.0',
    status: 'published'
  }
];

async function seedGames() {
  console.log('Adding 6 more demo games to database...');

  for (const game of games) {
    const { data, error } = await supabase
      .from('games')
      .upsert(game, { onConflict: 'slug' });

    if (error) {
      console.error(`Error adding ${game.title}:`, error);
    } else {
      console.log(`✅ Added ${game.title}`);
    }
  }

  console.log('Done! All 6 new games have been added.');
}

seedGames().catch(console.error);