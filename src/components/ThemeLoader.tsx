import { useEffect } from "react";
import { applyTheme } from "@/lib/theme";

// Versão genérica: aplica o tema preferido salvo em localStorage, ou 'system' por padrão
export const ThemeLoader = () => {
  useEffect(() => {
    const storedPref = localStorage.getItem("theme_preference");
    const pref = storedPref === "light" || storedPref === "dark" ? storedPref : "system";
    applyTheme(pref);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "theme_preference") {
        const v = e.newValue === "light" || e.newValue === "dark" ? e.newValue! : "system";
        applyTheme(v);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
};