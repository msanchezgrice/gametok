// Simple PRNG
export function rnd(min, max) { return Math.random() * (max - min) + min; }
export function irnd(min, max) { return Math.floor(rnd(min, max)); }

// Swipe detector (one-finger)
export function installSwipe(scene, handlers) {
  let startX=0, startY=0, startT=0;
  scene.input.on('pointerdown', (p) => { startX = p.x; startY = p.y; startT = performance.now(); });
  scene.input.on('pointerup', (p) => {
    const dx = p.x - startX; const dy = p.y - startY; const dt = performance.now() - startT;
    const THRESH = 30; // pixels
    if (dt > 700) return; // long press (ignore)
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > THRESH) handlers.onRight?.();
      else if (dx < -THRESH) handlers.onLeft?.();
    } else {
      if (dy < -THRESH) handlers.onUp?.();
      else if (dy > THRESH) handlers.onDown?.();
    }
  });
}
