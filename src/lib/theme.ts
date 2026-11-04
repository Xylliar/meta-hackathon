/** "system" follows the device's light/dark setting. */
export type Theme = "light" | "dark" | "system";
export const THEMES: Theme[] = ["light", "dark", "system"];

const STORAGE_KEY = "tempo.theme";

export const isTheme = (v: unknown): v is Theme => THEMES.includes(v as Theme);

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? (prefersDark() ? "dark" : "light") : theme;
}

/** Applies the theme to the page and remembers it for the next load (see THEME_SCRIPT). */
export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  document.documentElement.setAttribute("data-theme", resolveTheme(theme));
}

export function storedTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return isTheme(t) ? t : "system";
  } catch {
    return "system";
  }
}

/**
 * Runs in <head> before the first paint, so a dark page never flashes white.
 * It reads the same localStorage key as applyTheme.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;
