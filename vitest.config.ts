import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Exercise date handling in a timezone west of UTC, where naive Date parsing shifts days.
    env: { TZ: "America/Los_Angeles" },
  },
});
