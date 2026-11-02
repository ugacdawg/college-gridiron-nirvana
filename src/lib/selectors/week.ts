/** Weekly game board: filter / group / sort state, serialisable to and from the query string. */
import { GAME_TYPES, type Game, type GameType, type Provenance, TYPE_LABEL } from "../model";
import { FIRST_SEASON, FIRST_WEEK, LAST_SEASON, LAST_WEEK } from "../data/roster";

export type VenueFilter = "all" | "campus" | "neutral";
export type GroupBy = "none" | "category" | "conference";
export type SortBy = "matchup" | "category" | "designation";

export interface WeekFilters {
  types: GameType[];
  confs: string[];
  teams: string[]; // team names
  venue: VenueFilter;
  prov: Provenance[];
  q: string;
  group: GroupBy;
  sort: SortBy;
}

export const DEFAULT_FILTERS: WeekFilters = {
  types: [],
  confs: [],
  teams: [],
  venue: "all",
  prov: [],
  q: "",
  group: "none",
  sort: "matchup",
};

const TYPE_CODES: Record<GameType, string> = { Conference: "conf", "P4 nonconference": "p4nc", G6: "g6" };
const CODE_TYPES = Object.fromEntries(Object.entries(TYPE_CODES).map(([k, v]) => [v, k])) as Record<string, GameType>;
const PROVS: Provenance[] = ["published", "protected", "override", "modeled"];

type ParamsLike = { get(k: string): string | null };

const list = (s: string | null) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

export function parseWeekFilters(p: ParamsLike): WeekFilters {
  const venue = p.get("venue");
  const group = p.get("group");
  const sort = p.get("sort");
  return {
    types: list(p.get("type")).map((c) => CODE_TYPES[c]).filter(Boolean),
    confs: list(p.get("conf")),
    teams: list(p.get("team")),
    venue: venue === "campus" || venue === "neutral" ? venue : "all",
    prov: list(p.get("prov")).filter((x): x is Provenance => (PROVS as string[]).includes(x)),
    q: p.get("q") ?? "",
    group: group === "category" || group === "conference" ? group : "none",
    sort: sort === "category" || sort === "designation" ? sort : "matchup",
  };
}

export function serializeWeekFilters(f: WeekFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.types.length) p.set("type", f.types.map((t) => TYPE_CODES[t]).join(","));
  if (f.confs.length) p.set("conf", f.confs.join(","));
  if (f.teams.length) p.set("team", f.teams.join(","));
  if (f.venue !== "all") p.set("venue", f.venue);
  if (f.prov.length) p.set("prov", f.prov.join(","));
  if (f.q.trim()) p.set("q", f.q);
  if (f.group !== "none") p.set("group", f.group);
  if (f.sort !== "matchup") p.set("sort", f.sort);
  return p;
}

export function isFiltered(f: WeekFilters): boolean {
  return !!(f.types.length || f.confs.length || f.teams.length || f.venue !== "all" || f.prov.length || f.q.trim());
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "");

export function filterWeekGames(games: Game[], f: WeekFilters): Game[] {
  const q = norm(f.q.trim());
  return games.filter((g) => {
    if (f.types.length && !f.types.includes(g.type)) return false;
    if (f.confs.length && !f.confs.includes(g.homeConference) && !f.confs.includes(g.awayConference)) return false;
    if (f.teams.length && !f.teams.includes(g.home) && !f.teams.includes(g.away)) return false;
    if (f.venue === "campus" && g.isNeutral) return false;
    if (f.venue === "neutral" && !g.isNeutral) return false;
    if (f.prov.length && !f.prov.includes(g.provenance)) return false;
    if (q && !norm(g.home).includes(q) && !norm(g.away).includes(q)) return false;
    return true;
  });
}

const TYPE_ORDER: Record<GameType, number> = { Conference: 0, "P4 nonconference": 1, G6: 2 };
const PROV_ORDER: Record<Provenance, number> = { published: 0, protected: 1, override: 2, modeled: 3 };

export function sortGames(games: Game[], sort: SortBy): Game[] {
  const byMatchup = (a: Game, b: Game) => a.away.localeCompare(b.away) || a.home.localeCompare(b.home);
  const cmp: Record<SortBy, (a: Game, b: Game) => number> = {
    matchup: byMatchup,
    category: (a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || byMatchup(a, b),
    designation: (a, b) => PROV_ORDER[a.provenance] - PROV_ORDER[b.provenance] || a.status.localeCompare(b.status) || byMatchup(a, b),
  };
  return [...games].sort(cmp[sort]);
}

export interface GameGroup {
  key: string;
  label: string;
  games: Game[];
}

/**
 * Group games. Conference grouping uses the game's category conference for conference
 * games and "Nonconference" / "G6" buckets otherwise, so each game appears exactly once.
 */
export function groupGames(games: Game[], group: GroupBy, sort: SortBy): GameGroup[] {
  const sorted = sortGames(games, sort);
  if (group === "none") return [{ key: "all", label: "All games", games: sorted }];
  const buckets = new Map<string, GameGroup>();
  const order: string[] = [];
  const keyOf = (g: Game): [string, string] => {
    if (group === "category") return [g.type, TYPE_LABEL[g.type]];
    if (g.type === "Conference") return [g.categoryConference, `${g.categoryConference} conference games`];
    if (g.type === "P4 nonconference") return ["p4nc", "P4 nonconference (incl. Notre Dame)"];
    return ["g6", "G6 (non-Power FBS) games"];
  };
  for (const g of sorted) {
    const [k, label] = keyOf(g);
    if (!buckets.has(k)) {
      buckets.set(k, { key: k, label, games: [] });
      order.push(k);
    }
    buckets.get(k)!.games.push(g);
  }
  const rank = (k: string) => {
    if (group === "category") return GAME_TYPES.indexOf(k as GameType);
    return ["SEC", "Big Ten", "Big 12", "ACC", "p4nc", "g6"].indexOf(k);
  };
  return order.sort((a, b) => rank(a) - rank(b)).map((k) => buckets.get(k)!);
}

export function countsByType(games: Game[]): Record<GameType, number> {
  const c: Record<GameType, number> = { Conference: 0, "P4 nonconference": 0, G6: 0 };
  for (const g of games) c[g.type]++;
  return c;
}

/** Cross-season week stepping: Week 13 → next season Week 0 (and back). Null at the dataset edges. */
export function stepWeek(year: number, week: number, dir: 1 | -1): { year: number; week: number } | null {
  let y = year;
  let w = week + dir;
  if (w > LAST_WEEK) {
    y += 1;
    w = FIRST_WEEK;
  } else if (w < FIRST_WEEK) {
    y -= 1;
    w = LAST_WEEK;
  }
  if (y < FIRST_SEASON || y > LAST_SEASON) return null;
  return { year: y, week: w };
}
