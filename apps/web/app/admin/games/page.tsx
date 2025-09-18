"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useOptionalSupabaseBrowser } from "@/app/providers";
import type { GameDefinition } from "@gametok/types";

type SortField = "title" | "likability_score" | "play_count" | "avg_duration" | "completion_rate";
type SortOrder = "asc" | "desc";

interface GameWithStats extends GameDefinition {
  play_count?: number;
  unique_players?: number;
  avg_duration?: number;
  completion_rate?: number;
  likability_score?: number;
  last_played?: string;
}

export default function GameManagementPage() {
  const supabase = useOptionalSupabaseBrowser();
  const [games, setGames] = useState<GameWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("likability_score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadGamesWithStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const loadGamesWithStats = async () => {
    if (!supabase) {
      console.log("No supabase client available");
      setError("Unable to connect to database");
      setLoading(false);
      return;
    }

    console.log("Loading games from Supabase...");
    setLoading(true);
    setError(null);
    try {
      // Fetch games with their stats
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select(`
          *,
          game_sessions (
            id,
            started_at,
            completed,
            score,
            time_elapsed
          )
        `)
        .order("created_at", { ascending: false });

      if (gamesError) {
        console.error("Error loading games:", gamesError);
        console.error("Full error details:", JSON.stringify(gamesError, null, 2));
        setError(gamesError.message || "Failed to load games");
        setLoading(false);
        return;
      }

      console.log("Games data received:", gamesData);
      console.log("Number of games:", gamesData?.length || 0);

      // Process games and calculate stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gamesWithStats = gamesData?.map((game: any) => {
        const sessions = game.game_sessions || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const completedSessions = sessions.filter((s: any) => s.completed);

        return {
          id: game.id,
          slug: game.slug,
          title: game.title,
          shortDescription: game.short_description,
          genre: game.genre,
          playInstructions: game.play_instructions,
          assetBundleUrl: game.asset_bundle_url,
          thumbnailUrl: game.thumbnail_url,
          tags: game.tags,
          author: null,
          estimatedDurationSeconds: game.estimated_duration_seconds,
          runtimeVersion: game.runtime_version,
          status: game.status,
          createdAt: game.created_at,
          updatedAt: game.updated_at,
          // Stats
          play_count: sessions.length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unique_players: new Set(sessions.map((s: any) => s.user_id || "anon")).size,
          avg_duration: sessions.length > 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sessions.reduce((sum: number, s: any) => sum + (s.time_elapsed || 0), 0) / sessions.length
            : 0,
          completion_rate: sessions.length > 0
            ? (completedSessions.length / sessions.length) * 100
            : 0,
          likability_score: game.likability_score || 0,
          last_played: sessions.length > 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sessions.sort((a: any, b: any) =>
                new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
              )[0]?.started_at
            : null,
        };
      }) || [];

      setGames(gamesWithStats);
    } catch (error) {
      console.error("Error processing games:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortGames = (games: GameWithStats[]) => {
    return [...games].sort((a, b) => {
      let aVal = a[sortField] || 0;
      let bVal = b[sortField] || 0;

      if (sortField === "title") {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  const filterGames = (games: GameWithStats[]) => {
    let filtered = games;

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter(g => g.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const displayGames = sortGames(filterGames(games));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Game Management</h1>
            <p className="text-gray-400">Manage your game catalog and monitor performance</p>
          </div>
          <Link
            href="/admin/games/new"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Add Game
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-800 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort("likability_score")}
                className={`px-4 py-2 rounded-lg ${
                  sortField === "likability_score"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                Likability {sortField === "likability_score" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => handleSort("play_count")}
                className={`px-4 py-2 rounded-lg ${
                  sortField === "play_count"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                Plays {sortField === "play_count" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => handleSort("completion_rate")}
                className={`px-4 py-2 rounded-lg ${
                  sortField === "completion_rate"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                Completion {sortField === "completion_rate" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
            </div>
          </div>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400">Loading games...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">Error Loading Games</div>
            <div className="text-gray-400 text-sm">{error}</div>
            <button
              onClick={() => loadGamesWithStats()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : displayGames.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400">No games found</div>
            <p className="text-gray-500 text-sm mt-2">
              {games.length === 0
                ? "No games in the database. Add your first game to get started."
                : "No games match your current filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayGames.map((game) => (
              <div
                key={game.id}
                className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[3/4] bg-gray-800">
                  {game.thumbnailUrl ? (
                    <Image
                      src={game.thumbnailUrl}
                      alt={game.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <span className="text-6xl">🎮</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        game.status === "published"
                          ? "bg-green-600 text-white"
                          : game.status === "draft"
                          ? "bg-yellow-600 text-white"
                          : "bg-gray-600 text-white"
                      }`}
                    >
                      {game.status}
                    </span>
                  </div>
                </div>

                {/* Game Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{game.title}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {game.shortDescription}
                  </p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-800 rounded px-2 py-1">
                      <div className="text-gray-400 text-xs">Likability</div>
                      <div className="font-semibold">
                        {game.likability_score ? game.likability_score.toFixed(1) : "0.0"}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded px-2 py-1">
                      <div className="text-gray-400 text-xs">Plays</div>
                      <div className="font-semibold">{game.play_count || 0}</div>
                    </div>
                    <div className="bg-gray-800 rounded px-2 py-1">
                      <div className="text-gray-400 text-xs">Completion</div>
                      <div className="font-semibold">
                        {game.completion_rate ? `${game.completion_rate.toFixed(0)}%` : "0%"}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded px-2 py-1">
                      <div className="text-gray-400 text-xs">Avg Time</div>
                      <div className="font-semibold">
                        {game.avg_duration
                          ? `${Math.round(game.avg_duration)}s`
                          : "0s"}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => window.location.href = `/admin/games/${game.slug}/edit`}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded text-center text-sm transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <Link
                      href={`/browse#${game.slug}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded text-center text-sm transition-colors"
                    >
                      Play
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}