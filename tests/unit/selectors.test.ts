import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDataset, ywKey } from "@/lib/data/dataset";
import { POWER_TEAMS, SEASONS } from "@/lib/data/roster";

const POWER_NAMES = POWER_TEAMS.map((t) => t.name);
import type { WorkbookData } from "@/lib/data/workbook-types";
import { gamesCsv, teamScheduleCsv } from "@/lib/export/csv";
import { foldLine, icsEscape, teamScheduleIcs } from "@/lib/export/ics";
import { formatDate, isHttpUrl, nextDay, type RawGame } from "@/lib/model";
import { p4BalanceMatchesWorkbook } from "@/lib/selectors/analytics";
import { pairCoverage } from "@/lib/selectors/conference";
import { buildRivalries, protectedPairKeys } from "@/lib/selectors/rivalries";
import { searchTeams } from "@/lib/selectors/search";
import { teamSchedule, teamSummary } from "@/lib/selectors/team";
import manifest from "@/data/generated/logo-manifest.json";
import { DEFAULT_FILTERS, filterWeekGames, groupGames, parseWeekFilters, serializeWeekFilters, stepWeek } from "@/lib/selectors/week";

const raw = JSON.parse(readFileSync("data/cfb_full_games.json", "utf8")) as RawGame[];
const wb = JSON.parse(readFileSync("src/data/generated/workbook.json", "utf8")) as WorkbookData;
const ds = buildDataset(raw);
const rivalries = buildRivalries(ds, wb.rivalryLocks);
const prot = protectedPairKeys(rivalries);

describe("Workflow 1 — Georgia 2027", () => {
  const s = teamSchedule(ds, "Georgia", 2027);
  const sum = teamSummary(ds, "Georgia", 2027, prot);
  it("12 games in week order, one G6, two byes", () => {
    expect(s.games).toHaveLength(12);
    expect(s.games.map((g) => g.game.week)).toEqual([...s.games.map((g) => g.game.week)].sort((a, b) => a - b));
    expect(sum.g6).toBe(1);
    expect(s.byes).toHaveLength(2);
    expect(s.slots).toHaveLength(14);
  });
  it("includes protected Georgia Tech and neutral-site Florida in Tampa", () => {
    expect(sum.protectedRivalries.map((r) => r.opponent)).toContain("Georgia Tech");
    const fla = s.games.find((g) => g.opponent === "Florida")!;
    expect(fla.site).toBe("N");
    expect(fla.game.venue).toMatch(/Tampa/);
  });
});

describe("Workflow 2 — Notre Dame every season", () => {
  it.each(SEASONS)("%i: 12 games = 11 P4 + Navy", (y) => {
    const s = teamSchedule(ds, "Notre Dame", y);
    expect(s.games).toHaveLength(12);
    expect(s.games.filter((g) => g.opponentIsPower)).toHaveLength(11);
    const g6 = s.games.filter((g) => !g.opponentIsPower);
    expect(g6.map((g) => g.opponent)).toEqual(["Navy"]);
    expect(s.games.some((g) => g.game.type === "Conference")).toBe(false);
  });
  it("USC only in 2030 and 2031", () => {
    const yrs = SEASONS.filter((y) => teamSchedule(ds, "Notre Dame", y).games.some((g) => g.opponent === "USC"));
    expect(yrs).toEqual([2030, 2031]);
    const r = rivalries.find((x) => x.slug === "notre-dame-vs-usc")!;
    expect(r.annualExpected).toBe(false);
    expect(r.seasonsMissing).toEqual([2027, 2028, 2029]);
  });
});

