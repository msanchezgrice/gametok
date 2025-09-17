-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Service role manages session events" ON public.session_events;
DROP POLICY IF EXISTS "Users read own session events" ON public.session_events;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Service role manages sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users read own sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.game_sessions;

-- Disable RLS temporarily to allow all operations (for testing)
ALTER TABLE public.session_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated and anon roles
GRANT ALL ON public.session_events TO anon, authenticated;
GRANT ALL ON public.game_sessions TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;