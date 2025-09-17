// Host <-> Game bridge using window.postMessage.
// In production, set TARGET_ORIGIN to your feed origin.
const TARGET_ORIGIN = '*';

export const Host = {
  sessionId: 'dev',
  muted: true,
  width: 360,
  height: 640,
  initReceived: false,
};

export function post(evt) {
  const payload = { ts: Date.now(), ...evt };
  window.parent?.postMessage(payload, TARGET_ORIGIN);
}

export function setupHostListeners(onMessage) {
  window.addEventListener('message', (e) => {
    if (!e || !e.data || typeof e.data !== 'object') return;
    const msg = e.data;
    // You can restrict by origin here.
    onMessage(msg);
  });
}

export function sendInitRequest() {
  // Ask host for init (optional handshake)
  window.parent?.postMessage({ type: 'game:ready' }, TARGET_ORIGIN);
}