describe("Workflow 3 — 2027 Week 0 board + filters", () => {
  const week = ds.byYearWeek.get(ywKey(2027, 0))!;
  it("lists every 2027 Week 0 game exactly once", () => {
    const expected = raw.filter((g) => g.Year === 2027 && g.Week === 0).map((g) => g["Game ID"]).sort();
    expect(week.map((g) => g.id).sort()).toEqual(expected);
    expect(new Set(week.map((g) => g.id)).size).toBe(week.length);
  });
  it("conference filter matches either participant, reset restores all", () => {
    const sec = filterWeekGames(week, { ...DEFAULT_FILTERS, confs: ["SEC"] });
    expect(sec.length).toBeGreaterThan(0);
    expect(sec.every((g) => g.homeConference === "SEC" || g.awayConference === "SEC")).toBe(true);
    expect(filterWeekGames(week, DEFAULT_FILTERS)).toHaveLength(week.length);
  });
  it("grouping keeps each game once", () => {
    for (const grp of ["none", "category", "conference"] as const) {
      expect(groupGames(week, grp, "matchup").flatMap((g) => g.games)).toHaveLength(week.length);
    }
  });
  it("filters round-trip through the query string", () => {
    const f = { ...DEFAULT_FILTERS, types: ["G6" as const], confs: ["ACC", "MAC"], venue: "neutral" as const, prov: ["published" as const], q: "Navy", group: "category" as const };
    expect(parseWeekFilters(serializeWeekFilters(f))).toEqual(f);
  });
});

describe("Workflow 4 — cross-season week navigation", () => {
  it("2028 Week 13 → 2029 Week 0 and back", () => {
    expect(stepWeek(2028, 13, 1)).toEqual({ year: 2029, week: 0 });
    expect(stepWeek(2029, 0, -1)).toEqual({ year: 2028, week: 13 });
  });
  it("stops at dataset edges", () => {
    expect(stepWeek(2027, 0, -1)).toBeNull();
    expect(stepWeek(2031, 13, 1)).toBeNull();
  });
});

describe("Workflow 5 — Ohio State & Michigan", () => {
  it("their game appears in both schedules and once on the weekly board", () => {
    for (const y of SEASONS) {
      const osu = teamSchedule(ds, "Ohio State", y).games.find((g) => g.opponent === "Michigan")!;
      const um = teamSchedule(ds, "Michigan", y).games.find((g) => g.opponent === "Ohio State")!;
      expect(osu.game.id).toBe(um.game.id);
      const board = ds.byYearWeek.get(ywKey(y, osu.game.week))!;
      expect(board.filter((g) => g.id === osu.game.id)).toHaveLength(1);
    }
  });
});

describe("Workflow 6 — neutral sites are not campus homes", () => {
  it("Florida–Georgia: admin coverage PASS but zero campus visits", () => {
    const p = pairCoverage(ds, "SEC", "Florida", "Georgia");
    expect(p.pass).toBe(true);
    expect(p.involvesNeutral).toBe(true);
    expect(p.aCampusHome + p.bCampusHome).toBe(0);
  });
  it("Oklahoma–Texas at the Cotton Bowl every season", () => {
    const p = pairCoverage(ds, "SEC", "Oklahoma", "Texas");
    expect(p.meetings).toHaveLength(5);
    expect(p.meetings.every((m) => m.neutral && /Cotton Bowl/.test(m.game.venue))).toBe(true);
  });
});

