#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const seedPath = path.resolve("seed/seed-games.json");
  try {
    const payload = await readFile(seedPath, "utf8");
    console.log("Seed payload loaded (add Supabase upload logic):", payload.length, "bytes");
  } catch (error) {
    console.warn("No seed data found at", seedPath, "-- create seed/seed-games.json to bootstrap games.");
  }
  console.log("TODO: implement Supabase seeding pipeline.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
