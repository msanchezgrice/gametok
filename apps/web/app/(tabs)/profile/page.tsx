"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOptionalSupabaseBrowser } from "@/app/providers";
import type { GameDefinition } from "@gametok/types";

export default function ProfilePage() {
  const supabase = useOptionalSupabaseBrowser();
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [favoriteGames, setFavoriteGames] = useState<GameDefinition[]>([]);
  const [savedGames, setSavedGames] = useState<GameDefinition[]>([]);
  const [activeTab, setActiveTab] = useState<"favorites" | "saved">("favorites");

  useEffect(() => {
    // Load favorites from localStorage
    try {
      const storedFavorites = localStorage.getItem("clipcade_favorites");
      const storedSaved = localStorage.getItem("clipcade_saved");

      const favoriteIds: string[] = storedFavorites ? JSON.parse(storedFavorites) : [];
      const savedIds: string[] = storedSaved ? JSON.parse(storedSaved) : [];
      const allIds = [...new Set([...favoriteIds, ...savedIds])];

      if (allIds.length > 0 && supabase) {
        supabase
          .from("games")
          .select("*")
          .in("id", allIds)
          .then(({ data, error }) => {
            if (!error && data) {
              const games: GameDefinition[] = data.map((game: {
                id: string;
                slug: string;
                title: string;
                short_description: string;
                genre: string;
                play_instructions: string;
                asset_bundle_url: string;
                thumbnail_url: string;
                tags: string[];
                estimated_duration_seconds: number;
                runtime_version: string;
                status: string;
                created_at: string;
                updated_at: string;
              }) => ({
                id: game.id,
                slug: game.slug,
                title: game.title,
                shortDescription: game.short_description,
                genre: game.genre as GameDefinition["genre"],
                playInstructions: game.play_instructions,
                assetBundleUrl: game.asset_bundle_url || `/games/${game.slug}/index.html`,
                thumbnailUrl: game.thumbnail_url || "",
                tags: game.tags || [],
                author: null,
                estimatedDurationSeconds: game.estimated_duration_seconds,
                runtimeVersion: game.runtime_version,
                status: game.status as GameDefinition["status"],
                createdAt: game.created_at,
                updatedAt: game.updated_at,
              }));
              // Filter games based on which list they belong to
              const favGames = games.filter(g => favoriteIds.includes(g.id));
              const savGames = games.filter(g => savedIds.includes(g.id));
              setFavoriteGames(favGames);
              setSavedGames(savGames);
            }
          });
      }
    } catch (error) {
      console.error("Failed to parse stored favorites:", error);
    }

    // Get user info if logged in
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data?.user);
      });
    }
  }, [supabase]);

  return (
    <div className="flex h-full flex-col bg-black text-white">
      {/* Profile Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-b from-purple-600 to-pink-600" />

        {/* Profile Info */}
        <div className="relative -mt-12 px-4 pb-4">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full border-4 border-black bg-gradient-to-br from-blue-500 to-purple-600" />

            <div className="mb-2 flex-1">
              <h1 className="text-xl font-bold">
                {user?.email?.split("@")[0] || "Anonymous Player"}
              </h1>
              <p className="text-sm text-white/60">@player_{Math.random().toString(36).slice(2, 8)}</p>
            </div>

            {/* Edit Profile Button */}
            <Link
              href="/settings"
              className="mb-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium"
            >
              Edit Profile
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <span className="font-bold">{favoriteGames.length}</span>
              <span className="ml-1 text-white/60">Favorites</span>
            </div>
            <div>
              <span className="font-bold">42</span>
              <span className="ml-1 text-white/60">Games Played</span>
            </div>
            <div>
              <span className="font-bold">1.2K</span>
              <span className="ml-1 text-white/60">Score</span>
            </div>
          </div>

          {/* Bio */}
          <p className="mt-3 text-sm text-white/80">
            🎮 Gaming enthusiast | High score hunter | Endless runner champion
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "favorites"
              ? "border-b-2 border-white text-white"
              : "text-white/60"
          }`}
        >
          ❤️ Favorites
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "saved"
              ? "border-b-2 border-white text-white"
              : "text-white/60"
          }`}
        >
          🔖 Saved
        </button>
      </div>

      {/* Games Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {(activeTab === "favorites" ? favoriteGames : savedGames).length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <div className="mb-2 text-4xl">
                {activeTab === "favorites" ? "❤️" : "🔖"}
              </div>
              <p className="text-white/60">
                No {activeTab} yet
              </p>
              <Link
                href="/browse"
                className="mt-4 inline-block rounded-full bg-white/10 px-6 py-2 text-sm font-medium"
              >
                Discover Games
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {(activeTab === "favorites" ? favoriteGames : savedGames).map((game) => (
              <Link
                key={game.id}
                href={`/browse#${game.slug}`}
                className="relative aspect-[9/16] overflow-hidden rounded bg-gray-900"
              >
                {game.thumbnailUrl && (
                  <img
                    src={game.thumbnailUrl}
                    alt={game.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                <div className="absolute bottom-0 left-0 p-2">
                  <p className="text-xs font-medium line-clamp-1">{game.title}</p>
                  <p className="text-[10px] text-white/60">{game.genre}</p>
                </div>
                <div className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium">
                  ❤️
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}