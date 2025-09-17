"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { GameDefinition } from "@gametok/types";
import { useOptionalSupabaseBrowser } from "@/app/providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mapGameRowToDefinition } from "@/lib/games";
import posthog from "posthog-js";
import { fetchFavoriteGames, toggleFavorite } from "@/lib/favorites";
import { GamePlayer, GamePlayerControls } from "./game-player";

interface GameFeedProps {
  initialGames: GameDefinition[];
}

export function GameFeed({ initialGames }: GameFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sessionMap, setSessionMap] = useState<Record<string, string>>({});
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const supabase = useOptionalSupabaseBrowser();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const controlsRef = useRef<Record<string, GamePlayerControls | null>>({});
  const pendingCommandRef = useRef<{ gameId: string; command: "restart" } | null>(null);
  const previousActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setUserId(null);
      setFavoriteIds(new Set());
      return;
    }

    let isMounted = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!isMounted) return;
        setUserId(data?.user?.id ?? null);
      })
      .catch(() => {
        if (isMounted) setUserId(null);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const { data: remoteGames, isLoading } = useQuery({
    queryKey: ["games", "feed"],
    queryFn: async () => {
      if (!supabase) {
        return initialGames;
      }
      const { data, error } = await supabase
        .from("games")
        .select(
          "id, slug, title, short_description, genre, play_instructions, estimated_duration_seconds, asset_bundle_url, thumbnail_url, tags, status, runtime_version, created_at, updated_at",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("Failed to load games", error);
        return initialGames;
      }

      if (!data) return initialGames;
      return data.map(mapGameRowToDefinition);
    },
    initialData: initialGames,
    staleTime: 30_000,
  });

  const games = remoteGames ?? initialGames;

  const handleControlsChange = useCallback(
    (gameId: string, controls: GamePlayerControls | null) => {
      console.log("[GameFeed] Controls change for game:", gameId, "ready:", controls?.ready);
      if (!controls) {
        delete controlsRef.current[gameId];
        if (pendingCommandRef.current?.gameId === gameId) {
          pendingCommandRef.current = null;
        }
        return;
      }

      controlsRef.current[gameId] = controls;
      if (controls.ready && pendingCommandRef.current?.gameId === gameId) {
        console.log("[GameFeed] Game ready, sending restart command");
        controls.restart();
        pendingCommandRef.current = null;
      }
    },
    [],
  );

  const { data: favoriteGames } = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      if (!supabase || !userId) return [] as GameDefinition[];
      return fetchFavoriteGames(supabase, userId);
    },
    enabled: Boolean(supabase && userId),
  });

  useEffect(() => {
    const ids = new Set((favoriteGames ?? []).map((game) => game.id));
    setFavoriteIds(ids);
  }, [favoriteGames]);

  const deviceInfo = useMemo(() => {
    if (typeof navigator === "undefined") {
      return {} as Record<string, unknown>;
    }
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
    } satisfies Record<string, unknown>;
  }, []);

  const sendTelemetry = useCallback(
    async (
      game: GameDefinition,
      sessionId: string,
      eventType: string,
      overrides: Partial<{
        completed: boolean;
        total_seconds: number | null;
        ended_at: string | null;
        restarts: number;
        shares: number;
      }> = {},
      properties: Record<string, unknown> = {},
    ) => {
      const eventPayload = {
        session_id: sessionId,
        game_id: game.id,
        genre: game.genre,
        source: "feed",
        ...overrides,
        ...properties,
      } satisfies Record<string, unknown>;

      if (posthog.isFeatureEnabled?.("capture_feed_events") ?? true) {
        posthog.capture(eventType, eventPayload);
      }

      if (!supabase) return;
      try {
        await supabase.functions.invoke("track-session", {
          body: {
            session: {
              id: sessionId,
              game_id: game.id,
              source: "feed",
              started_at: new Date().toISOString(),
              completed: overrides.completed ?? false,
              total_seconds: overrides.total_seconds ?? null,
              ended_at: overrides.ended_at ?? null,
              restarts: overrides.restarts ?? 0,
              shares: overrides.shares ?? 0,
              device_info: deviceInfo,
            },
            events: [
              {
                event_type: eventType,
                payload: {
                  game_id: game.id,
                  event_source: "feed",
                  ...properties,
                },
              },
            ],
          },
        });
      } catch (error) {
        console.warn("Telemetry dispatch failed", error);
      }
    },
    [deviceInfo, supabase],
  );

  const handleStart = useCallback(
    async (game: GameDefinition) => {
      console.log("[GameFeed] Starting game:", game.id, game.title);
      const sessionId = crypto.randomUUID();
      console.log("[GameFeed] Generated session ID:", sessionId);
      setPendingGameId(game.id);
      setSessionMap((prev) => ({ ...prev, [game.id]: sessionId }));
      setActiveGameId(game.id);
      pendingCommandRef.current = { gameId: game.id, command: "restart" };

      try {
        console.log("[GameFeed] Sending telemetry for game_start");
        await sendTelemetry(game, sessionId, "game_start");
      } catch (error) {
        console.error("[GameFeed] Failed to send telemetry:", error);
      } finally {
        setPendingGameId(null);
      }
    },
    [sendTelemetry],
  );

  const handleRestart = useCallback(
    async (game: GameDefinition) => {
      const existingSessionId = sessionMap[game.id] ?? crypto.randomUUID();
      setSessionMap((prev) => ({ ...prev, [game.id]: existingSessionId }));
      setActiveGameId(game.id);
      pendingCommandRef.current = { gameId: game.id, command: "restart" };
      await sendTelemetry(game, existingSessionId, "game_restart", { restarts: 1 });

      const controls = controlsRef.current[game.id];
      if (controls?.ready) {
        controls.restart();
        pendingCommandRef.current = null;
      }
    },
    [sendTelemetry, sessionMap],
  );

  const handleShare = useCallback(
    async (game: GameDefinition) => {
      if (!supabase) return;
      const sessionId = sessionMap[game.id] ?? crypto.randomUUID();
      await sendTelemetry(game, sessionId, "game_share", { shares: 1 });

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: game.title,
            text: game.shortDescription,
            url: window.location.href,
          });
        } catch (error) {
          console.warn("Share dismissed", error);
        }
      }
    },
    [sendTelemetry, sessionMap, supabase],
  );

  // Load favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem("gametok_favorites");
    if (storedFavorites) {
      try {
        const ids = JSON.parse(storedFavorites) as string[];
        setFavoriteIds(new Set(ids));
        console.log("[GameFeed] Loaded favorites from localStorage:", ids);
      } catch (error) {
        console.error("[GameFeed] Failed to parse stored favorites:", error);
      }
    }
  }, []);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ game, isFavorite }: { game: GameDefinition; isFavorite: boolean }) => {
      // Store in localStorage for persistence without auth
      const currentFavorites = Array.from(favoriteIds);
      const newFavorites = isFavorite
        ? currentFavorites.filter(id => id !== game.id)
        : [...new Set([...currentFavorites, game.id])]; // Use Set to prevent duplicates

      localStorage.setItem("gametok_favorites", JSON.stringify(newFavorites));
      console.log("[GameFeed] Saved favorites to localStorage:", newFavorites);

      // If we have Supabase and userId, also sync to server
      if (supabase && userId) {
        try {
          return await toggleFavorite(supabase, userId, game.id, isFavorite);
        } catch (error) {
          console.error("[GameFeed] Failed to sync favorite to server:", error);
        }
      }

      return { removed: isFavorite };
    },
    onMutate: async ({ game, isFavorite }) => {
      const previous = new Set(favoriteIds);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFavorite) {
          next.delete(game.id);
        } else {
          next.add(game.id);
        }
        return next;
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      console.error("[GameFeed] Favorite mutation error:", _error);
      if (context?.previous) {
        setFavoriteIds(context.previous);
      }
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
      }
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
      }
    },
  });

  const handleFavorite = useCallback(
    async (game: GameDefinition) => {
      // Allow favorites without authentication - use localStorage
      console.log("[GameFeed] Toggling favorite for game:", game.id);
      const currentlyFavorite = favoriteIds.has(game.id);

      try {
        await toggleFavoriteMutation.mutateAsync({ game, isFavorite: currentlyFavorite });

        const sessionId = sessionMap[game.id] ?? crypto.randomUUID();
        setSessionMap((prev) => ({ ...prev, [game.id]: sessionId }));
        await sendTelemetry(game, sessionId, "favorite_toggle", {}, { is_favorite: !currentlyFavorite });
      } catch (error) {
        console.warn("[GameFeed] Favorite toggle failed", error);
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
        }
      }
    },
    [favoriteIds, queryClient, sendTelemetry, sessionMap, toggleFavoriteMutation, userId],
  );

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== activeIndex) {
      setActiveIndex(Math.min(initialGames.length - 1, Math.max(0, newIndex)));
    }
  };

  useEffect(() => {
    if (!activeGameId) return;
    if (previousActiveIdRef.current && previousActiveIdRef.current !== activeGameId) {
      const previousControls = controlsRef.current[previousActiveIdRef.current];
      if (previousControls?.ready) {
        previousControls.pause();
      }
    }
    previousActiveIdRef.current = activeGameId;
  }, [activeGameId]);

  useEffect(() => {
    if (!activeGameId) return;
    const controls = controlsRef.current[activeGameId];
    if (!controls?.ready) return;
    const activeCardIndex = games.findIndex((game) => game.id === activeGameId);
    if (activeCardIndex === -1) return;
    if (activeCardIndex !== activeIndex) {
      controls.pause();
    } else {
      controls.resume();
    }
  }, [activeGameId, activeIndex, games]);

  if (!isLoading && games.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-white/70">
        No games are published yet. Add entries in Supabase `games` or run the seed script to populate
        the feed.
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-sm uppercase tracking-[0.3em] text-white/70">
          Loading feed…
        </div>
      )}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
      >
        {games.map((game, index) => {
          const isActive = activeGameId === game.id;
          const sessionId = sessionMap[game.id];
          return (
            <article
              key={game.id}
              className="relative flex h-[100dvh] snap-start flex-col items-center justify-center bg-[color:var(--surface)]"
            >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
            <div className="relative flex h-full w-full flex-col items-center justify-between px-5 py-6">
              <header className="w-full text-left">
                <p className="text-[0.75rem] uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  {game.genre.replace("_", " ")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold">{game.title}</h1>
                <p className="mt-1 text-sm text-white/80">{game.shortDescription}</p>
              </header>

              <div className="relative flex w-full flex-1 items-center justify-center">
                <div className="flex h-[70%] w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-lg">
                  {isActive && sessionId ? (
                    <div className="relative h-full w-full">
                      <GamePlayer
                        game={game}
                        sessionId={sessionId}
                        userId={userId}
                        onControlsChange={(controls) => handleControlsChange(game.id, controls)}
                      />
                      {/* Overlay with tap to start - temporary placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                        <button
                          onClick={() => {
                            console.log("[GameFeed] Tap to start clicked");
                            const controls = controlsRef.current[game.id];
                            if (controls?.ready) {
                              controls.restart();
                            }
                          }}
                          className="rounded-full bg-white/10 px-8 py-4 text-white hover:bg-white/20 transition-colors"
                        >
                          Tap to Start Game
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-center text-sm text-white/70">
                      Game canvas loads here
                      <br />
                      <span className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
                        {game.playInstructions}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <footer className="flex w-full flex-col gap-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => handleRestart(game)}
                    className="rounded-full border border-white/20 bg-white/10 py-3 font-medium text-white transition active:scale-95"
                    disabled={pendingGameId === game.id}
                  >
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStart(game)}
                    className="rounded-full border border-white/20 bg-[color:var(--accent)] py-3 font-semibold text-white transition active:scale-95 disabled:opacity-60"
                    disabled={pendingGameId === game.id}
                  >
                    {pendingGameId === game.id ? "Loading" : isActive ? "Playing" : "Play"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(game)}
                    className="rounded-full border border-white/20 bg-white/10 py-3 font-medium text-white transition active:scale-95"
                  >
                    Share
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>
                    {index + 1} / {games.length || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFavorite(game)}
                    className={clsx(
                      "rounded-full border px-4 py-2 uppercase tracking-[0.2em] transition",
                      favoriteIds.has(game.id)
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                        : "border-white/10 text-white/80",
                    )}
                    disabled={toggleFavoriteMutation.isPending}
                  >
                    {favoriteIds.has(game.id) ? "Favorited" : "Favorite"}
                  </button>
                </div>
              </footer>
            </div>

            <div
              className={clsx(
                "absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em]",
                index === activeIndex ? "bg-[color:var(--accent)] text-white" : "bg-black/30 text-white/60",
              )}
            >
              {index === activeIndex ? "Now Playing" : "Queued"}
            </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
