import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/*.integration.test.ts"],
    globalSetup: ["./src/__tests__/setup-global.ts"],
    setupFiles: [],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
