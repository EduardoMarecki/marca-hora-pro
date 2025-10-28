import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Visualização do bundle (apenas em build)
    mode === "production" && visualizer({
      filename: "stats.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      open: false,
      emitFile: true,
    }) as any,
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Gera automaticamente ícones PNG (192/512 e maskable) a partir do nosso SVG
      // Isso evita manter binários no repositório e garante compatibilidade com Android/iOS
      pwaAssets: {
        image: "public/placeholder.svg",
        htmlPreset: "2023",
        // includeManifestIcons is not a valid option in PWAAssetsOptions
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        // Alguns bundles podem exceder 2 MiB; aumentamos o limite para evitar falha no build do Pages
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
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
        name: "PontoFácil - Sistema de Controle de Ponto",
        short_name: "PontoFácil",
        description: "Sistema completo de controle de ponto para empresas",
        // Caminhos relativos garantem compatibilidade em dev (/) e em GitHub Pages (/marca-hora-pro/)
        id: ".",
        start_url: ".",
        scope: ".",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait-primary",
        lang: "pt-BR",
        background_color: "#ffffff",
        theme_color: "#0ea5e9",
        categories: ["business", "productivity"],
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
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
