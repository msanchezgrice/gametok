import { Host, post, setupHostListeners, sendInitRequest } from './hostBridge.js';
import { GameScene } from './scenes/GameScene.js';
import { HudScene } from './scenes/HudScene.js';

export function bootstrap() {
  const startBtn = document.getElementById('startBtn');

  setupHostListeners((msg) => {
    switch (msg.type) {
      case 'host:init':
        Host.sessionId = msg.sessionId || Host.sessionId;
        Host.muted = !!msg.muted;
        Host.width = msg.width || Host.width;
        Host.height = msg.height || Host.height;
        Host.initReceived = true;
        resize(msg.width, msg.height);
        break;
      case 'host:pause':
        window.__PHASER__?.scene?.pause('Game');
        break;
      case 'host:resume':
        window.__PHASER__?.scene?.resume('Game');
        break;
      case 'host:mute':
        Host.muted = true;
        break;
      case 'host:unmute':
        Host.muted = false;
        break;
      case 'host:end':
        // End gracefully
        const scene = window.__PHASER__?.scene?.getScene('Game');
        scene?.endRun('quit');
        break;
    }
  });

  // Visibility pause fallback
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.__PHASER__?.scene?.pause('Game');
  });

  // Phaser bootstrap
  const config = {
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: '#0e0e10',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: Host.width, height: Host.height },
    physics: { default: 'arcade', arcade: { debug: false } },
    fps: { target: 60, min: 30 },
    scene: [GameScene, HudScene],
  };
  const game = new Phaser.Game(config);
  window.__PHASER__ = game;

  // UI: "Tap to Start" must be user gesture for audio unlock (iOS)
  startBtn?.addEventListener('click', () => {
    document.querySelector('.overlay')?.remove();
    post({ type: 'game:loaded', gameId: 'runner-skyline', sessionId: Host.sessionId });
    game.scene.start('Game');
    post({ type: 'game:start', gameId: 'runner-skyline', sessionId: Host.sessionId });
  }, { once: true });

  // Ask host for init (so it can send viewport/mute/session)
  sendInitRequest();

  // Handle initial resize
  function resize(w, h) {
    const canvas = game.canvas;
    if (canvas) {
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
  }
}
