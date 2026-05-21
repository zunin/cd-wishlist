import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { getWorkboxRuntimeCaching } from "./src/utils/workboxQueue.ts";

const reactPlugin = react();
const buildTime = new Date().toISOString();

// Get Workbox routes from centralized module
const swPlugin = VitePWA({
    registerType: "autoUpdate",
    devOptions: {
        enabled: true,
    },
    manifest: {
        name: "CD wishlist",
        icons: [
            {
                src: "vite.svg",
                sizes: "any",
            },
        ],
        version: "1.0.0",
    },
    workbox: {
        // Ensure immediate activation
        skipWaiting: true,
        clientsClaim: true,
        // Cleanup old caches
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // Use Workbox runtime caching with retry and caching plugins
        runtimeCaching: getWorkboxRuntimeCaching(),
    },
}) as typeof reactPlugin;

// https://vite.dev/config/
export default defineConfig({
    plugins: [reactPlugin, swPlugin],
    server: {
        allowedHosts: ["frontend", "signaling"],
        host: "0.0.0.0",
    },
    define: {
        __APP_VERSION__: JSON.stringify(buildTime),
    },
});
