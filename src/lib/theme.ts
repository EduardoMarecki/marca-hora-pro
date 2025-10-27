export type ThemePreference = 'system' | 'light' | 'dark';

export const applyTheme = (pref: ThemePreference) => {
  try {
    const root = document.documentElement;
    const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
    const isDark = pref === 'dark' || (pref === 'system' && mediaDark.matches);
    root.classList.toggle('dark', isDark);
  } catch {
    // no-op for non-DOM environments
  }
};

export const initTheme = (pref: ThemePreference = 'system') => {
  applyTheme(pref);
  // Reagir a mudança do sistema quando pref = system
  try {
    if (pref === 'system') {
      const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaDark.addEventListener?.('change', handler);
    }
  } catch {
    // ignore
  }
};