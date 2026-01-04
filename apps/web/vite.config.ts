import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-512.png",
        "icons/apple-touch-icon.png",
        "icons/apple-touch-icon-180.png"
      ],
      manifest: {
        name: "CreamiNinja",
        short_name: "CreamiNinja",
        description: "Ninja CREAMi community: recipes, friends, inspiration.",
        theme_color: "#0b0f17",
        background_color: "#0b0f17",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        categories: ["food", "lifestyle", "social"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
          { src: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png", purpose: "any" }
        ]
      }
    })
  ]
});
