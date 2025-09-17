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

export const mapGameRowToDefinition = (row: SupabaseGameRow): GameDefinition => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  shortDescription: row.short_description,
  genre: (row.genre as GameDefinition["genre"]) ?? "arcade",
  playInstructions: row.play_instructions,
  estimatedDurationSeconds: row.estimated_duration_seconds,
  assetBundleUrl: row.asset_bundle_url ?? "",
  thumbnailUrl: row.thumbnail_url ?? DEFAULT_THUMBNAIL,
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
  return rows.map(mapGameRowToDefinition);
};
