/**
 * Rivalry catalog. The protected set comes from workbook sheet `07 | Rivalry Locks`; special series
 * (Notre Dame–Navy, Notre Dame–USC) and a few notable unprotected series are added explicitly.
 * Every rivalry's games are found by searching the fixture dataset — never assumed.
 */
import type { Dataset } from "../data/dataset";
import { SEASONS, slugify } from "../data/roster";
import type { RivalryLockRow } from "../data/workbook-types";
import { pairKey, type Game } from "../model";

/** Commonly used names for series (display only; the fixture data is authoritative). */
const RIVALRY_NAMES: Record<string, string> = {
  [pairKey("Alabama", "Auburn")]: "Iron Bowl",
  [pairKey("Alabama", "Tennessee")]: "Third Saturday in October",
  [pairKey("Arkansas", "LSU")]: "Battle for the Golden Boot",
  [pairKey("Arkansas", "Missouri")]: "Battle Line Rivalry",
  [pairKey("Arkansas", "Texas")]: "Southwest Classic",
  [pairKey("Auburn", "Georgia")]: "Deep South's Oldest Rivalry",
  [pairKey("Florida", "Georgia")]: "Florida–Georgia",
  [pairKey("LSU", "Ole Miss")]: "Magnolia Bowl",
  [pairKey("Mississippi State", "Ole Miss")]: "Egg Bowl",
  [pairKey("Oklahoma", "Texas")]: "Red River Rivalry",
  [pairKey("Texas", "Texas A&M")]: "Lone Star Showdown",
  [pairKey("Illinois", "Northwestern")]: "Land of Lincoln Trophy",
  [pairKey("Illinois", "Purdue")]: "Purdue Cannon",
  [pairKey("Indiana", "Purdue")]: "Old Oaken Bucket",
  [pairKey("Iowa", "Minnesota")]: "Floyd of Rosedale",
  [pairKey("Iowa", "Nebraska")]: "Heroes Game",
  [pairKey("Iowa", "Wisconsin")]: "Heartland Trophy",
  [pairKey("Michigan", "Michigan State")]: "Paul Bunyan Trophy",
  [pairKey("Michigan", "Ohio State")]: "The Game",
  [pairKey("Minnesota", "Wisconsin")]: "Paul Bunyan's Axe",
  [pairKey("UCLA", "USC")]: "Victory Bell (Crosstown)",
  [pairKey("Arizona", "Arizona State")]: "Territorial Cup",
  [pairKey("BYU", "Utah")]: "Holy War",
  [pairKey("Kansas", "Kansas State")]: "Sunflower Showdown",
  [pairKey("Baylor", "TCU")]: "Revivalry",
  [pairKey("Iowa State", "Kansas State")]: "Farmageddon",
  [pairKey("California", "Stanford")]: "Big Game",
  [pairKey("Duke", "North Carolina")]: "Victory Bell",
  [pairKey("Virginia", "Virginia Tech")]: "Commonwealth Cup",
  [pairKey("Georgia", "Georgia Tech")]: "Clean, Old-Fashioned Hate",
  [pairKey("Florida", "Florida State")]: "Sunshine Showdown",
  [pairKey("Clemson", "South Carolina")]: "Palmetto Bowl",
  [pairKey("Kentucky", "Louisville")]: "Governor's Cup",
  [pairKey("Iowa", "Iowa State")]: "Cy-Hawk Trophy",
  [pairKey("Pitt", "West Virginia")]: "Backyard Brawl",
  [pairKey("Navy", "Notre Dame")]: "Notre Dame–Navy",
  [pairKey("Notre Dame", "USC")]: "Jeweled Shillelagh",
  [pairKey("Oklahoma", "Oklahoma State")]: "Bedlam",
  [pairKey("Notre Dame", "Stanford")]: "Legends Trophy",
  [pairKey("Michigan State", "Notre Dame")]: "Megaphone Trophy",
  [pairKey("Notre Dame", "Purdue")]: "Shillelagh Trophy",
};

export type RivalryKind = "Conference lock" | "Cross-conference lock" | "Special series" | "Notable, not protected";

