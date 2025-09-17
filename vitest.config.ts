import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Exclude integration tests unless INTEGRATION_TESTS is set
    exclude: process.env.INTEGRATION_TESTS ? ["**/node_modules/**"] : ["**/node_modules/**", "**/*.integration.test.*"],
    include: process.env.INTEGRATION_TESTS ? ["**/*.integration.test.*"] : ["**/*.test.*"],
  },
});
