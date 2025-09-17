"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createHostCommand, createHostInitMessage, GameBridge } from "@gametok/game-sdk";
import type {
  GameDefinition,
  GameSession,
  GameGenre,
  LikabilityScore,
} from "@gametok/types";

export interface GameHostConfig {
  allowedOrigins: string[];
  analyticsEnabled: boolean;
  locale: string;
  featureFlags?: Record<string, boolean>;
}

export interface UseGameHostBridgeOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  game: GameDefinition;
  session: Pick<GameSession, "id" | "userId" | "source">;
  config: GameHostConfig;
  onLifecycle?: (event: string, payload: unknown) => void;
  onMetrics?: (metrics: unknown) => void;
}

export interface LikabilityContextValue {
  scoresByGenre: Partial<Record<GameGenre, LikabilityScore>>;
  globalScore: LikabilityScore | null;
}

export const useGameHostBridge = ({
  iframeRef,
  game,
  session,
  config,
  onLifecycle,
  onMetrics,
}: UseGameHostBridgeOptions) => {
  const bridgeRef = useRef<GameBridge | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const initMessage = useMemo(
    () =>
      createHostInitMessage({
        definition: {
          id: game.id,
          title: game.title,
          genre: game.genre,
          runtimeVersion: game.runtimeVersion,
          estimatedDurationSeconds: game.estimatedDurationSeconds,
        },
        session,
        locale: config.locale,
        featureFlags: config.featureFlags ?? {},
        analyticsEnabled: config.analyticsEnabled,
      }),
    [config.analyticsEnabled, config.featureFlags, config.locale, game, session],
  );

  useEffect(() => {
    if (!iframeRef.current) return;
    const targetWindow = iframeRef.current.contentWindow;
    if (!targetWindow) return;

    const bridge = new GameBridge({
      targetWindow,
      allowedOrigins: config.allowedOrigins,
    });

    bridgeRef.current = bridge;

    const offLifecycle = bridge.on("READY", (message) => {
      setReady(true);
      onLifecycle?.(message.type, message);
    });

    const offMetric = bridge.on("METRIC", (message) => {
      onMetrics?.(message);
    });

    bridge.emit(initMessage);

    return () => {
      offLifecycle?.();
      offMetric?.();
      bridge.destroy();
      setReady(false);
    };
  }, [config.allowedOrigins, iframeRef, initMessage, onLifecycle, onMetrics]);

  const sendCommand = useCallback((type: Parameters<typeof createHostCommand>[0]) => {
    if (!bridgeRef.current) return;
    bridgeRef.current.emit(createHostCommand(type));
  }, []);

  return {
    ready,
    sendCommand,
    restart: () => sendCommand("REQUEST_RESTART"),
    pause: () => sendCommand("REQUEST_PAUSE"),
    resume: () => sendCommand("REQUEST_RESUME"),
  } as const;
};

export const useLikabilityHighlight = (
  context: LikabilityContextValue | null,
  genre: GameGenre,
) => {
  return useMemo(() => {
    if (!context) return { global: null, genre: null };
    return {
      global: context.globalScore,
      genre: context.scoresByGenre[genre] ?? null,
    };
  }, [context, genre]);
};
