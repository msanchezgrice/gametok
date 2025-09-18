"use client";

import { useEffect, useState } from "react";
import { useOptionalSupabaseBrowser } from "@/app/providers";
import { useRouter } from "next/navigation";

interface GameSession {
  game_id: string;
  user_id: string | null;
  started_at: string;
  total_seconds: number | null;
  completed: boolean;
  shares: number | null;
  restarts: number | null;
  games?: {
    title: string;
    genre: string;
  };
}

interface GameAggregateData {
  game_id: string;
  title: string;
  genre: string;
  sessions: GameSession[];
  unique_users: Set<string>;
  total_seconds: number;
  completions: number;
  shares: number;
  restarts: number;
  last_played: string;
}

interface LikabilityScore {
  game_id: string;
  score: number;
}

interface SessionSummary {
  id: string;
  user_id: string | null;
  total_seconds: number | null;
  shares: number | null;
}

interface GameMetrics {
  game_id: string;
  title: string;
  genre: string;
  total_plays: number;
  unique_players: number;
  avg_session_seconds: number;
  completion_rate: number;
  favorite_count: number;
  share_count: number;
  abandonment_rate: number;
  restart_rate: number;
  likability_score: number;
  last_played: string;
}

interface OverallStats {
  total_games: number;
  total_sessions: number;
  total_users: number;
  avg_session_length: number;
  total_favorites: number;
  total_shares: number;
}

