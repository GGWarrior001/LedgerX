import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    alias: {
      "firebase/firestore": path.resolve(__dirname, "./src/test/mocks/firebase-firestore.ts"),
      "firebase/auth": path.resolve(__dirname, "./src/test/mocks/firebase-auth.ts"),
      "firebase/app": path.resolve(__dirname, "./src/test/mocks/firebase-app.ts"),
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: true
      }
    },
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
