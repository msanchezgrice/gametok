# Game SDK Contract

Mini-games run inside an iframe and communicate with the host shell via `postMessage`. The shared package `@gametok/game-sdk` defines:

## Host → Game Lifecycle
- `INIT`: Sent immediately after iframe load with game definition, session, locale, feature flags, and analytics opt-in.
- `HOST_READY`: Optional acknowledgement that the shell is ready to receive events.
- `REQUEST_RESTART` / `REQUEST_PAUSE` / `REQUEST_RESUME`: Shell-level controls triggered by UI buttons.
- `REQUEST_MUTED` / `REQUEST_UNMUTED`: Audio toggles for consistent UX.
- `HOST_UNMOUNT`: Sent before the iframe is destroyed so the game can dispose resources.

## Game → Host Messages
- Lifecycle events (`READY`, `START`, `PAUSE`, `RESUME`, `COMPLETE`, `FAIL`, `RESET`) include timestamps and optional metrics.
- `METRIC`: Arbitrary structured metrics (e.g., `{ name: "waves_completed", value: 4 }`). The shell batches and forwards to analytics.

All payloads are typed in `packages/game-sdk/src/index.ts`. Games should leverage the SDK helper to:

```ts
import { GameBridge } from "@gametok/game-sdk";

const bridge = new GameBridge({
  allowedOrigins: ["https://gametok.app"],
});

bridge.on("REQUEST_RESTART", () => restartGame());
bridge.on("HOST_UNMOUNT", () => dispose());
```

## Host Utilities
`@gametok/game-shell` exposes `useGameHostBridge` which wires hooks up to React components:

```ts
const iframeRef = useRef<HTMLIFrameElement>(null);
const { ready, restart } = useGameHostBridge({
  iframeRef,
  game,
  session,
  config: {
    allowedOrigins: [game.assetBundleUrlOrigin],
    analyticsEnabled,
    locale,
  },
  onLifecycle: (event, payload) => telemetry.capture(event, payload),
});
```

Games must ship a manifest describing supported controls, estimated length, and runtime version. See `packages/types/src/index.ts` for the canonical schema.
