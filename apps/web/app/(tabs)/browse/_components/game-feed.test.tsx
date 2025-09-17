import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GameDefinition } from "@gametok/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GameFeed } from "./game-feed";

const GAMES: GameDefinition[] = [
  {
    id: "test",
    slug: "test",
    title: "Test Game",
    shortDescription: "A demo game for tests.",
    genre: "arcade",
    playInstructions: "Tap to win.",
    estimatedDurationSeconds: 60,
    assetBundleUrl: "about:blank",
    thumbnailUrl: "about:blank",
    tags: [],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runtimeVersion: "1.0.0",
  },
];

describe("GameFeed", () => {
  it("renders the provided games", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <GameFeed initialGames={GAMES} />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Test Game")).toBeInTheDocument();
    expect(screen.getByText(/demo game/i)).toBeInTheDocument();
  });
});