export interface Rivalry {
  slug: string;
  teamA: string;
  teamB: string;
  name: string | null;
  grouping: string;
  kind: RivalryKind;
  /** True when the model treats this as an every-season fixture. */
  annualExpected: boolean;
  games: Game[];
  seasonsPresent: number[];
  seasonsMissing: number[];
  note: string | null;
  workbookRows: RivalryLockRow[];
}

const SPECIALS: { a: string; b: string; annual: boolean; note: string }[] = [
  {
    a: "Notre Dame",
    b: "Navy",
    annual: true,
    note: "Protected every season. Navy is Notre Dame's one and only G6 game, so this series is not in the workbook's P4 Rivalry Locks sheet.",
  },
  {
    a: "Notre Dame",
    b: "USC",
    annual: false,
    note: "Published hiatus 2027–2029; the series is scheduled again in 2030 and 2031. Not an annual fixture in this scenario.",
  },
];

const NOTABLE: { a: string; b: string; note: string }[] = [
  { a: "Oklahoma", b: "Oklahoma State", note: "Now a cross-conference series; not protected by the model. Any meetings shown are model output." },
  { a: "Notre Dame", b: "Stanford", note: "Not protected in this scenario; meetings shown are published or model-generated fixtures." },
  { a: "Michigan State", b: "Notre Dame", note: "Not protected in this scenario; meetings shown are published or model-generated fixtures." },
  { a: "Notre Dame", b: "Purdue", note: "Not protected in this scenario; meetings shown are published or model-generated fixtures." },
];

export function rivalrySlug(a: string, b: string): string {
  return [a, b].sort().map(slugify).join("-vs-");
}

export function buildRivalries(ds: Dataset, locks: RivalryLockRow[]): Rivalry[] {
  const out: Rivalry[] = [];
  const seen = new Set<string>();
  const make = (
    a: string,
    b: string,
    grouping: string,
    kind: RivalryKind,
    annualExpected: boolean,
    note: string | null,
    workbookRows: RivalryLockRow[],
  ): Rivalry => {
    const games = ds.byPair.get(pairKey(a, b)) ?? [];
    const present = [...new Set(games.map((g) => g.season))].sort();
    return {
      slug: rivalrySlug(a, b),
      teamA: a,
      teamB: b,
      name: RIVALRY_NAMES[pairKey(a, b)] ?? null,
      grouping,
      kind,
      annualExpected,
      games,
      seasonsPresent: present,
      seasonsMissing: SEASONS.filter((s) => !present.includes(s)),
      note,
      workbookRows,
    };
  };

  const byPair = new Map<string, RivalryLockRow[]>();
  for (const r of locks) {
    const k = pairKey(r.teamA, r.teamB);
    const list = byPair.get(k) ?? [];
    list.push(r);
    byPair.set(k, list);
  }
  for (const [k, rows] of byPair) {
    const { teamA, teamB, grouping } = rows[0];
    const cross = grouping === "Cross-conference";
    const neutralNote =
      k === pairKey("Florida", "Georgia")
        ? "Neutral site: Tampa (Raymond James Stadium) in 2027 to preserve the published commitment; Jacksonville (EverBank Stadium) 2028–2031. Administrative home alternates for accounting only."
        : k === pairKey("Oklahoma", "Texas")
          ? "Neutral site every year at the Cotton Bowl, Dallas. Administrative home alternates for accounting only."
          : null;
    out.push(make(teamA, teamB, grouping, cross ? "Cross-conference lock" : "Conference lock", true, neutralNote, rows));
    seen.add(k);
  }
  for (const s of SPECIALS) {
    if (seen.has(pairKey(s.a, s.b))) continue;
    out.push(make(s.a, s.b, "Special", "Special series", s.annual, s.note, []));
    seen.add(pairKey(s.a, s.b));
  }
  for (const n of NOTABLE) {
    if (seen.has(pairKey(n.a, n.b))) continue;
    out.push(make(n.a, n.b, "Notable", "Notable, not protected", false, n.note, []));
  }
  return out;
}

/** Pair keys for protected annual rivalries (workbook locks + Notre Dame–Navy). */
export function protectedPairKeys(rivalries: Rivalry[]): Set<string> {
  return new Set(rivalries.filter((r) => r.annualExpected).map((r) => pairKey(r.teamA, r.teamB)));
}
