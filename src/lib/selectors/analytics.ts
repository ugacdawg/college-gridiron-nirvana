/** Five-year analytics computed from normalized fixtures, with workbook cross-checks. */
import type { Dataset } from "../data/dataset";
import { AFFILIATIONS, POWER_TEAMS, SEASONS, WEEKS, type Affiliation } from "../data/roster";
import type { G6AssignmentRow, WorkbookData } from "../data/workbook-types";
import { GAME_TYPES, pairKey, type Game, type GameType } from "../model";
import { teamGames } from "./team";

export type SeasonScope = number | "all";

export function scopeGames(ds: Dataset, scope: SeasonScope): Game[] {
  return scope === "all" ? ds.games : (ds.byYear.get(scope) ?? []);
}

export function typeCountsBySeason(ds: Dataset) {
  return SEASONS.map((s) => {
    const row: Record<string, number> & { season: number } = { season: s } as never;
    for (const t of GAME_TYPES) row[t] = 0;
    for (const g of ds.byYear.get(s) ?? []) row[g.type]++;
    return row as { season: number } & Record<GameType, number>;
  });
}

/** Power-vs-Power game counts by affiliation pair (conference games on the diagonal). */
export function affiliationMatrix(ds: Dataset, scope: SeasonScope) {
  const cells = new Map<string, Game[]>();
  for (const g of scopeGames(ds, scope)) {
    if (g.type === "G6") continue;
    const k = [g.homeConference, g.awayConference].sort().join("|");
    const list = cells.get(k) ?? [];
    list.push(g);
    cells.set(k, list);
  }
  const get = (a: Affiliation, b: Affiliation) => cells.get([a, b].sort().join("|")) ?? [];
  return { labels: AFFILIATIONS, get };
}

/** P4 nonconference balance between affiliation pairs per season (mirrors `08 | P4 Balance`). */
export function p4Balance(ds: Dataset) {
  const rows: { a: Affiliation; b: Affiliation; byYear: Record<number, number>; total: number }[] = [];
  for (let i = 0; i < AFFILIATIONS.length; i++) {
    for (let j = i + 1; j < AFFILIATIONS.length; j++) {
      const a = AFFILIATIONS[i];
      const b = AFFILIATIONS[j];
      const byYear: Record<number, number> = {};
      for (const s of SEASONS) {
        byYear[s] = (ds.byYear.get(s) ?? []).filter(
          (g) => g.type === "P4 nonconference" && [g.homeConference, g.awayConference].sort().join("|") === [a, b].sort().join("|"),
        ).length;
      }
      rows.push({ a, b, byYear, total: Object.values(byYear).reduce((x, y) => x + y, 0) });
    }
  }
  return rows;
}

export function p4BalanceMatchesWorkbook(ds: Dataset, wb: WorkbookData): { ok: boolean; mismatches: string[] } {
  const mine = p4Balance(ds);
  const mismatches: string[] = [];
  for (const r of wb.p4Balance) {
    const m = mine.find((x) => pairKey(x.a, x.b) === pairKey(r.leagueA, r.leagueB));
    if (!m) {
      mismatches.push(`${r.leagueA}–${r.leagueB}: not derived`);
      continue;
    }
    for (const s of SEASONS) if (m.byYear[s] !== r.byYear[String(s)]) mismatches.push(`${r.leagueA}–${r.leagueB} ${s}: fixtures ${m.byYear[s]} vs workbook ${r.byYear[String(s)]}`);
  }
  return { ok: mismatches.length === 0, mismatches };
}

/** Per-team P4 nonconference exposure to each other affiliation over five years (mirrors `09`). */
export function teamCrossplay(ds: Dataset) {
  return POWER_TEAMS.map((t) => {
    const per: Record<string, { games: number; opponents: Set<string> }> = {};
    for (const c of AFFILIATIONS) if (c !== t.conference) per[c] = { games: 0, opponents: new Set() };
    for (const s of SEASONS) {
      for (const tg of teamGames(ds, t.name, s)) {
        if (tg.game.type !== "P4 nonconference") continue;
        const bucket = per[tg.opponentConference];
        if (bucket) {
          bucket.games++;
          bucket.opponents.add(tg.opponent);
        }
      }
    }
    return { team: t.name, slug: t.slug, conference: t.conference, per };
  });
}

/** Repeated P4 nonconference pairings (mirrors `10 | P4 Repeat Audit`). */
export function repeatPairs(ds: Dataset, protectedKeys: Set<string>) {
  const m = new Map<string, Game[]>();
  for (const g of ds.games) {
    if (g.type !== "P4 nonconference") continue;
    const k = pairKey(g.home, g.away);
    const list = m.get(k) ?? [];
    list.push(g);
    m.set(k, list);
  }
  return [...m.entries()]
    .filter(([, gs]) => gs.length > 1)
    .map(([k, gs]) => {
      const [a, b] = k.split("|");
      return { a, b, games: gs, count: gs.length, protected: protectedKeys.has(k) };
    })
    .sort((x, y) => y.count - x.count || x.a.localeCompare(y.a));
}

export function g6Mix(wb: WorkbookData, scope: SeasonScope) {
  const rows: G6AssignmentRow[] = scope === "all" ? wb.g6Assignments : wb.g6Assignments.filter((r) => r.year === scope);
  const by = (k: keyof G6AssignmentRow) => {
    const c = new Map<string, number>();
    for (const r of rows) c.set(String(r[k]), (c.get(String(r[k])) ?? 0) + 1);
    return [...c.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  return { affinity: by("affinity"), league: by("g6League"), origin: by("origin"), rows };
}

export function neutralGames(ds: Dataset, scope: SeasonScope) {
  return scopeGames(ds, scope).filter((g) => g.isNeutral);
}

/** Number of Power participants on bye in each week. */
export function byesByWeek(ds: Dataset, scope: SeasonScope) {
  const seasons = scope === "all" ? [...SEASONS] : [scope];
  return WEEKS.map((w) => {
    let count = 0;
    for (const s of seasons) {
      const playing = new Set<string>();
      for (const g of ds.byYearWeek.get(`${s}-${w}`) ?? []) {
        playing.add(g.home);
        playing.add(g.away);
      }
      count += POWER_TEAMS.filter((t) => !playing.has(t.name)).length;
    }
    return { week: w, byes: count, games: seasons.reduce((n, s) => n + (ds.byYearWeek.get(`${s}-${w}`)?.length ?? 0), 0) };
  });
}

export function provenanceCountsBySeason(ds: Dataset) {
  return SEASONS.map((s) => {
    const gs = ds.byYear.get(s) ?? [];
    return {
      season: s,
      Published: gs.filter((g) => g.status === "Published").length,
      Protected: gs.filter((g) => g.status === "Protected").length,
      "Modeled rotation": gs.filter((g) => g.status === "Modeled rotation").length,
      "Model generated": gs.filter((g) => g.status === "Model generated").length,
      "Modeled regional": gs.filter((g) => g.status === "Modeled regional").length,
      "Venue override": gs.filter((g) => g.status === "Venue override").length,
    };
  });
}
