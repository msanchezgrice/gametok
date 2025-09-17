import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, GameDefinition } from "@gametok/types";
import { mapGameRowToDefinition, type SupabaseGameRow } from "./games";

interface FavoriteRow {
  game: SupabaseGameRow | null;
  created_at: string;
}

export const fetchFavoriteGames = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<GameDefinition[]> => {
  const { data, error } = await supabase
    .from("favorites")
    .select(
      `created_at,
      game:games (
        id,
        slug,
        title,
        short_description,
        genre,
        play_instructions,
        estimated_duration_seconds,
        asset_bundle_url,
        thumbnail_url,
        tags,
        status,
        runtime_version,
        created_at,
        updated_at
      )`,
    )
    .eq("user_id", userId)
    .eq("games.status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as FavoriteRow[];
  return rows
    .map((row) => (row.game ? mapGameRowToDefinition(row.game) : null))
    .filter((game): game is GameDefinition => Boolean(game));
};

export const toggleFavorite = async (
  supabase: SupabaseClient<Database>,
  gameId: string,
  isFavorite: boolean,
) => {
  if (isFavorite) {
    const { error } = await supabase.from("favorites").delete().eq("game_id", gameId);
    if (error) throw error;
    return { removed: true } as const;
  }

  const { error } = await supabase.from("favorites").insert({ game_id: gameId });
  if (error) throw error;
  return { removed: false } as const;
};
