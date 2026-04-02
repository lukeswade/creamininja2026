import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const PWA_VERSION = "2026-04-02-7";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
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
      },
      workbox: {
        cacheId: `creamininja-${PWA_VERSION}`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
});
