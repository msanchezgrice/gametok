"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOptionalSupabaseBrowser } from "@/app/providers";
import type { GameDefinition } from "@gametok/types";

const popularTags = [
  { name: "arcade", color: "from-blue-500 to-purple-500" },
  { name: "runner", color: "from-green-500 to-teal-500" },
  { name: "puzzle", color: "from-yellow-500 to-orange-500" },
  { name: "action", color: "from-red-500 to-pink-500" },
  { name: "strategy", color: "from-purple-500 to-indigo-500" },
  { name: "casual", color: "from-pink-500 to-rose-500" },
];

const trendingGames = [
  { id: "1", title: "Skyline Runner", plays: "12.5K", trend: "+15%" },
  { id: "2", title: "Space Blaster", plays: "8.2K", trend: "+8%" },
  { id: "3", title: "Puzzle Master", plays: "6.7K", trend: "+22%" },
  { id: "4", title: "Drift King", plays: "5.1K", trend: "+5%" },
];

export default function SearchPage() {
  const supabase = useOptionalSupabaseBrowser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GameDefinition[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search games when query or tag changes
  useEffect(() => {
    const searchGames = async () => {
      if (!supabase || (!searchQuery && !selectedTag)) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        let query = supabase.from("games").select("*").eq("status", "published");

        // Search by title or description
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,short_description.ilike.%${searchQuery}%`);
        }

        // Filter by tag
        if (selectedTag) {
          query = query.contains("tags", [selectedTag]);
        }

        const { data, error } = await query.limit(20);

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
          setSearchResults(games);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchGames, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedTag, supabase]);

  return (
    <div className="flex h-full flex-col bg-black text-white">
      {/* Search Header */}
      <div className="border-b border-white/10 p-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            className="w-full rounded-full bg-white/10 py-3 pl-12 pr-4 text-white placeholder-white/40 outline-none focus:bg-white/20 transition-colors"
          />
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Search Results */}
        {(searchQuery || selectedTag) && searchResults.length > 0 && (
          <div className="p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
              Search Results {isSearching && "..."}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {searchResults.map((game) => (
                <Link
                  key={game.id}
                  href="/browse"
                  className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-900"
                >
                  {game.thumbnailUrl && (
                    <img
                      src={game.thumbnailUrl}
                      alt={game.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-bold line-clamp-1">{game.title}</p>
                    <p className="text-xs text-white/70 line-clamp-1">{game.shortDescription}</p>
                    <div className="mt-1 flex gap-1">
                      {game.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] text-white/60">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {(searchQuery || selectedTag) && !isSearching && searchResults.length === 0 && (
          <div className="p-8 text-center">
            <div className="mb-2 text-4xl">🔍</div>
            <p className="text-white/60">No games found</p>
            <p className="mt-1 text-sm text-white/40">Try a different search or tag</p>
          </div>
        )}

        {/* Popular Tags */}
        <div className="p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
            Popular Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => setSelectedTag(tag.name === selectedTag ? null : tag.name)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedTag === tag.name
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Trending Now */}
        <div className="border-t border-white/10 p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
            🔥 Trending Now
          </h2>
          <div className="space-y-3">
            {trendingGames.map((game, index) => (
              <Link
                key={game.id}
                href="/browse"
                className="flex items-center gap-3 rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-lg font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{game.title}</p>
                  <p className="text-xs text-white/60">{game.plays} plays</p>
                </div>
                <span className="text-sm font-medium text-green-400">{game.trend}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="border-t border-white/10 p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
            Browse Categories
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {["New & Hot", "Most Played", "Editor's Choice", "Quick Games", "Multiplayer", "Solo Adventures"].map((category) => (
              <Link
                key={category}
                href="/browse"
                className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 p-4 text-center transition-transform hover:scale-105 active:scale-95"
              >
                <div className="mb-2 text-2xl">
                  {category === "New & Hot" && "🆕"}
                  {category === "Most Played" && "🏆"}
                  {category === "Editor's Choice" && "⭐"}
                  {category === "Quick Games" && "⚡"}
                  {category === "Multiplayer" && "👥"}
                  {category === "Solo Adventures" && "🎮"}
                </div>
                <p className="text-sm font-medium">{category}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="border-t border-white/10 p-4 pb-20">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
            Recent Searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {["runner games", "puzzle", "high score", "endless"].map((search) => (
              <button
                key={search}
                onClick={() => setSearchQuery(search)}
                className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}