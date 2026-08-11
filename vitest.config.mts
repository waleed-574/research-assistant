import { defineConfig } from "vitest/config";

/**
 * Unit tests for the app's pure logic: the conditional-form graph, the SSE frame
 * reader, Mastra's tool-chunk shape, and the markdown renderer.
 *
 * Deliberately node-only — no jsdom. Nothing here needs a DOM (the one component
 * under test renders to a string via react-dom/server), and the agent behaviour
 * these modules serve can only be verified against the live API, which is out of
 * scope for a unit test.
 *
 * `.mts` so the ESM syntax here is loaded as ESM; `resolve.tsconfigPaths` is
 * Vite's native replacement for the vite-tsconfig-paths plugin and is what makes
 * the `@/*` alias from tsconfig.json work in tests.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
