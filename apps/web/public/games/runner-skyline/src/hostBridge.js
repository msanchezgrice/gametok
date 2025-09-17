// Host <-> Game bridge using window.postMessage aligned with GameTok SDK contract.
const TARGET_ORIGIN = "*";

export const Host = {
  sessionId: "dev",
  muted: true,
  width: 360,
  height: 640,
  initReceived: false,
};

const nowIso = () => new Date().toISOString();

export function postLifecycle(type, additionalData = {}) {
  window.parent?.postMessage(
    {
      type,
      timestamp: nowIso(),
      ...(additionalData && Object.keys(additionalData).length > 0
        ? { additionalData }
        : {}),
    },
    TARGET_ORIGIN,
  );
}

export function postMetrics(metrics = []) {
  if (!Array.isArray(metrics) || metrics.length === 0) return;
  window.parent?.postMessage(
    {
      type: "METRIC",
      timestamp: nowIso(),
      metrics: metrics.map((metric) => ({
        name: metric.name,
        value: metric.value,
        context: metric.context ?? {},
      })),
    },
    TARGET_ORIGIN,
  );
}

export function setupHostListeners(onMessage) {
  window.addEventListener("message", (event) => {
    const msg = event?.data;
    if (!msg || typeof msg !== "object" || !("type" in msg)) return;
    onMessage(msg);
  });
}