describe("Workflow 7 — exports", () => {
  const games = teamSchedule(ds, "Georgia", 2027).games.map((g) => g.game);
  it("CSV has header + 12 rows and escapes commas", () => {
    const csv = teamScheduleCsv("Georgia", games);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(13);
    expect(csv).toContain('"Raymond James Stadium, Tampa, FL"');
    expect(gamesCsv(ds.byYearWeek.get(ywKey(2027, 0))!).trimEnd().split("\r\n")).toHaveLength(1 + ds.byYearWeek.get(ywKey(2027, 0))!.length);
  });
  it("ICS: 12 all-day date-only events, no times, stable UIDs, CRLF, folded", () => {
    const ics = teamScheduleIcs("Georgia", games, { dtstamp: "20261014T000000Z" });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(12);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(12);
    expect(ics.match(/DTSTART;VALUE=DATE:\d{8}\r\n/g)).toHaveLength(12);
    expect(ics).not.toMatch(/DTSTART:\d{8}T/);
    expect(ics).toContain("UID:" + games[0].id + "-georgia@college-gridiron-nirvana.scenario");
    expect(ics.replace(/\r\n /g, "")).toContain("kickoff time unknown");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics.split("\n").every((l, i, arr) => i === arr.length - 1 || l.endsWith("\r"))).toBe(true);
    const tampa = games.find((g) => g.venue.includes("Tampa"))!;
    expect(ics).toContain(`DTSTART;VALUE=DATE:${tampa.date.replace(/-/g, "")}`);
    expect(ics).toContain(`DTEND;VALUE=DATE:${nextDay(tampa.date).replace(/-/g, "")}`);
  });
  it("escapes ICS text and folds long lines", () => {
    expect(icsEscape("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const folded = foldLine("X".repeat(200));
    expect(folded.split("\r\n ").every((p, i) => p.length <= (i === 0 ? 75 : 74))).toBe(true);
  });
});

describe("helpers", () => {
  it("formats calendar dates without timezone shift", () => {
    expect(formatDate("2027-08-28")).toBe("Sat, Aug 28, 2027");
    expect(nextDay("2027-12-31")).toBe("2028-01-01");
  });
  it("only treats http(s) strings as links", () => {
    expect(isHttpUrl("https://www.secsports.com/x")).toBe(true);
    expect(isHttpUrl("Model-generated regional G6 pairing")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
  it("search: UGA → Georgia; OSU is ambiguous", () => {
    expect(searchTeams("UGA")[0].team.name).toBe("Georgia");
    const osu = searchTeams("OSU").slice(0, 2).map((h) => h.team.name).sort();
    expect(osu).toEqual(["Ohio State", "Oklahoma State"]);
    expect(searchTeams("usc")[0].team.name).toBe("USC");
  });
  it("P4 balance derived from fixtures equals workbook 08", () => {
    expect(p4BalanceMatchesWorkbook(ds, wb).ok).toBe(true);
  });
});

describe("Workflow 2a — G6 games on the P4 campus", () => {
  const overrides = JSON.parse(readFileSync("data/g6_venue_overrides.json", "utf8")) as { "Game ID": string; Prior: { Status: string; Home: string; Venue: string } }[];
  it.each([
    ["Florida", 2027],
    ["Washington", 2027],
    ["Oregon", 2028],
    ["Ole Miss", 2029],
    ["BYU", 2028],
  ] as const)("%s %i: G6 game is a home game on its own campus", (team, y) => {
    const g6 = teamSchedule(ds, team, y).games.filter((g) => g.game.type === "G6");
    expect(g6).toHaveLength(1);
    expect(g6[0].site).toBe("H");
    expect(g6[0].game.venue).toBe(`${team} campus`);
  });
  it("every non-ND P4 team hosts its G6 game, every season", () => {
    for (const y of SEASONS)
      for (const t of POWER_NAMES.filter((n) => n !== "Notre Dame")) {
        const g6 = teamSchedule(ds, t, y).games.find((g) => g.game.type === "G6")!;
        expect(g6.site, `${y} ${t}`).toBe("H");
      }
  });
  it("Notre Dame–Navy alternates ND (27/29/31) and Navy (28/30)", () => {
    const hosts = SEASONS.map((y) => teamSchedule(ds, "Notre Dame", y).games.find((g) => g.opponent === "Navy")!.game.home);
    expect(hosts).toEqual(["Notre Dame", "Navy", "Notre Dame", "Navy", "Notre Dame"]);
  });
  it("the seven published conflicts carry status Venue override and keep their original source", () => {
    const pub = overrides.filter((o) => o.Prior.Status === "Published");
    expect(pub).toHaveLength(7);
    for (const o of pub) {
      const g = ds.byId.get(o["Game ID"])!;
      expect(g.status).toBe("Venue override");
      expect(g.provenance).toBe("override");
      expect(o.Prior.Venue).not.toBe(g.venue);
    }
    expect(ds.games.filter((g) => g.status === "Venue override")).toHaveLength(7);
  });
});

describe("logo manifest", () => {
  const teams = (manifest as { teams: Record<string, { sourcePath: string }> }).teams;
  const file = (n: string) => teams[n]?.sourcePath.split("/").pop() ?? "";
  it("maps look-alike names to the right school", () => {
    expect(file("Miami")).toMatch(/^Miami_Hurricanes/);
    expect(file("Miami (OH)")).toMatch(/^Miami_OH_Redhawks/);
    expect(file("USC")).toMatch(/^USC_Trojans/);
    expect(file("South Carolina")).toMatch(/^South_Carolina_Gamecocks/);
    expect(file("Ohio")).toMatch(/^Ohio_Bobcats/);
    expect(file("Ohio State")).toMatch(/^Ohio_State_Buckeyes/);
    expect(file("Georgia")).toMatch(/^Georgia_Bulldogs/);
    expect(file("Georgia Tech")).toMatch(/^Georgia_Tech/);
    expect(file("Texas")).toMatch(/^Texas_Longhorns/);
    expect(file("UTSA")).toMatch(/^Texas-SA-Roadrunners/);
    expect(file("NC State")).toMatch(/^North_Carolina_State/);
    expect(file("North Carolina")).toMatch(/^North_Carolina_Tar_Heels/);
  });
  it("never shares one image between two schools", () => {
    const paths = Object.values(teams).map((t) => t.sourcePath);
    expect(new Set(paths).size).toBe(paths.length);
  });
  it("covers all 134 schools in the games", () => {
    const names = new Set(ds.games.flatMap((g) => [g.home, g.away]));
    expect(names.size).toBe(134);
    expect([...names].filter((n) => !teams[n])).toEqual([]);
  });
  it("uses the user-supplied files for Delaware and Missouri State", () => {
    expect(teams["Delaware"].sourcePath).toBe("file:assets/logos-local/delaware.png");
    expect(teams["Missouri State"].sourcePath).toBe("file:assets/logos-local/missouri-state.png");
  });
});

describe("model v2.0 rules", () => {
  it("every team's byes are at least 4 games apart, every season", () => {
    for (const y of SEASONS)
      for (const t of POWER_NAMES) {
        const b = teamSchedule(ds, t, y).byes;
        expect(b[1] - b[0] - 1, `${y} ${t}`).toBeGreaterThanOrEqual(4);
      }
  });
  it("Clemson–Notre Dame is played every season, Clemson at Notre Dame in 2030", () => {
    const games = ds.games.filter((g) => [g.home, g.away].includes("Clemson") && [g.home, g.away].includes("Notre Dame"));
    expect(games.map((g) => g.season).sort()).toEqual([2027, 2028, 2029, 2030, 2031]);
    const g30 = games.find((g) => g.season === 2030)!;
    expect([g30.away, g30.home]).toEqual(["Clemson", "Notre Dame"]);
  });
  it("records the v1.0 → v2.0 differences and keeps every published v1.0 game", () => {
    const v = JSON.parse(readFileSync("src/data/generated/version.json", "utf8"));
    expect(v.version).toBe("2.0");
    expect(v.diff.removed.every((d: { Status: string }) => d.Status === "Model generated")).toBe(true);
    expect(v.diff.newGameIds).toHaveLength(v.diff.removed.length);
    const v1 = JSON.parse(readFileSync("data/archive/v1.0/cfb_full_games.json", "utf8")) as RawGame[];
    for (const g of v1.filter((x) => x.Status === "Published")) expect(ds.byId.get(g["Game ID"])?.home).toBe(g.Home);
  });
});
