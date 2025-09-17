# Runner: Skyline Sprint (Phaser 3, mobile web)

A high‑fidelity 3‑lane runner designed for a TikTok‑style feed. Built as a **standalone HTML5 bundle** that communicates with the host via `window.postMessage` and the following event names:

**Host → Game**
- `host:init` `{ sessionId, width, height, muted }`
- `host:pause` / `host:resume` / `host:mute` / `host:unmute` / `host:end`

**Game → Host**
- `game:ready` (sent by game to request init)
- `game:loaded`
- `game:start`
- `game:progress` `{ seconds }` every ~5s
- `game:end` `{ reason: 'success' | 'fail' | 'quit', seconds, distance_m }`
- `ui:like` / `ui:save` / `ui:share` / `ui:replay` (not emitted by default; wire to HUD buttons if desired)

## Controls (one‑thumb)

- **Swipe left/right**: change lane
- **Swipe up**: jump
- **Swipe down**: slide
- The first tap on the **Tap to Start** overlay unlocks audio (iOS policy) and begins play.

## Gameplay

- Continuous forward scroll with **speed ramp**.
- Obstacles (red blocks), coins (gold), and two power‑ups:
  - **Magnet**: attracts nearby coins (5s)
  - **Shield**: negates one obstacle (5s)
- **HUD** shows distance (m) and coins.
- **Progress pings** every 5s, and a `game:end` event on fail/quit.

## Integration with `gametok`

1. **Upload** this folder to your CDN (or Supabase Storage) so that `index.html` is publicly accessible.
2. **Create a game variant** in Supabase (e.g., via seed script) with the `bundleUrl` pointing to your hosted `index.html`, plus `previewVideo` and `poster` assets.
3. Ensure your host feed (Next.js) sends `host:init` to the iframe with `{ sessionId, width, height, muted }`, and forwards telemetry to analytics.

> This bundle is framework‑free (no Vite/Parcel needed). You can customize visuals by replacing the primitive shapes with spritesheets and shaders.

## Local dev

Just open `index.html` with a static server (so the module imports resolve). For example:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Notes

- The game pauses on `document.visibilitychange` as a fallback, in addition to `host:pause`.
- All rendering is vector/shape based to keep the first play light. Swap in art as you wish.
