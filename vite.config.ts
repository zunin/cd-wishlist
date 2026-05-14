import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const reactPlugin = react();
const buildTime = new Date().toISOString();

const swPlugin = VitePWA({
  registerType: "autoUpdate",
  devOptions: {
    enabled: true,
  },
  manifest: {
    name: "CD wishlist",
    icons: [{
      src: "vite.svg",
      sizes: "any",
    }],
    version: "1.0.0",
  },
  workbox: {
    // Ensure immediate activation
    skipWaiting: true,
    clientsClaim: true,
    // Cleanup old caches
    cleanupOutdatedCaches: true,
    globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/musicbrainz\.org\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "music-brainz",
          expiration: {
            maxEntries: 1000,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/coverartarchive\.org\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "coverartarchive",
          expiration: {
            maxEntries: 1000,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year - cache forever like MusicBrainz
          },
          cacheableResponse: {
            statuses: [200], // Only cache successful responses, never cache errors
          },
        },
      },
      {
        urlPattern: /cds\.json/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "cds-data",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
          },
          backgroundSync: {
            name: "cd6000",
            options: {
              maxRetentionTime: 60,
            },
          },
        },
      },
    ],
  },
}) as typeof reactPlugin;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    reactPlugin,
    swPlugin,
  ],
  server: {
    allowedHosts: ["frontend", "signaling"],
    host: "0.0.0.0",
  },
  define: {
    __APP_VERSION__: JSON.stringify(buildTime),
  },
});
