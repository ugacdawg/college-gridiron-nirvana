import type { Dataset } from "../data/dataset";
import { ytKey } from "../data/dataset";
import {
  AFFILIATIONS,
  expectedConferenceGames,
  POWER_BY_NAME,
  SEASONS,
  WEEKS,
} from "../data/roster";
import { pairKey, teamView, type Game, type TeamGame } from "../model";

export interface WeekSlot {
  week: number;
  date: string | null;
  game: TeamGame | null;
}

export interface TeamSchedule {
  team: string;
  season: number;
  games: TeamGame[];
  slots: WeekSlot[];
  byes: number[];
}

/** Modeled Saturday for each week of a season, read from the fixtures themselves. */
export function seasonWeekDates(ds: Dataset, season: number): Map<number, string> {
  const out = new Map<number, string>();
  for (const g of ds.byYear.get(season) ?? []) if (!out.has(g.week)) out.set(g.week, g.date);
  return out;
}

export function teamGames(ds: Dataset, team: string, season: number): TeamGame[] {
  return (ds.byYearTeam.get(ytKey(season, team)) ?? []).map((g) => teamView(g, team));
}

export function teamSchedule(ds: Dataset, team: string, season: number): TeamSchedule {
  const games = teamGames(ds, team, season);
  const byWeek = new Map(games.map((tg) => [tg.game.week, tg]));
  const dates = seasonWeekDates(ds, season);
  const slots = WEEKS.map((w) => ({ week: w, date: dates.get(w) ?? null, game: byWeek.get(w) ?? null }));
  return { team, season, games, slots, byes: slots.filter((s) => !s.game).map((s) => s.week) };
}

export interface TeamSummary {
  total: number;
  p4: number;
  g6: number;
  conference: number;
  conferenceExpected: number;
  p4Nonconference: number;
  home: number;
  away: number;
  neutral: number;
  byes: number[];
  /** P4/ND opponents grouped by affiliation */
  p4OpponentsByConference: { conference: string; opponents: string[] }[];
  g6Opponent: { name: string; league: string } | null;
  protectedRivalries: TeamGame[];
  isAccEightGame: boolean;
}

export function teamSummary(ds: Dataset, team: string, season: number, protectedPairs: Set<string>): TeamSummary {
  const sched = teamSchedule(ds, team, season);
  const g = sched.games;
  const p4 = g.filter((x) => x.game.type !== "G6");
  const byConf = new Map<string, string[]>();
  for (const x of p4) {
    const list = byConf.get(x.opponentConference) ?? [];
    list.push(x.opponent);
    byConf.set(x.opponentConference, list);
  }
  const g6 = g.find((x) => x.game.type === "G6");
  const expected = expectedConferenceGames(team, season);
  const conf = POWER_BY_NAME.get(team)?.conference;
  return {
    total: g.length,
    p4: p4.length,
    g6: g.length - p4.length,
    conference: g.filter((x) => x.game.type === "Conference").length,
    conferenceExpected: expected,
    p4Nonconference: g.filter((x) => x.game.type === "P4 nonconference").length,
    home: g.filter((x) => x.site === "H").length,
    away: g.filter((x) => x.site === "A").length,
    neutral: g.filter((x) => x.site === "N").length,
    byes: sched.byes,
    p4OpponentsByConference: AFFILIATIONS.filter((c) => byConf.has(c)).map((c) => ({
      conference: c,
      opponents: byConf.get(c)!.sort(),
    })),
    g6Opponent: g6 ? { name: g6.opponent, league: g6.opponentConference } : null,
    protectedRivalries: g.filter((x) => protectedPairs.has(pairKey(x.team, x.opponent))),
    isAccEightGame: conf === "ACC" && expected === 8,
  };
}

/** All meetings between two programs across 2027–2031 (any category). */
export function meetings(ds: Dataset, a: string, b: string): Game[] {
  return ds.byPair.get(pairKey(a, b)) ?? [];
}

/** Five-season opponent matrix: opponent → season → TeamGame. */
export function fiveYearOpponents(ds: Dataset, team: string) {
  const rows = new Map<string, Map<number, TeamGame>>();
  for (const s of SEASONS) {
    for (const tg of teamGames(ds, team, s)) {
      const m = rows.get(tg.opponent) ?? new Map<number, TeamGame>();
      m.set(s, tg);
      rows.set(tg.opponent, m);
    }
  }
  return [...rows.entries()]
    .map(([opponent, bySeason]) => {
      const first = [...bySeason.values()][0];
      return {
        opponent,
        opponentSlug: first.opponentSlug,
        opponentIsPower: first.opponentIsPower,
        opponentConference: first.opponentConference,
        bySeason,
        count: bySeason.size,
      };
    })
    .sort((x, y) => y.count - x.count || x.opponent.localeCompare(y.opponent));
}
