import type { GameDefinition } from "@gametok/types";
import { GameFeed } from "./_components/game-feed";

const SAMPLE_GAMES: GameDefinition[] = [
  {
    id: "demo-runner",
    slug: "neon-runner",
    title: "Neon Runner",
    shortDescription: "Dodge, dash, and collect energy orbs in an endless city.",
    genre: "runner",
    playInstructions: "Swipe to dodge, tap to jump.",
    estimatedDurationSeconds: 120,
    assetBundleUrl: "https://cdn.example.com/games/neon-runner/index.html",
    thumbnailUrl: "https://cdn.example.com/games/neon-runner/thumb.png",
    tags: ["fast", "reflex"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runtimeVersion: "1.0.0",
  },
  {
    id: "demo-tower-defense",
    slug: "skyward-guardians",
    title: "Skyward Guardians",
    shortDescription: "Strategize towers to defend floating isles from invaders.",
    genre: "tower_defense",
    playInstructions: "Drag towers into slots before enemies arrive.",
    estimatedDurationSeconds: 180,
    assetBundleUrl: "https://cdn.example.com/games/skyward-guardians/index.html",
    thumbnailUrl: "https://cdn.example.com/games/skyward-guardians/thumb.png",
    tags: ["strategy", "tactical"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runtimeVersion: "1.0.0",
  },
  {
    id: "demo-puzzle",
    slug: "color-bloom",
    title: "Color Bloom",
    shortDescription: "Match petals to bloom gardens in timed puzzles.",
    genre: "puzzle",
    playInstructions: "Tap clusters of 3+ to score combos.",
    estimatedDurationSeconds: 90,
    assetBundleUrl: "https://cdn.example.com/games/color-bloom/index.html",
    thumbnailUrl: "https://cdn.example.com/games/color-bloom/thumb.png",
    tags: ["casual", "satisfying"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runtimeVersion: "1.0.0",
  },
];

export default function BrowsePage() {
  return <GameFeed initialGames={SAMPLE_GAMES} />;
}
