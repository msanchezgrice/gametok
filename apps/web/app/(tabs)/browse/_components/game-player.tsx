"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameDefinition } from "@gametok/types";
import type { HostCommandType } from "@gametok/game-sdk";
import { useGameHostBridge } from "@gametok/game-shell";

export interface GamePlayerControls {
  restart: () => void;
  pause: () => void;
  resume: () => void;
  sendCommand: (type: HostCommandType) => void;
  ready: boolean;
}

interface GamePlayerProps {
  game: GameDefinition;
  sessionId: string;
  userId: string | null;
  onLifecycle?: (event: string, payload: unknown) => void;
  onMetrics?: (metrics: unknown) => void;
  onControlsChange?: (controls: GamePlayerControls | null) => void;
}

const IFRAME_CLASSNAMES = "h-full w-full border-0";

export function GamePlayer({
  game,
  sessionId,
  userId,
  onLifecycle,
  onMetrics,
  onControlsChange,
}: GamePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([]);
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";

  useEffect(() => {
    if (!game.assetBundleUrl) return;
    if (typeof window === "undefined") return;

    try {
      const url = new URL(game.assetBundleUrl, window.location.origin);
      setAllowedOrigins([url.origin]);
    } catch (error) {
      console.warn("Failed to derive allowed origin for game", error);
      setAllowedOrigins([]);
    }
  }, [game.assetBundleUrl]);

  const session = useMemo(
    () => ({
      id: sessionId,
      userId,
      source: "feed" as const,
    }),
    [sessionId, userId],
  );

  const { ready, restart, pause, resume, sendCommand } = useGameHostBridge({
    iframeRef,
    game,
    session,
    config: {
      allowedOrigins,
      analyticsEnabled: true,
      locale,
    },
    onLifecycle,
    onMetrics,
  });

  useEffect(() => {
    onControlsChange?.({
      restart,
      pause,
      resume,
      sendCommand,
      ready,
    });
    return () => {
      onControlsChange?.(null);
    };
  }, [onControlsChange, pause, ready, restart, resume, sendCommand]);

  return (
    <iframe
      ref={iframeRef}
      src={game.assetBundleUrl}
      title={`${game.title} iframe`}
      className={IFRAME_CLASSNAMES}
      allow="accelerometer; gyroscope; fullscreen"
      allowFullScreen
    />
  );
}
