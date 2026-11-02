"use client";

import { useSyncExternalStore } from "react";
import { Star } from "lucide-react";
import { cn } from "./ui";

/** Personal favorites, stored only in this browser (localStorage). */
const KEY = "cgn-favorites";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function write(slugs: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorites(): string[] {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function FavoriteToggle({ slug, name }: { slug: string; name: string }) {
  const favs = useFavorites();
  const on = favs.includes(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => write(on ? favs.filter((f) => f !== slug) : [...favs, slug])}
      className={cn(
        "no-print inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium",
        on ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-surface text-ink-2 hover:bg-surface-2",
      )}
      title="Saved on this device only (personal preference)"
    >
      <Star className={cn("h-3.5 w-3.5", on && "fill-current")} aria-hidden="true" />
      {on ? "Favorited" : "Favorite"}
      <span className="sr-only"> {name} (saved on this device only)</span>
    </button>
  );
}
