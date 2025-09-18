-- Drop the existing table if it exists (it might not have the constraint)
DROP TABLE IF EXISTS public.likability_scores CASCADE;

-- Recreate the table with proper constraint
CREATE TABLE public.likability_scores (
  game_id UUID PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  genre TEXT,
  score DECIMAL(3,2),
  components JSONB,
  sample_size INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint explicitly (redundant with PRIMARY KEY but ensures it's there)
ALTER TABLE public.likability_scores
  ADD CONSTRAINT likability_scores_game_id_unique UNIQUE (game_id);

-- Grant permissions
GRANT ALL ON public.likability_scores TO anon, authenticated, service_role;

-- Test that the constraint exists
SELECT conname FROM pg_constraint
WHERE conrelid = 'likability_scores'::regclass
AND contype = 'u';