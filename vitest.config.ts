import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    allowOnly: false,
    css: {
      include: [/.+/],
    },
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**", "**/.worktrees/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
