import type { GameDefinition, GameSession, SessionMetric } from "@gametok/types";

type Listener<T> = (payload: T) => void;

export type GameLifecycleEvent =
  | "INIT"
  | "READY"
  | "START"
  | "PAUSE"
  | "RESUME"
  | "COMPLETE"
  | "FAIL"
  | "RESET";

export interface GameInitPayload {
  definition: Pick<
    GameDefinition,
    "id" | "title" | "genre" | "runtimeVersion" | "estimatedDurationSeconds"
  >;
  session: Pick<GameSession, "id" | "userId" | "source">;
  locale: string;
  featureFlags: Record<string, boolean>;
  analyticsEnabled: boolean;
}

export interface GameLifecycleMessage {
  type: GameLifecycleEvent;
  timestamp: string;
  metrics?: SessionMetric[];
  additionalData?: Record<string, unknown>;
}

export interface MetricRecord {
  name: string;
  value: number;
  context?: Record<string, unknown>;
}

export interface GameMetricMessage {
  type: "METRIC";
  timestamp: string;
  metrics: MetricRecord[];
}

export type GameClientMessage = GameLifecycleMessage | GameMetricMessage;

export type HostCommandType =
  | "HOST_READY"
  | "HOST_UNMOUNT"
  | "REQUEST_RESTART"
  | "REQUEST_PAUSE"
  | "REQUEST_RESUME"
  | "REQUEST_MUTED"
  | "REQUEST_UNMUTED";

export interface HostCommandMessage {
  type: HostCommandType;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export type GameHostMessage = HostCommandMessage | { type: "INIT"; payload: GameInitPayload };

export interface GameBridgeConfig {
  targetWindow?: Window;
  allowedOrigins: string[];
}

export class GameBridge {
  #targetWindow: Window;
  #allowedOrigins: Set<string>;
  #listeners: Map<string, Set<Listener<GameClientMessage>>>;
  #handleMessage = (event: MessageEvent<GameClientMessage>) => {
    if (this.#allowedOrigins.size > 0 && !this.#allowedOrigins.has(event.origin)) {
      return;
    }

    const message = event.data;
    if (!message || typeof message !== "object" || !("type" in message)) {
      return;
    }

    const listeners = this.#listeners.get(message.type as string);
    listeners?.forEach((listener) => listener(message));
  };

  constructor({ targetWindow = window.parent, allowedOrigins }: GameBridgeConfig) {
    this.#targetWindow = targetWindow;
    this.#allowedOrigins = new Set(allowedOrigins);
    this.#listeners = new Map();
    window.addEventListener("message", this.#handleMessage);
  }

  destroy() {
    window.removeEventListener("message", this.#handleMessage);
    this.#listeners.clear();
  }

  on(event: GameLifecycleEvent | "METRIC", listener: Listener<GameClientMessage>) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: GameLifecycleEvent | "METRIC", listener: Listener<GameClientMessage>) {
    this.#listeners.get(event)?.delete(listener);
  }

  emit(message: GameHostMessage) {
    this.#targetWindow.postMessage(message, "*");
  }

}

export const createHostInitMessage = (
  payload: GameInitPayload,
): GameHostMessage => ({
  type: "INIT",
  payload,
});

export const createHostCommand = (
  type: HostCommandType,
  payload: Record<string, unknown> = {},
): HostCommandMessage => ({
  type,
  payload,
  timestamp: new Date().toISOString(),
});
