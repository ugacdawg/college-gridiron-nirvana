import { FIRST_SEASON, LAST_SEASON, POWER_BY_NAME, slugify } from "./data/roster";

export const DEFAULT_SEASON = FIRST_SEASON;

export function parseSeason(v: string | string[] | undefined | null, fallback = DEFAULT_SEASON): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= FIRST_SEASON && n <= LAST_SEASON ? n : fallback;
}

export const teamHref = (slug: string, season?: number, extra?: Record<string, string>) => {
  const p = new URLSearchParams();
  if (season) p.set("season", String(season));
  for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
  const q = p.toString();
  return `/teams/${slug}${q ? `?${q}` : ""}`;
};

/** Link for any program: Power participants → team schedule; G6 → model-appearance page. */
export const programHref = (name: string, season?: number) =>
  POWER_BY_NAME.has(name) ? teamHref(slugify(name), season) : `/g6/${slugify(name)}`;

export const weekHref = (year: number, week: number, query?: string) => `/weeks/${year}/${week}${query ? `?${query}` : ""}`;
export const gameHref = (id: string) => `/games/${id}`;
export const withSeason = (path: string, season?: number) => (season ? `${path}${path.includes("?") ? "&" : "?"}season=${season}` : path);
