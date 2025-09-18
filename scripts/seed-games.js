const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zpthvazjsiagqadifzmh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdGh2YXpqc2lhZ3FhZGlmem1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEyNTYzNSwiZXhwIjoyMDczNzAxNjM1fQ.wombXtZz8d6SLgBo7aqwDanwbhZmJBmGLs7Z8syntfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const games = [
  {
    slug: 'memory-match',
    title: 'Memory Match',
    short_description: 'Test your memory with this classic card matching game',
    genre: 'puzzle',
    play_instructions: 'Tap cards to flip them and find matching pairs',
    asset_bundle_url: '/games/memory-match/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=600&fit=crop',
    tags: ['memory', 'puzzle', 'cards', 'matching', 'brain'],
    estimated_duration_seconds: 120,
    runtime_version: '1.0.0',
    status: 'published'
  },
  {
    slug: 'bubble-pop',
    title: 'Bubble Pop',
    short_description: 'Pop colorful bubbles before they float away',
    genre: 'arcade',
    play_instructions: 'Tap bubbles to pop them - smaller bubbles give more points!',
    asset_bundle_url: '/games/bubble-pop/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1530651788726-1dbf58eeef1f?w=400&h=600&fit=crop',
    tags: ['bubbles', 'arcade', 'casual', 'pop', 'fun'],
    estimated_duration_seconds: 60,
    runtime_version: '1.0.0',
    status: 'published'
  },
  {
    slug: 'quick-math',
    title: 'Quick Math',
    short_description: 'Solve math equations as fast as you can',
    genre: 'educational',
    play_instructions: 'Choose the correct answer before time runs out',
    asset_bundle_url: '/games/quick-math/index.html',
    thumbnail_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=600&fit=crop',
    tags: ['math', 'educational', 'numbers', 'brain', 'learning'],
    estimated_duration_seconds: 60,
    runtime_version: '1.0.0',
    status: 'published'
  }
];

async function seedGames() {
  console.log('Adding demo games to database...');

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

  console.log('Done! All demo games have been added.');
}

seedGames().catch(console.error);