export default function AdminAnalyticsPage() {
  const supabase = useOptionalSupabaseBrowser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [gameMetrics, setGameMetrics] = useState<GameMetrics[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [sortBy, setSortBy] = useState<keyof GameMetrics>("total_plays");
  const [timeRange, setTimeRange] = useState("7d");

  // Check admin authorization
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();

      // Simple admin check - in production, check against admin users table
      const ADMIN_EMAILS = ["admin@example.com", "miguel@example.com"];

      if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
        // For demo purposes, allow access without auth
        setAuthorized(true); // Change to false for production
      } else {
        setAuthorized(true);
      }
    };

    checkAuth();
  }, [supabase, router]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!supabase || !authorized) return;

      setLoading(true);

      try {
        // Fetch game metrics with aggregated data
        const { data: metricsData, error: metricsError } = await supabase
          .from("game_sessions")
          .select(`
            game_id,
            games!inner(title, genre),
            completed,
            total_seconds,
            restarts,
            shares,
            user_id,
            started_at
          `)
          .gte("started_at", getTimeRangeDate(timeRange))
          .order("started_at", { ascending: false });

        if (!metricsError && metricsData) {
          // Aggregate metrics by game
          const aggregated = aggregateGameMetrics(metricsData);

          // Fetch likability scores
          const { data: likabilityData } = await supabase
            .from("likability_scores")
            .select("game_id, score")
            .returns<LikabilityScore[]>();

          // Merge likability scores
          if (likabilityData) {
            aggregated.forEach(game => {
              const score = likabilityData.find((l: LikabilityScore) => l.game_id === game.game_id);
              if (score) game.likability_score = score.score;
            });
          }

          setGameMetrics(aggregated);
        }

        // Calculate overall stats
        const { data: sessionsData } = await supabase
          .from("game_sessions")
          .select("id, user_id, total_seconds, shares")
          .gte("started_at", getTimeRangeDate(timeRange))
          .returns<SessionSummary[]>();

        const { data: favoritesData } = await supabase
          .from("favorites")
          .select("id")
          .gte("created_at", getTimeRangeDate(timeRange));

        const { data: gamesCount } = await supabase
          .from("games")
          .select("id", { count: "exact" });

        if (sessionsData) {
          const uniqueUsers = new Set(sessionsData.map((s: SessionSummary) => s.user_id).filter(Boolean));
          const totalSeconds = sessionsData.reduce((acc: number, s: SessionSummary) => acc + (s.total_seconds || 0), 0);
          const totalShares = sessionsData.reduce((acc: number, s: SessionSummary) => acc + (s.shares || 0), 0);

          setOverallStats({
            total_games: gamesCount?.length || 0,
            total_sessions: sessionsData.length,
            total_users: uniqueUsers.size,
            avg_session_length: sessionsData.length > 0 ? totalSeconds / sessionsData.length : 0,
            total_favorites: favoritesData?.length || 0,
            total_shares: totalShares,
          });
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [supabase, authorized, timeRange]);

  const getTimeRangeDate = (range: string) => {
    const now = new Date();
    switch (range) {
      case "1d": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case "all": return new Date(0).toISOString();
      default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const aggregateGameMetrics = (sessions: GameSession[]): GameMetrics[] => {
    const gameMap = new Map<string, GameAggregateData>();

    sessions.forEach(session => {
      const gameId = session.game_id;
      if (!gameMap.has(gameId)) {
        gameMap.set(gameId, {
          game_id: gameId,
          title: session.games?.title || "Unknown",
          genre: session.games?.genre || "unknown",
          sessions: [],
          unique_users: new Set(),
          total_seconds: 0,
          completions: 0,
          shares: 0,
          restarts: 0,
          last_played: session.started_at,
        });
      }

      const game = gameMap.get(gameId);
      if (game) {
        game.sessions.push(session);
        if (session.user_id) game.unique_users.add(session.user_id);
        game.total_seconds += session.total_seconds || 0;
        if (session.completed) game.completions++;
        game.shares += session.shares || 0;
        game.restarts += session.restarts || 0;
        const sessionTime = session.started_at;
        if (new Date(sessionTime) > new Date(game.last_played)) {
          game.last_played = sessionTime;
        }
      }
    });

    return Array.from(gameMap.values()).map(game => ({
      game_id: game.game_id,
      title: game.title,
      genre: game.genre,
      total_plays: game.sessions.length,
      unique_players: game.unique_users.size,
      avg_session_seconds: game.sessions.length > 0 ? game.total_seconds / game.sessions.length : 0,
      completion_rate: game.sessions.length > 0 ? (game.completions / game.sessions.length) * 100 : 0,
      favorite_count: 0, // Would need separate query
      share_count: game.shares,
      abandonment_rate: game.sessions.length > 0
        ? ((game.sessions.length - game.completions) / game.sessions.length) * 100
        : 0,
      restart_rate: game.sessions.length > 0 ? game.restarts / game.sessions.length : 0,
      likability_score: 0,
      last_played: game.last_played,
    }));
  };

  const sortedMetrics = [...gameMetrics].sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return bVal - aVal;
    }
    return String(bVal).localeCompare(String(aVal));
  });

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-gray-400">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🎮 GameTok Analytics Dashboard</h1>
        <p className="text-gray-400">Internal metrics and game performance leaderboard</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2">
        {["1d", "7d", "30d", "all"].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded ${
              timeRange === range
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {range === "1d" ? "24 Hours" :
             range === "7d" ? "7 Days" :
             range === "30d" ? "30 Days" : "All Time"}
          </button>
        ))}
      </div>

      {/* Overall Stats Cards */}
      {overallStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Games" value={overallStats.total_games} />
          <StatCard label="Total Sessions" value={overallStats.total_sessions} />
          <StatCard label="Unique Players" value={overallStats.total_users} />
          <StatCard label="Avg Session" value={`${Math.round(overallStats.avg_session_length)}s`} />
          <StatCard label="Total Favorites" value={overallStats.total_favorites} />
          <StatCard label="Total Shares" value={overallStats.total_shares} />
        </div>
      )}

      {/* Game Metrics Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("title")}>
                  Game
                </th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("genre")}>
                  Genre
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("total_plays")}>
                  Plays
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("unique_players")}>
                  Players
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("avg_session_seconds")}>
                  Avg Time
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("completion_rate")}>
                  Complete %
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("share_count")}>
                  Shares
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("restart_rate")}>
                  Restarts
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600" onClick={() => setSortBy("likability_score")}>
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.map((game, index) => (
                <tr key={game.game_id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <span className={`font-bold ${index < 3 ? "text-yellow-400" : "text-gray-400"}`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{game.title}</div>
                      <div className="text-xs text-gray-400">
                        Last: {new Date(game.last_played).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm bg-gray-700 px-2 py-1 rounded">
                      {game.genre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{game.total_plays}</td>
                  <td className="px-4 py-3 text-right font-mono">{game.unique_players}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {Math.round(game.avg_session_seconds)}s
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${
                      game.completion_rate > 50 ? "text-green-400" :
                      game.completion_rate > 25 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {game.completion_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{game.share_count}</td>
                  <td className="px-4 py-3 text-right font-mono">{game.restart_rate.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-bold ${
                      game.likability_score > 0.7 ? "text-green-400" :
                      game.likability_score > 0.4 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {game.likability_score.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Data refreshes every minute. Likability scores update hourly.</p>
        <p>This dashboard is for internal use only.</p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="text-gray-400 text-sm mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}