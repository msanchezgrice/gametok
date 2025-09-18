const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zpthvazjsiagqadifzmh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdGh2YXpqc2lhZ3FhZGlmem1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEyNTYzNSwiZXhwIjoyMDczNzAxNjM1fQ.wombXtZz8d6SLgBo7aqwDanwbhZmJBmGLs7Z8syntfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const gamesToRemove = [
  'tower-defense-pro',
  'drift-king',
  'puzzle-master',
  'space-blaster',
  'ninja-jump',
  'skyline-runner'
];

async function removeOldGames() {
  console.log('Removing old games from database...');

  // First, get the game IDs
  const { data: gamesToDelete } = await supabase
    .from('games')
    .select('id, slug')
    .in('slug', gamesToRemove);

  if (gamesToDelete && gamesToDelete.length > 0) {
    const gameIds = gamesToDelete.map(g => g.id);

    // Delete game sessions first
    const { error: sessionError } = await supabase
      .from('game_sessions')
      .delete()
      .in('game_id', gameIds);

    if (sessionError) {
      console.error('Error deleting sessions:', sessionError);
    } else {
      console.log(`✅ Deleted sessions for ${gameIds.length} games`);
    }

    // Delete game events
    const { error: eventError } = await supabase
      .from('game_events')
      .delete()
      .in('game_id', gameIds);

    if (eventError) {
      console.error('Error deleting events:', eventError);
    } else {
      console.log(`✅ Deleted events for games`);
    }

    // Now delete the games
    for (const game of gamesToDelete) {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id);

      if (error) {
        console.error(`Error removing ${game.slug}:`, error);
      } else {
        console.log(`✅ Removed ${game.slug}`);
      }
    }
  }

  console.log('Done! Old games have been removed.');

  // List remaining games
  const { data, error } = await supabase
    .from('games')
    .select('title, slug, status')
    .order('title');

  if (data) {
    console.log('\nRemaining games in database:');
    data.forEach(game => {
      console.log(`- ${game.title} (${game.slug}) - ${game.status}`);
    });
  }
}

removeOldGames().catch(console.error);