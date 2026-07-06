import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vitest/config";

const rootPackage = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version)
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true
    }),
    react()
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      host: "localhost",
      protocol: "ws",
      port: 5173,
      clientPort: 5173
    },
    watch: {
      usePolling: true,
      interval: 120
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"]
  }
});
