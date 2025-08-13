import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const reactPlugin = react();
const swPlugin = VitePWA({
  registerType:'prompt',
    devOptions: {
    enabled: true,
  },
  manifest: {
    name: "CD wishlist",
    icons: [{
      src: "vite.svg",
      sizes: "any"
    }]
  }
}) as typeof reactPlugin;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    reactPlugin,
    swPlugin
  ],

});
