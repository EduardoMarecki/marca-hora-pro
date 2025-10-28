import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registra o Service Worker do VitePWA também via código, para garantir
// a instalação mesmo se a injeção automática no HTML não ocorrer no host.
// Isso é especialmente útil em hospedagens que não rodam o plugin de injeção.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  // Import dinâmico evita quebrar o bundle quando o plugin não está presente em algum ambiente
  import("virtual:pwa-register").then(({ registerSW }) => {
    try {
      registerSW({ immediate: true });
    } catch (err) {
      // Silencia erros caso o ambiente não suporte SW
      console.warn("PWA SW register skipped:", err);
    }
  }).catch(() => {
    // Ignora quando o virtual module não existe (ex.: ambiente sem o plugin)
  });
}

createRoot(document.getElementById("root")!).render(<App />);
