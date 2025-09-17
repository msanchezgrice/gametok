import { Host, postLifecycle, setupHostListeners } from "./hostBridge.js";
import { GameScene } from "./scenes/GameScene.js";
import { HudScene } from "./scenes/HudScene.js";

export function bootstrap() {
  const startBtn = document.getElementById("startBtn");

  setupHostListeners((msg) => {
    switch (msg.type) {
      case "INIT": {
        const payload = msg.payload ?? {};
        const session = payload.session ?? {};
        Host.sessionId = session.id || Host.sessionId;
        Host.initReceived = true;
        resize(msg.payload?.viewport?.width ?? Host.width, msg.payload?.viewport?.height ?? Host.height);
        postLifecycle("READY", {
          gameId: "runner-skyline",
          sessionId: Host.sessionId,
        });
        break;
      }
      case "REQUEST_PAUSE":
        window.__PHASER__?.scene?.pause("Game");
        postLifecycle("PAUSE", { gameId: "runner-skyline", sessionId: Host.sessionId });
        break;
      case "REQUEST_RESUME":
        window.__PHASER__?.scene?.resume("Game");
        postLifecycle("RESUME", { gameId: "runner-skyline", sessionId: Host.sessionId });
        break;
      case "REQUEST_RESTART":
        window.__PHASER__?.scene?.restart("Game");
        break;
      case "REQUEST_MUTED":
        Host.muted = true;
        break;
      case "REQUEST_UNMUTED":
        Host.muted = false;
        break;
      case "HOST_UNMOUNT":
        postLifecycle("RESET", { reason: "host_unmount", gameId: "runner-skyline" });
        window.__PHASER__?.destroy(true);
        break;
      default:
        break;
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.__PHASER__?.scene?.pause("Game");
      postLifecycle("PAUSE", { gameId: "runner-skyline", sessionId: Host.sessionId, reason: "hidden" });
    }
  });

  const config = {
    type: Phaser.AUTO,
    parent: "game-root",
    backgroundColor: "#0e0e10",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: Host.width,
      height: Host.height,
    },
    physics: { default: "arcade", arcade: { debug: false } },
    fps: { target: 60, min: 30 },
    scene: [GameScene, HudScene],
  };
  const game = new Phaser.Game(config);
  window.__PHASER__ = game;

  startBtn?.addEventListener(
    "click",
    () => {
      document.querySelector(".overlay")?.remove();
      postLifecycle("START", {
        gameId: "runner-skyline",
        sessionId: Host.sessionId,
      });
      game.scene.start("Game");
    },
    { once: true },
  );

  function resize(width, height) {
    const canvas = game.canvas;
    if (!canvas) return;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
}
