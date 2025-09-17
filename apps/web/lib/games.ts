import type { GameDefinition } from "@gametok/types";

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1489515217757-5fd1be406fef";

export interface SupabaseGameRow {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  genre: string;
  play_instructions: string;
  estimated_duration_seconds: number;
  asset_bundle_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  status: string;
  runtime_version: string;
  created_at: string;
  updated_at: string;
}

const resolveThumbnail = (thumbnail: string | null | undefined) => {
  if (!thumbnail || thumbnail.trim().length === 0) {
    return DEFAULT_THUMBNAIL;
  }
  return thumbnail;
};

export const mapGameRowToDefinition = (row: SupabaseGameRow): GameDefinition => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  shortDescription: row.short_description,
  genre: (row.genre as GameDefinition["genre"]) ?? "arcade",
  playInstructions: row.play_instructions,
  estimatedDurationSeconds: row.estimated_duration_seconds,
  assetBundleUrl: row.asset_bundle_url ?? "",
  thumbnailUrl: resolveThumbnail(row.thumbnail_url),
  tags: row.tags ?? [],
  status: (row.status as GameDefinition["status"]) ?? "draft",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  runtimeVersion: row.runtime_version,
});

export const fetchInitialGames = async (): Promise<GameDefinition[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return [];
  }

  const query = new URL(`${url}/rest/v1/games`);
  query.searchParams.set("select", "id,slug,title,short_description,genre,play_instructions,estimated_duration_seconds,asset_bundle_url,thumbnail_url,tags,status,runtime_version,created_at,updated_at");
  query.searchParams.set("status", "eq.published");
  query.searchParams.set("order", "created_at.desc");
  query.searchParams.set("limit", "25");

  const response = await fetch(query.toString(), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    // Revalidate periodically in production; skip caching locally.
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    console.warn("Failed to fetch games from Supabase:", await response.text());
    return [];
  }

  const rows = (await response.json()) as SupabaseGameRow[];

  const scoresResponse = await fetch(`${url}/rest/v1/likability_scores`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    next: { revalidate: 30 },
  });

  let scores: Record<string, number> = {};
  if (scoresResponse.ok) {
    const scoreRows = (await scoresResponse.json()) as Array<{ game_id: string; score: number }>;
    scores = scoreRows.reduce((acc, row) => {
      acc[row.game_id] = Number(row.score) ?? 0;
      return acc;
    }, {} as Record<string, number>);
  }

  const definitions = rows.map(mapGameRowToDefinition);

  return definitions.sort((a, b) => {
    const scoreA = scores[a.id] ?? 0;
    const scoreB = scores[b.id] ?? 0;
    if (scoreA === scoreB) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return scoreB - scoreA;
  });
};
