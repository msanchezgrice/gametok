import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    pool: "vmThreads",
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir),
    },
  },
});
