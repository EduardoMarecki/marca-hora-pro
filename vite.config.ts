import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"]
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "placeholder.svg"
      ],
      manifest: {
        name: "PontoFácil",
        short_name: "PontoFácil",
        description: "Sistema de Controle de Ponto",
        start_url: "/",
        scope: "/",
        display: "standalone",
        lang: "pt-BR",
        background_color: "#ffffff",
        theme_color: "#0ea5e9",
        icons: [
          {
            src: "/placeholder.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/favicon.ico",
            sizes: "64x64 32x32 16x16",
            type: "image/x-icon",
            purpose: "any"
          }
        ]
      }
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
