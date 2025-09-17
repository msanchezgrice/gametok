"use client";

import React, { useRef, useState } from "react";
import clsx from "clsx";
import type { GameDefinition } from "@gametok/types";

interface GameFeedProps {
  initialGames: GameDefinition[];
}

export function GameFeed({ initialGames }: GameFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
                    className="rounded-full border border-white/20 bg-white/10 py-3 font-medium text-white transition active:scale-95"
                  >
                    Restart
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-[color:var(--accent)] py-3 font-semibold text-white transition active:scale-95"
                  >
                    Play
                  </button>
                  <button
                    type="button"
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
