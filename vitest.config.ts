import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // jsdom is the default for src/ tests. Tests under api/ run in node by
    // starting with a `// @vitest-environment node` docblock (environmentMatchGlobs
    // was removed in recent Vitest majors).
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "api/**/*.test.ts"],
  },
});
