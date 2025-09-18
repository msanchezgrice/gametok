"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { GameDefinition } from "@gametok/types";
import { useOptionalSupabaseBrowser } from "@/app/providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mapGameRowToDefinition } from "@/lib/games";
import posthog from "posthog-js";
import { toggleFavorite } from "@/lib/favorites";
import { GamePlayer, GamePlayerControls } from "./game-player";
import { cn } from "@/lib/utils";

interface GameFeedProps {
  initialGames: GameDefinition[];
}

export function GameFeed({ initialGames }: GameFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sessionMap, setSessionMap] = useState<Record<string, string>>({});
  const [, setPendingGameId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const supabase = useOptionalSupabaseBrowser();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const controlsRef = useRef<Record<string, GamePlayerControls | null>>({});
  const pendingCommandRef = useRef<{ gameId: string; command: "restart" } | null>(null);
  const previousActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setUserId(null);
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

  // Handle URL hash navigation to specific game
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && games.length > 0) {
        const gameIndex = games.findIndex(g => g.slug === hash);
        if (gameIndex !== -1 && containerRef.current) {
          const container = containerRef.current;
          const targetScroll = gameIndex * container.clientHeight;
          container.scrollTo({ top: targetScroll, behavior: 'smooth' });
          setActiveIndex(gameIndex);
        }
      }
    };

    // Check hash on mount and when games load
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [games]);

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

  // Load favorites and saved from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem("clipcade_favorites");
    if (storedFavorites) {
      try {
        const ids = JSON.parse(storedFavorites) as string[];
        setFavoriteIds(new Set(ids));
        console.log("[GameFeed] Loaded favorites from localStorage:", ids);
      } catch (error) {
        console.error("[GameFeed] Failed to parse stored favorites:", error);
      }
    }

    const storedSaved = localStorage.getItem("clipcade_saved");
    if (storedSaved) {
      try {
        const ids = JSON.parse(storedSaved) as string[];
        setSavedIds(new Set(ids));
        console.log("[GameFeed] Loaded saved from localStorage:", ids);
      } catch (error) {
        console.error("[GameFeed] Failed to parse stored saved:", error);
      }
    }
  }, []);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ game, isFavorite }: { game: GameDefinition; isFavorite: boolean }) => {
      // Store in localStorage for persistence without auth
      const currentFavorites = Array.from(favoriteIds);
      const newFavorites = isFavorite
        ? currentFavorites.filter(id => id !== game.id)
        : [...new Set([...currentFavorites, game.id])];

      localStorage.setItem("clipcade_favorites", JSON.stringify(newFavorites));
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

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== activeIndex) {
      setActiveIndex(Math.min(games.length - 1, Math.max(0, newIndex)));
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

  if (!isLoading && games.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-white/70">
        No games are published yet. Add entries in Supabase `games` or run the seed script to populate
        the feed.
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black">
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
          const isActive = index === activeIndex;
          const isFavorite = favoriteIds.has(game.id);
          const isSaved = savedIds.has(game.id);
          const sessionId = sessionMap[game.id];

          const toggleFavorite = async () => {
            console.log("[GameFeed] Toggling favorite for game:", game.id);
            try {
              await toggleFavoriteMutation.mutateAsync({ game, isFavorite });
              const sid = sessionId ?? crypto.randomUUID();
              setSessionMap((prev) => ({ ...prev, [game.id]: sid }));
              await sendTelemetry(game, sid, "favorite_toggle", {}, { is_favorite: !isFavorite });
            } catch (error) {
              console.warn("[GameFeed] Favorite toggle failed", error);
            }
          };

          return (
            <div
              key={game.id}
              className="relative flex h-[100dvh] w-full snap-start"
            >
              {/* Game Canvas Background */}
              <div className="absolute inset-0">
                {isActive && activeGameId === game.id && sessionId ? (
                  <GamePlayer
                    game={game}
                    sessionId={sessionId}
                    userId={userId}
                    onControlsChange={(controls) => handleControlsChange(game.id, controls)}
                  />
                ) : game.thumbnailUrl ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${game.thumbnailUrl})` }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                ) : (
                  <div className="h-full w-full bg-gradient-to-b from-gray-900 to-black" />
                )}
              </div>

              {/* Overlay gradient - only show when game is not active */}
              {(!isActive || activeGameId !== game.id) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              )}

              {/* Content - make it non-blocking when game is active */}
              <div className={cn(
                "relative flex h-full w-full flex-col justify-end p-4",
                isActive && activeGameId === game.id ? "pointer-events-none z-10" : "z-10"
              )}>
                {/* Game Info - hide when playing */}
                {(!isActive || activeGameId !== game.id) && (
                  <div className="mb-20 max-w-[80%] pointer-events-none">
                    <h2 className="mb-2 text-3xl font-bold text-white drop-shadow-lg">
                      {game.title}
                    </h2>
                    <p className="text-base text-white/90 drop-shadow-md line-clamp-2">
                      {game.shortDescription}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-sm text-white/70">@{game.genre || 'arcade'}</span>
                      {game.tags && game.tags.length > 0 && (
                        <div className="flex gap-2">
                          {game.tags.slice(0, 2).map((tag) => (
                            <Link
                              key={tag}
                              href={`/search?tag=${encodeURIComponent(tag)}`}
                              className="rounded-full bg-white/20 px-2 py-1 text-xs text-white/90 backdrop-blur-sm pointer-events-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              #{tag}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    {game.playInstructions && (
                      <p className="mt-2 text-sm text-white/70">
                        💡 {game.playInstructions}
                      </p>
                    )}
                  </div>
                )}

                {/* Playing indicator */}
                {isActive && activeGameId === game.id && (
                  <div className="absolute top-4 left-4 pointer-events-none">
                    <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      <span className="text-sm text-white">Playing</span>
                    </div>
                  </div>
                )}

                {/* Right Side Actions - fade when game is active */}
                <div className={cn(
                  "absolute bottom-24 right-4 flex flex-col gap-5 transition-opacity duration-300",
                  "pointer-events-auto z-20",
                  isActive && activeGameId === game.id ? "opacity-30 hover:opacity-100" : "opacity-100"
                )}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite();
                      }}
                      className="rounded-full bg-black/30 p-4 backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                    >
                      <svg
                        className={cn(
                          "h-8 w-8 transition-all",
                          isFavorite ? "fill-red-500 text-red-500" : "text-white fill-none stroke-current stroke-2"
                        )}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                    <span className="mt-1 text-xs font-semibold text-white">
                      Like
                    </span>
                  </div>


                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle saved state in localStorage and state
                        const newSavedIds = new Set(savedIds);
                        if (isSaved) {
                          newSavedIds.delete(game.id);
                        } else {
                          newSavedIds.add(game.id);
                        }
                        setSavedIds(newSavedIds);
                        localStorage.setItem('clipcade_saved', JSON.stringify(Array.from(newSavedIds)));
                      }}
                      className="rounded-full bg-black/30 p-4 backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                    >
                      <svg
                        className={cn(
                          "h-8 w-8 transition-all",
                          isSaved ? "fill-yellow-500 text-yellow-500" : "text-white fill-none stroke-current stroke-2"
                        )}
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                      </svg>
                    </button>
                    <span className="mt-1 text-xs font-semibold text-white">
                      {isSaved ? 'Saved' : 'Save'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (navigator.share) {
                          navigator.share({
                            title: `${game.title} - Clipcade`,
                            text: `${game.shortDescription || `Check out ${game.title}`}\n\nPlay it now on Clipcade! 🎮\n\n#${game.tags?.join(' #') || game.genre || 'gaming'}`,
                            url: `${window.location.origin}/browse#${game.slug}`,
                          });
                        }
                      }}
                      className="rounded-full bg-black/30 p-4 backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                    >
                      <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                    </button>
                    <span className="mt-1 text-xs font-semibold text-white">Share</span>
                  </div>
                </div>

                {/* Play Button Overlay - only show when not playing */}
                {(!isActive || activeGameId !== game.id) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => handleStart(game)}
                      className="rounded-full bg-white/10 p-8 backdrop-blur-md hover:bg-white/20 transition-colors"
                    >
                      <div className="h-0 w-0 border-y-[20px] border-l-[30px] border-y-transparent border-l-white ml-2" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}