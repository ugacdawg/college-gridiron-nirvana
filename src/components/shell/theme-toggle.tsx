"use client";

import { Moon, Sun } from "lucide-react";

/** Toggles the `dark` class; preference is stored per device (personal preference only). */
export function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("cgn-theme", dark ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
      aria-label="Toggle light or dark theme"
      title="Toggle theme"
    >
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden="true" />
      <Moon className="h-4 w-4 dark:hidden" aria-hidden="true" />
    </button>
  );
}

/** Inline script run before paint: honour stored choice, else system preference. */
export const themeInitScript = `(function(){try{var s=localStorage.getItem('cgn-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
