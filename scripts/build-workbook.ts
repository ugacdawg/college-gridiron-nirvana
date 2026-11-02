/**
 * npm run workbook:build — regenerate the audit workbook for the current model version from
 * data/cfb_full_games.json, mirroring the 15 sheets of source/build_cfb_workbook.py.
 *
 * Sheets 01–11 are recomputed from the fixtures. Sheets 12–15 (sources, exceptions, assumptions)
 * are carried over from the previous version's workbook, with the current version's rules added.
 * A "16 | Version History" sheet records what changed. Formula cells are written as values.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { readWorkbook, tableOf, type CellValue } from "./lib/xlsx";
import { buildDataset } from "../src/lib/data/dataset";
import { AFFILIATIONS, expectedConferenceGames, POWER_BY_NAME, POWER_TEAMS, SEASONS, WEEKS, G6_BY_NAME } from "../src/lib/data/roster";
import { pairKey, teamView, type Game, type RawGame } from "../src/lib/model";
import { teamSchedule } from "../src/lib/selectors/team";
import { allPairCoverage } from "../src/lib/selectors/conference";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data/College_Football_P4_Scheduling_Model_2027-2031.xlsx");
const version = JSON.parse(readFileSync(path.join(ROOT, "data/model-version.json"), "utf8"));
const prevPath = path.join(ROOT, version.previous.archive, "College_Football_P4_Scheduling_Model_2027-2031.xlsx");
const prevGamesPath = path.join(ROOT, version.previous.archive, "cfb_full_games.json");

const DARK = "FF142C43";
const SKY = "FFEAF4F5";
const TYPE_ORDER: Record<string, number> = { Conference: 0, "P4 nonconference": 1, G6: 2 };
const TYPE_CODE: Record<string, string> = { Conference: "C", "P4 nonconference": "P", G6: "G" };
const CROSS_RIVAL = new Set([["Georgia", "Georgia Tech"], ["Florida", "Florida State"], ["Clemson", "South Carolina"], ["Kentucky", "Louisville"], ["Iowa", "Iowa State"], ["Pitt", "West Virginia"]].map(([a, b]) => pairKey(a, b)));
const league = (t: string) => POWER_BY_NAME.get(t)?.conference ?? G6_BY_NAME.get(t)?.league ?? "";

async function main() {
  const raw = JSON.parse(readFileSync(path.join(ROOT, "data/cfb_full_games.json"), "utf8")) as RawGame[];
  const ds = buildDataset(raw);
  const prev = await readWorkbook(readFileSync(prevPath));
  const P = (n: string) => {
    const s = prev.get(n);
    if (!s) throw new Error(`previous workbook lacks sheet ${n}`);
    return s;
  };
  const wb = new ExcelJS.Workbook();
  wb.creator = "College Gridiron Nirvana";

  const sheet = (name: string, headers: string[], rows: CellValue[][], widths: number[] = []) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(headers);
    const h = ws.getRow(1);
    h.font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
    h.height = 22;
    for (const r of rows) ws.addRow(r);
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    return ws;
  };

  const games = [...ds.games].sort((a, b) => a.season - b.season || a.week - b.week || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.home.localeCompare(b.home) || a.away.localeCompare(b.away));
  const site = (g: Game, t: string) => teamView(g, t).site;
  const teamOrder = [...POWER_TEAMS].sort((a, b) => AFFILIATIONS.indexOf(a.conference) - AFFILIATIONS.indexOf(b.conference) || a.name.localeCompare(b.name));

  // --- 02 Weekly Games
  const weekly = games.map((g) => [g.season, g.week, g.date, g.away, g.home, league(g.away), league(g.home), g.type, g.categoryConference, g.venue, g.siteType, g.status, g.raw["Source URL"], g.id]);

  // --- 03 Team Calendar / 04 Team Games / 06 Annual Validation
  const cal: CellValue[][] = [], teamRows: CellValue[][] = [], valRows: CellValue[][] = [];
  for (const y of SEASONS)
    for (const t of teamOrder) {
      const sch = teamSchedule(ds, t.name, y);
      const gl = sch.games;
      const cg = gl.filter((x) => x.game.type === "Conference").length;
      const p4 = gl.filter((x) => x.game.type !== "G6").length;
      const g6 = gl.length - p4;
      const expect = expectedConferenceGames(t.name, y);
      const ok = cg === expect && p4 === 11 && g6 === 1 && gl.length === 12 && sch.byes.length === 2;
      valRows.push([y, t.name, t.conference, gl.length, cg, expect, p4, 11 - cg, g6, gl.filter((x) => x.site === "H").length, gl.filter((x) => x.site === "A").length, gl.filter((x) => x.site === "N").length, sch.byes.length, ok ? "PASS" : "FAIL"]);
      cal.push([y, t.name, t.conference, ...sch.slots.map((s) => (s.game ? `${s.game.site === "H" ? "vs " : s.game.site === "A" ? "@ " : "N "}${s.game.opponent} [${TYPE_CODE[s.game.game.type]}]` : "BYE")), cg, p4, g6]);
      for (const x of gl) teamRows.push([y, t.name, t.conference, x.game.week, x.game.date, x.opponent, x.opponentConference, x.site, x.game.type, x.game.venue, x.game.status, x.game.id, x.game.raw["Source URL"]]);
    }

  // --- 05 Conference H-A
  const pairs = allPairCoverage(ds).map((p) => {
    const fmt = (y: number) => {
      const m = p.meetings.find((x) => x.season === y);
      return m ? `${m.neutral ? "N: " : ""}${m.game.away} @ ${m.game.home}` : "—";
    };
    return [p.conference, p.teamA, p.teamB, p.aAdminHome, p.bAdminHome, p.meetings.length, ...SEASONS.map(fmt), p.pass ? "PASS" : "FAIL", p.involvesNeutral ? "Admin home at neutral venue" : "Campus home/away"];
  });

  // --- 07 Rivalry Locks (lock list and groupings carried from the previous version)
  const prevLocks = tableOf(P("07 | Rivalry Locks"), ["Grouping", "Team A", "Team B"]);
  const lockPairs: [string, string, string][] = [];
  for (const r of prevLocks) if (!lockPairs.some(([g, a, b]) => g === r.Grouping && a === r["Team A"] && b === r["Team B"])) lockPairs.push([String(r.Grouping), String(r["Team A"]), String(r["Team B"])]);
  const lockRows: CellValue[][] = [];
  for (const [grp, a, b] of lockPairs)
    for (const y of SEASONS) {
      const g = (ds.byPair.get(pairKey(a, b)) ?? []).find((x) => x.season === y);
      if (!g) throw new Error(`protected rivalry ${a}–${b} missing in ${y}`);
      lockRows.push([grp, a, b, y, g.week, g.date, g.away, g.home, g.venue, g.siteType, g.status, g.raw["Source URL"]]);
    }

  // --- 08 P4 Balance / 09 Team Crossplay / 10 Repeat Audit
  const nc = ds.games.filter((g) => g.type === "P4 nonconference");
  const balance: CellValue[][] = [];
  for (let i = 0; i < AFFILIATIONS.length; i++)
    for (let j = i + 1; j < AFFILIATIONS.length; j++) {
      const k = pairKey(AFFILIATIONS[i], AFFILIATIONS[j]);
      const counts = SEASONS.map((y) => nc.filter((g) => g.season === y && pairKey(g.homeConference, g.awayConference) === k).length);
      const tot = counts.reduce((x, z) => x + z, 0);
      balance.push([AFFILIATIONS[i], AFFILIATIONS[j], ...counts, tot, Math.round((tot / 5) * 10) / 10, Math.max(...counts) - Math.min(...counts)]);
    }
  const cross: CellValue[][] = [];
  for (const t of [...POWER_TEAMS].sort((a, b) => a.name.localeCompare(b.name)))
    for (const c of AFFILIATIONS) {
      if (c === t.conference) continue;
      const sub = nc.filter((g) => [g.home, g.away].includes(t.name) && league(g.home === t.name ? g.away : g.home) === c);
      cross.push([t.name, t.conference, c, ...SEASONS.map((y) => sub.filter((g) => g.season === y).length), sub.length, new Set(sub.map((g) => (g.home === t.name ? g.away : g.home))).size]);
    }
  const rep = new Map<string, Game[]>();
  for (const g of nc) rep.set(pairKey(g.home, g.away), [...(rep.get(pairKey(g.home, g.away)) ?? []), g]);
  const repeats = [...rep.entries()]
    .filter(([, l]) => l.length > 1)
    .sort((x, z) => z[1].length - x[1].length || x[0].localeCompare(z[0]))
    .map(([k, l]) => {
      const [a, b] = k.split("|");
      return [a, b, league(a), league(b), l.length, l.map((g) => g.season).sort().join(", "), CROSS_RIVAL.has(k) ? "PROTECTED" : "Repeat to examine"];
    });

  // --- 11 G6 Assignments (state / affinity carried from the previous version; pairings unchanged)
  const prevG6 = tableOf(P("11 | G6 Assignments"), ["Year", "Power Team", "G6 Opponent", "Power State", "G6 State", "Regional Affinity"]);
  const g6Meta = new Map(prevG6.map((r) => [`${r.Year}|${r["Power Team"]}|${r["G6 Opponent"]}`, r]));
  const g6Rows = ds.games
    .filter((g) => g.type === "G6")
    .sort((a, b) => a.season - b.season || a.week - b.week || a.home.localeCompare(b.home))
    .map((g) => {
      const t = g.awayIsPower ? g.away : g.home;
      const o = t === g.home ? g.away : g.home;
      const m = g6Meta.get(`${g.season}|${t}|${o}`);
      if (!m) throw new Error(`no previous G6 assignment row for ${g.season} ${t}–${o}`);
      return [g.season, t, league(t), o, league(o), m["Power State"], m["G6 State"], m["Regional Affinity"], site(g, t), g.week, g.date, g.venue, g.status, g.raw["Source URL"]];
    });

  // --- 01 Overview
  const ov = wb.addWorksheet("01 | Overview");
  ov.mergeCells("A1:J2");
  ov.getCell("A1").value = `POWER FOUR + NOTRE DAME  |  2027–2031  |  MODEL v${version.version}`;
  ov.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  ov.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
  ov.mergeCells("A3:J3");
  ov.getCell("A3").value = "Five-year scheduling counterfactual • scenario, not official NCAA or conference schedules";
  ov.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: SKY } };
  const y27 = ds.byYear.get(2027)!;
  const kpis: [string, number, string, number][] = [
    ["TEAMS", POWER_TEAMS.length, "CONFERENCE GAMES / YEAR", y27.filter((g) => g.type === "Conference").length],
    ["SEASONS", SEASONS.length, "NONCONF P4 GAMES / YEAR", y27.filter((g) => g.type === "P4 nonconference").length],
    ["GAMES / YEAR", y27.length, "G6 GAMES / YEAR", y27.filter((g) => g.type === "G6").length],
    ["UNIQUE GAMES", ds.games.length, "TEAM-SEASONS VALIDATED", valRows.filter((r) => r[13] === "PASS").length],
    ["P4 / TEAM / YEAR", 11, "CONFERENCE PAIRS VERIFIED", pairs.filter((r) => r[11] === "PASS").length],
    ["G6 / TEAM / YEAR", 1, "RIVALRY GAMES VERIFIED", lockRows.length],
  ];
  kpis.forEach(([a, b, c, d], i) => {
    const r = ov.getRow(5 + i);
    r.getCell(1).value = a;
    r.getCell(2).value = b;
    r.getCell(4).value = c;
    r.getCell(5).value = d;
  });
  ov.getRow(12).values = ["YEAR", "TEAMS", "TOTAL GAMES", "CONFERENCE", "NONCONF P4", "G6", "PUBLISHED FIXTURES", "CONFERENCE PAIRS PASSED", "TEAM RULES PASSED", "REPEATED P4 NC PAIRS"];
  ov.getRow(12).font = { bold: true };
  SEASONS.forEach((y, i) => {
    const gl = ds.byYear.get(y)!;
    ov.getRow(13 + i).values = [y, POWER_TEAMS.length, gl.length, gl.filter((g) => g.type === "Conference").length, gl.filter((g) => g.type === "P4 nonconference").length, gl.filter((g) => g.type === "G6").length, gl.filter((g) => g.status === "Published").length, pairs.filter((r) => r[11] === "PASS").length, valRows.filter((r) => r[0] === y && r[13] === "PASS").length, [...rep.values()].filter((l) => l.length > 1 && l.some((g) => g.season === y)).length];
  });
  ov.getCell("A20").value = "HOW TO USE THIS WORKBOOK";
  ov.getCell("A20").font = { bold: true };
  const prevNotes = P("01 | Overview").rows.slice(21).map((r) => r[0]).filter((x): x is string => typeof x === "string");
  const notes = [...prevNotes, `MODEL v${version.version} (${version.released}): ${version.changes.join(" ")}`, "16 Version History: changes from the previous model version."];
  notes.forEach((n, i) => (ov.getCell(`A${22 + i}`).value = n));
  [17, 18, 20, 30, 22, 23, 23, 26, 24, 26].forEach((w, i) => (ov.getColumn(i + 1).width = w));

  sheet("02 | Weekly Games", ["Year", "Week", "Saturday", "Away", "Home", "Away League", "Home League", "Game Category", "Conf / G6 League", "Venue", "Site", "Origin", "Source URL", "Game ID"], weekly, [8, 7, 12, 20, 20, 14, 14, 18, 16, 36, 9, 18, 50, 12]);
  sheet("03 | Team Calendar", ["Year", "Team", "Conference", ...WEEKS.map((w) => `Week ${w}`), "Conf. games", "P4 total", "G6 total"], cal, [8, 20, 12, ...WEEKS.map(() => 24), 11, 9, 9]);
  sheet("04 | Team Games", ["Year", "Team", "League", "Week", "Saturday", "Opponent", "Opponent League", "H/A/N", "Category", "Venue", "Origin", "Game ID", "Source URL"], teamRows, [8, 20, 12, 7, 12, 20, 14, 7, 18, 36, 18, 12, 50]);
  sheet("05 | Conference H-A", ["Conference", "Team A", "Team B", "A admin home", "B admin home", "Games / 5y", ...SEASONS.map(String), "Coverage", "Notes"], pairs, [12, 20, 20, 12, 12, 10, ...SEASONS.map(() => 32), 10, 28]);
  sheet("06 | Annual Validation", ["Year", "Team", "Conference", "Games", "Conf games", "Conf required", "P4 total", "P4 NC", "G6", "Home", "Away", "Neutral", "Byes", "Validation"], valRows, [8, 20, 12, 8, 10, 12, 9, 8, 6, 7, 7, 8, 7, 11]);
  sheet("07 | Rivalry Locks", ["Grouping", "Team A", "Team B", "Year", "Week", "Saturday", "Away", "Home", "Venue", "Site", "Origin", "Source"], lockRows, [16, 20, 20, 8, 7, 12, 20, 20, 36, 9, 14, 50]);
  sheet("08 | P4 Balance", ["League A", "League B", ...SEASONS.map(String), "5-year Total", "Annual Mean", "Year-to-Year Range"], balance, [14, 14, 8, 8, 8, 8, 8, 12, 12, 16]);
  sheet("09 | Team Crossplay", ["Team", "Home League", "Other League", ...SEASONS.map(String), "Total P4 NC", "Distinct Opponents"], cross, [20, 14, 14, 8, 8, 8, 8, 8, 12, 16]);
  sheet("10 | P4 Repeat Audit", ["Team A", "Team B", "League A", "League B", "Times Met", "Seasons", "Interpretation"], repeats, [20, 20, 12, 12, 10, 30, 20]);
  sheet("11 | G6 Assignments", ["Year", "Power Team", "Power League", "G6 Opponent", "G6 League", "Power State", "G6 State", "Regional Affinity", "Site", "Week", "Saturday", "Venue", "Origin", "Source URL"], g6Rows, [8, 20, 12, 20, 14, 10, 10, 14, 6, 7, 12, 36, 18, 50]);

  // --- 12–15 carried forward, with this version's rules appended
  const copy = (name: string, headers: string[], extra: CellValue[][] = [], widths: number[] = []) => {
    const rows = tableOf(P(name), headers).map((r) => headers.map((h) => r[h]));
    sheet(name, headers, [...rows, ...extra], widths);
  };
  copy("12 | Conference Sources", ["Year", "Conference", "Members", "Conference Games", "Published Locked", "Modeled Games", "Source Coverage", "Provenance / Source Note", "Source URL"], [], [8, 12, 9, 14, 14, 13, 13, 60, 50]);
  const v = `v${version.version}`;
  copy("13 | Contract Exceptions", ["Year", "Matchup / Issue", "Exception Type", "Existing Commitment / Issue", "Model Treatment", "Why", "Source URL"], [
    [2027, "Bye spacing", `Model rule (${v})`, "Original model allowed back-to-back and closely spaced byes (174 of 340 team-seasons under 4 games apart)", "All byes re-slotted at least 4 games apart; matchups, sites and statuses unchanged", "Competitive-balance rule added in this version", ""],
    [2027, "Non-conference repeats", `Model rule (${v})`, "Boston College–Notre Dame met in consecutive seasons (2027 model-generated, 2028 published)", "Model-generated non-conference games re-paired; published multi-year series kept as listed exceptions", "No P4 non-conference opponent in consecutive seasons", ""],
    [2030, "Clemson–Notre Dame", `Model rule (${v})`, "Sources list 2027, 2028, 2029 and 2031 only", "2030 game added (Clemson at Notre Dame); series treated as annual", "Requested annual series; not a published 2030 commitment", ""],
  ], [8, 30, 22, 60, 60, 60, 50]);
  copy("14 | Sources", ["Source Label", "Organization", "URL", "Use / Coverage"], [], [45, 20, 80, 80]);
  copy("15 | Assumptions", ["Rule or Field", "Explanation"], [
    ["Model version", `${version.name} (${version.released}). Previous version archived in ${version.previous.archive}.`],
    ["Bye spacing", `Each team's two byes are separated by at least ${version.rules.minGamesBetweenByes} games.`],
    ["Non-conference repeats", "No P4 non-conference pair meets in consecutive seasons, except the six protected rivalries and published multi-year series (see 16 | Version History)."],
    ["Clemson–Notre Dame", "Treated as an annual series; the 2030 game is model-added."],
  ], [30, 120]);

  // --- 16 Version History
  const prevGames = JSON.parse(readFileSync(prevGamesPath, "utf8")) as RawGame[];
  const prevById = new Map(prevGames.map((g) => [g["Game ID"], g]));
  const hist: CellValue[][] = [];
  for (const g of games) {
    const p = prevById.get(g.id);
    if (!p) hist.push([`v${version.version}`, g.season, g.id, `${g.away} @ ${g.home}`, "New pairing", "", g.week]);
    else if (p.Week !== g.week) hist.push([`v${version.version}`, g.season, g.id, `${g.away} @ ${g.home}`, "Week changed", p.Week, g.week]);
  }
  const ids = new Set(ds.games.map((g) => g.id));
  for (const p of prevGames) if (!ids.has(p["Game ID"])) hist.push([`v${version.version}`, p.Year, p["Game ID"], `${p.Away} @ ${p.Home}`, "Removed (re-paired)", p.Week, ""]);
  const exc = version.rules.repeatExceptions.map(([a, b, ys]: [string, string, number[]]) => [`v${version.version}`, "", "", `${a}–${b}`, `Allowed consecutive-season series (${ys.join(", ")})`, "", ""]);
  sheet("16 | Version History", ["Version", "Year", "Game ID", "Matchup", "Change", "Previous week", "New week"], [...hist, ...exc], [9, 8, 12, 40, 40, 13, 10]);

  await wb.xlsx.writeFile(OUT);
  console.log(`Wrote ${path.relative(ROOT, OUT)} — model v${version.version}: ${weekly.length} games, ${hist.length} version-history rows`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
