"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { GameDefinition } from "@gametok/types";
import { useOptionalSupabaseBrowser } from "@/app/providers";

interface GameFeedProps {
  initialGames: GameDefinition[];
}

export function GameFeed({ initialGames }: GameFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sessionMap, setSessionMap] = useState<Record<string, string>>({});
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const supabase = useOptionalSupabaseBrowser();

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
    ) => {
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
      if (!supabase) return;
      const sessionId = crypto.randomUUID();
      setPendingGameId(game.id);
      await sendTelemetry(game, sessionId, "game_start");
      setSessionMap((prev) => ({ ...prev, [game.id]: sessionId }));
      setPendingGameId(null);
    },
    [sendTelemetry, supabase],
  );

  const handleRestart = useCallback(
    async (game: GameDefinition) => {
      if (!supabase) return;
      const existingSessionId = sessionMap[game.id] ?? crypto.randomUUID();
      setSessionMap((prev) => ({ ...prev, [game.id]: existingSessionId }));
      await sendTelemetry(game, existingSessionId, "game_restart", { restarts: 1 });
    },
    [sendTelemetry, sessionMap, supabase],
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

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== activeIndex) {
      setActiveIndex(Math.min(initialGames.length - 1, Math.max(0, newIndex)));
    }
  };

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
      >
        {initialGames.map((game, index) => (
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
                  <span className="text-center text-sm text-white/70">
                    Game canvas loads here
                    <br />
                    <span className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
                      {game.playInstructions}
                    </span>
                  </span>
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
                    {pendingGameId === game.id ? "Loading" : "Play"}
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
                    {index + 1} / {initialGames.length}
                  </span>
                  <button type="button" className="rounded-full border border-white/10 px-4 py-2 uppercase tracking-[0.2em]">
                    Favorite
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
        ))}
      </div>
    </div>
  );
}
