#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.VITE_SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "❌ Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE environment variables. Export them before running `npm run seed`.",
  );
  process.exit(1);
}

const BASE_HEADERS = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
};

const seedPath = path.resolve("seed/seed-games.json");

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
};

const normaliseGame = (game) => ({
  id: game.id,
  slug: game.slug,
  title: game.title,
  short_description: game.short_description ?? game.shortDescription,
  genre: game.genre,
  play_instructions: game.play_instructions ?? game.playInstructions,
  estimated_duration_seconds: game.estimated_duration_seconds ?? game.estimatedDurationSeconds ?? 90,
  runtime_version: game.runtime_version ?? game.runtimeVersion ?? "1.0.0",
  status: game.status ?? "draft",
  tags: ensureArray(game.tags),
  thumbnail_url: game.thumbnail_url ?? game.thumbnailUrl ?? "",
  asset_bundle_url: game.asset_bundle_url ?? game.assetBundleUrl ?? null,
});

const buildVariantPayload = (gameId, variant) => ({
  game_id: gameId,
  entry_html_path: variant.entry_html_path ?? variant.entryHtmlPath,
  build_hash: variant.build_hash ?? variant.buildHash ?? crypto.randomUUID().replace(/-/g, ""),
  build_size_kb: variant.build_size_kb ?? variant.buildSizeKb ?? 0,
  orientation: variant.orientation ?? "responsive",
  min_app_version: variant.min_app_version ?? variant.minAppVersion ?? "1.0.0",
});

const loadSeedFile = async () => {
  try {
    const raw = await readFile(seedPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn("⚠️  Seed file is empty. Nothing to import.");
      process.exit(0);
    }
    return parsed;
  } catch (error) {
    console.error(`❌ Unable to read seed data at ${seedPath}.`, error.message);
    process.exit(1);
  }
};

const upsertGames = async (games) => {
  const payload = games.map(normaliseGame);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/games?onConflict=slug`, {
    method: "POST",
    headers: {
      ...BASE_HEADERS,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to upsert games: ${detail}`);
  }

  const inserted = await response.json();
  const slugs = games.map((game) => game.slug);

  // When rows already exist, Supabase may not return them in the response. Fetch to ensure IDs.
  const filter = `(${slugs.join(",")})`;
  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/games?select=id,slug&slug=in.${encodeURIComponent(filter)}`,
    { headers: BASE_HEADERS },
  );

  if (!lookup.ok) {
    const detail = await lookup.text();
    throw new Error(`Failed to look up game IDs: ${detail}`);
  }

  const rows = await lookup.json();
  const slugToId = new Map();
  for (const row of rows) {
    slugToId.set(row.slug, row.id);
  }

  // Merge IDs returned from insert for completeness.
  for (const row of inserted) {
    if (row.slug && row.id) {
      slugToId.set(row.slug, row.id);
    }
  }

  return slugToId;
};

const replaceVariants = async (slugToId, games) => {
  for (const game of games) {
    const variants = ensureArray(game.variants);
    if (variants.length === 0) continue;

    const gameId = slugToId.get(game.slug);
    if (!gameId) {
      console.warn(`⚠️  Skipping variants for ${game.slug} (missing id).`);
      continue;
    }

    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/game_variants?game_id=eq.${gameId}`,
      {
        method: "DELETE",
        headers: BASE_HEADERS,
      },
    );

    if (!deleteResponse.ok) {
      const detail = await deleteResponse.text();
      throw new Error(`Failed to delete existing variants for ${game.slug}: ${detail}`);
    }

    const variantPayload = variants.map((variant) => buildVariantPayload(gameId, variant));

    if (variantPayload.length === 0) continue;

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/game_variants`, {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        Prefer: "return=representation",
      },
      body: JSON.stringify(variantPayload),
    });

    if (!insertResponse.ok) {
      const detail = await insertResponse.text();
      throw new Error(`Failed to insert variants for ${game.slug}: ${detail}`);
    }
  }
};

async function main() {
  const games = await loadSeedFile();
  console.log(`🚀 Seeding ${games.length} games into Supabase…`);
  const slugToId = await upsertGames(games);
  console.log(`✅ Upserted games (${slugToId.size} ids resolved).`);

  await replaceVariants(slugToId, games);
  console.log("✅ Variants synced.");
  console.log("🎉 Seeding complete.");
}

main().catch((error) => {
  console.error("❌ Seed failed:", error.message ?? error);
  process.exit(1);
});
