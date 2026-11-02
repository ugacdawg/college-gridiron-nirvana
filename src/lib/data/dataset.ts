/**
 * Builds the normalized game array and derived indexes. Pure: used by the app runtime,
 * the data-preparation script and the test-suite alike.
 */
import { normalizeGame, pairKey, type Game, type RawGame } from "../model";
import { affiliationOf, G6_TEAMS, POWER_TEAMS } from "./roster";

export interface Dataset {
  games: Game[];
  byId: Map<string, Game>;
  byYear: Map<number, Game[]>;
  /** key `${year}-${week}` */
  byYearWeek: Map<string, Game[]>;
  /** key `${year}|${team}` — Power participants and G6 programs alike */
  byYearTeam: Map<string, Game[]>;
  /** key `pairKey(a, b)` — all seasons */
  byPair: Map<string, Game[]>;
  conferenceByTeam: Map<string, string>;
  /** G6 programs → their P4-model appearances only (not full seasons) */
  g6Appearances: Map<string, Game[]>;
}

export const ywKey = (year: number, week: number) => `${year}-${week}`;
export const ytKey = (year: number, team: string) => `${year}|${team}`;

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

const byWeekThenId = (a: Game, b: Game) => a.week - b.week || a.id.localeCompare(b.id);

export function buildDataset(raw: RawGame[]): Dataset {
  const games = raw.map(normalizeGame);
  const byId = new Map<string, Game>();
  const byYear = new Map<number, Game[]>();
  const byYearWeek = new Map<string, Game[]>();
  const byYearTeam = new Map<string, Game[]>();
  const byPair = new Map<string, Game[]>();
  const g6Appearances = new Map<string, Game[]>();

  for (const g of games) {
    if (byId.has(g.id)) throw new Error(`Duplicate Game ID ${g.id}`);
    byId.set(g.id, g);
    push(byYear, g.season, g);
    push(byYearWeek, ywKey(g.season, g.week), g);
    push(byYearTeam, ytKey(g.season, g.home), g);
    push(byYearTeam, ytKey(g.season, g.away), g);
    push(byPair, pairKey(g.home, g.away), g);
    if (!g.homeIsPower) push(g6Appearances, g.home, g);
    if (!g.awayIsPower) push(g6Appearances, g.away, g);
  }
  for (const m of [byYear, byYearWeek, byYearTeam, g6Appearances]) for (const v of m.values()) v.sort(byWeekThenId);
  for (const v of g6Appearances.values()) v.sort((a, b) => a.season - b.season || a.week - b.week);
  for (const v of byPair.values()) v.sort((a, b) => a.season - b.season || a.week - b.week);

  const conferenceByTeam = new Map<string, string>();
  for (const t of POWER_TEAMS) conferenceByTeam.set(t.name, t.conference);
  for (const t of G6_TEAMS) conferenceByTeam.set(t.name, t.league);
  for (const g of games) {
    for (const t of [g.home, g.away]) if (!conferenceByTeam.has(t)) conferenceByTeam.set(t, affiliationOf(t));
  }

  return { games, byId, byYear, byYearWeek, byYearTeam, byPair, conferenceByTeam, g6Appearances };
}
