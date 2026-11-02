import type { Dataset } from "../data/dataset";
import {
  ACC_EIGHT_GAME,
  CONFERENCE_MEMBERS,
  expectedConferenceGames,
  SEASONS,
  WEEKS,
  type PowerConference,
  type Season,
} from "../data/roster";
import { pairKey, type Game, type TeamGame } from "../model";
import { teamGames } from "./team";

export interface MemberSeasonRow {
  team: string;
  confGames: number;
  confExpected: number;
  confHome: number;
  confAway: number;
  confNeutral: number;
  allHome: number;
  allAway: number;
  allNeutral: number;
  byWeek: (TeamGame | null)[];
}

export function conferenceGames(ds: Dataset, conf: PowerConference, season: number): Game[] {
  return (ds.byYear.get(season) ?? []).filter((g) => g.type === "Conference" && g.categoryConference === conf);
}

export function conferenceSeason(ds: Dataset, conf: PowerConference, season: number) {
  const games = conferenceGames(ds, conf, season);
  const byWeek = WEEKS.map((w) => ({ week: w, games: games.filter((g) => g.week === w) }));
  const members: MemberSeasonRow[] = CONFERENCE_MEMBERS[conf].map((team) => {
    const all = teamGames(ds, team, season);
    const conf = all.filter((t) => t.game.type === "Conference");
    const wk = new Map(all.map((t) => [t.game.week, t]));
    return {
      team,
      confGames: conf.length,
      confExpected: expectedConferenceGames(team, season),
      confHome: conf.filter((t) => t.site === "H").length,
      confAway: conf.filter((t) => t.site === "A").length,
      confNeutral: conf.filter((t) => t.site === "N").length,
      allHome: all.filter((t) => t.site === "H").length,
      allAway: all.filter((t) => t.site === "A").length,
      allNeutral: all.filter((t) => t.site === "N").length,
      byWeek: WEEKS.map((w) => wk.get(w) ?? null),
    };
  });
  const eight = conf === "ACC" ? ACC_EIGHT_GAME[season as Season] : null;
  return { games, byWeek, members, eight };
}

export interface PairCoverage {
  conference: PowerConference;
  teamA: string;
  teamB: string;
  meetings: { season: number; game: Game; adminHome: string; neutral: boolean }[];
  aAdminHome: number;
  bAdminHome: number;
  /** Both administrative directions present in 2027–2031 */
  pass: boolean;
  /** Literal campus visits in each direction (neutral sites excluded) */
  aCampusHome: number;
  bCampusHome: number;
  involvesNeutral: boolean;
}

export function pairCoverage(ds: Dataset, conf: PowerConference, a: string, b: string): PairCoverage {
  const ms = (ds.byPair.get(pairKey(a, b)) ?? [])
    .filter((g) => g.type === "Conference")
    .map((g) => ({ season: g.season, game: g, adminHome: g.home, neutral: g.isNeutral }));
  const aH = ms.filter((m) => m.adminHome === a).length;
  const bH = ms.filter((m) => m.adminHome === b).length;
  return {
    conference: conf,
    teamA: a,
    teamB: b,
    meetings: ms,
    aAdminHome: aH,
    bAdminHome: bH,
    pass: aH >= 1 && bH >= 1,
    aCampusHome: ms.filter((m) => m.adminHome === a && !m.neutral).length,
    bCampusHome: ms.filter((m) => m.adminHome === b && !m.neutral).length,
    involvesNeutral: ms.some((m) => m.neutral),
  };
}

export function allPairCoverage(ds: Dataset, conf?: PowerConference): PairCoverage[] {
  const confs = conf ? [conf] : (Object.keys(CONFERENCE_MEMBERS) as PowerConference[]);
  const out: PairCoverage[] = [];
  for (const c of confs) {
    const m = CONFERENCE_MEMBERS[c];
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) out.push(pairCoverage(ds, c, m[i], m[j]));
  }
  return out;
}

/** Five-season summary for a member: conference games and admin home counts per season. */
export function memberFiveYear(ds: Dataset, team: string) {
  return SEASONS.map((s) => {
    const conf = teamGames(ds, team, s).filter((t) => t.game.type === "Conference");
    return { season: s, games: conf.length, home: conf.filter((t) => t.site === "H").length, neutral: conf.filter((t) => t.site === "N").length };
  });
}

