import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const reactPlugin = react();
const swPlugin = VitePWA({
  registerType: "prompt",
  devOptions: {
    enabled: true,
  },
  manifest: {
    name: "CD wishlist",
    icons: [{
      src: "vite.svg",
      sizes: "any",
    }],
  },
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/musicbrainz\.org\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "music-brainz",
          expiration: undefined,
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
          expiration: undefined,
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /cds\.json/i,
        handler: "NetworkFirst",
        options: {
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
});
