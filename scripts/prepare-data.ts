/**
 * npm run data:prepare
 *
 * Deterministically turns the starter-kit inputs into typed static JSON under src/data/generated/:
 *   - games.json             canonical fixtures (verbatim records, validated)
 *   - workbook.json          audit/lookup metadata from the 15-sheet workbook
 *   - validation-report.json results of every invariant + input fingerprints
 * Fails loudly (exit 1) when an input is missing, a sheet changed format, or any invariant fails.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { readWorkbook, tableOf, type CellValue, type Sheet } from "./lib/xlsx";
import { buildDataset } from "../src/lib/data/dataset";
import { CONFERENCE_MEMBERS, G6_MEMBERS, POWER_TEAMS, SEASONS, type G6League, type PowerConference } from "../src/lib/data/roster";
import type { CheckResult, G6VenueOverride, ModelVersion, ValidationReport, VersionInfo, WorkbookData } from "../src/lib/data/workbook-types";
import { RAW_KEYS, type RawGame } from "../src/lib/model";
import { runInvariants } from "../src/lib/validation/invariants";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "src/data/generated");
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

function fail(msg: string): never {
  console.error(red(`\n✖ data:prepare failed: ${msg}\n`));
  process.exit(1);
}

/** Resolve an input by expected relative path, else search the tree for the exact basename. */
function locate(rel: string, required = true): string | null {
  const direct = path.join(ROOT, rel);
  if (existsSync(direct)) return direct;
  const base = path.basename(rel);
  const skip = new Set(["node_modules", ".next", ".git", "src", "test-results", "playwright-report"]);
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue;
      const p = path.join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (name === base) {
        console.warn(dim(`  ↳ ${rel} not at expected path; using ${path.relative(ROOT, p)}`));
        return p;
      }
    }
  }
  if (required) fail(`required input "${rel}" was not found (searched ${ROOT} for "${base}"). Copy the starter-kit data/ folder into the project root.`);
  return null;
}

const sha = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
const num = (v: CellValue) => (typeof v === "number" ? v : Number(v));
const str = (v: CellValue) => (v == null ? "" : String(v));

const SHEETS = [
  "01 | Overview", "02 | Weekly Games", "03 | Team Calendar", "04 | Team Games", "05 | Conference H-A",
  "06 | Annual Validation", "07 | Rivalry Locks", "08 | P4 Balance", "09 | Team Crossplay", "10 | P4 Repeat Audit",
  "11 | G6 Assignments", "12 | Conference Sources", "13 | Contract Exceptions", "14 | Sources", "15 | Assumptions",
] as const;

function parseOverview(sheet: Sheet): WorkbookData["overview"] {
  const rows = sheet.rows;
  const kpis: { label: string; value: number }[] = [];
  let perYearHeader = -1;
  let notesHeader = -1;
  rows.forEach((r, i) => {
    if (r[0] === "YEAR") perYearHeader = i;
    if (r[0] === "HOW TO USE THIS WORKBOOK") notesHeader = i;
    if (perYearHeader === -1 && i > 2) {
      for (const [lc, vc] of [[0, 1], [3, 4]]) if (typeof r[lc] === "string" && typeof r[vc] === "number") kpis.push({ label: String(r[lc]), value: r[vc] as number });
    }
  });
  if (perYearHeader < 0 || notesHeader < 0 || kpis.length < 10) fail(`sheet "01 | Overview" changed format (kpis=${kpis.length})`);
  const perYear = [];
  for (let i = perYearHeader + 1; i < rows.length && typeof rows[i][0] === "number"; i++) {
    const r = rows[i].map(num);
    perYear.push({ year: r[0], teams: r[1], totalGames: r[2], conference: r[3], nonconferenceP4: r[4], g6: r[5], publishedFixtures: r[6], conferencePairsPassed: r[7], teamRulesPassed: r[8], repeatedP4NcPairs: r[9] });
  }
  const notes = rows.slice(notesHeader + 1).map((r) => str(r[0])).filter(Boolean);
  return { title: str(rows[0][0]), subtitle: str(rows[2][0]), kpis, perYear, notes };
}

const yearCols = (r: Record<string, CellValue>) => Object.fromEntries(SEASONS.map((y) => [String(y), num(r[String(y)])]));

async function crossCheckSourceZip(zipPath: string | null): Promise<CheckResult> {
  const label = "Roster matches cfb_model.py (CONF + Notre Dame, G6)";
  if (!zipPath) return { id: "roster-source", label, expected: "match", actual: "source ZIP not present (skipped)", pass: true };
  const zip = await JSZip.loadAsync(readFileSync(zipPath));
  const f = Object.values(zip.files).find((x) => x.name.endsWith("cfb_model.py"));
  if (!f) return { id: "roster-source", label, expected: "match", actual: "cfb_model.py missing in ZIP", pass: false };
  const py = await f.async("string");
  const block = (name: string) => {
    const m = py.match(new RegExp(`\\n${name}=\\{([\\s\\S]*?)\\}\\n`));
    if (!m) throw new Error(`could not find ${name} dict in cfb_model.py`);
    const out: Record<string, string[]> = {};
    for (const mm of m[1].matchAll(/'([^']+)':\[([^\]]*)\]/g)) out[mm[1]] = [...mm[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    return out;
  };
  const problems: string[] = [];
  const conf = block("CONF");
  for (const c of Object.keys(CONFERENCE_MEMBERS) as PowerConference[]) {
    if (JSON.stringify(conf[c]) !== JSON.stringify(CONFERENCE_MEMBERS[c])) problems.push(`${c} differs`);
  }
  if (!/TEAMCONF\['Notre Dame'\]='Independent'/.test(py)) problems.push("Notre Dame independence not found");
  const g6 = block("G6");
  for (const l of Object.keys(G6_MEMBERS) as G6League[]) if (JSON.stringify(g6[l]) !== JSON.stringify(G6_MEMBERS[l])) problems.push(`G6 ${l} differs`);
  return { id: "roster-source", label, expected: "match", actual: problems.length ? "mismatch" : "match", pass: !problems.length, detail: problems };
}

async function main() {
  console.log("College Gridiron Nirvana · data:prepare\n");
  const gamesPath = locate("data/cfb_full_games.json")!;
  const wbPath = locate("data/College_Football_P4_Scheduling_Model_2027-2031.xlsx")!;
  const issuesPath = locate("data/cfb_validation_issues.json", false);
  const zipPath = locate("source/College_Football_Model_Source_2027-2031.zip", false);
  const overridesPath = locate("data/g6_venue_overrides.json")!;
  const logoTargetsPath = locate("data/logo-targets.json")!;
  const overrides = JSON.parse(readFileSync(overridesPath, "utf8")) as G6VenueOverride[];
  const versionPath = locate("data/model-version.json")!;
  const version = JSON.parse(readFileSync(versionPath, "utf8")) as ModelVersion;
  const prevGamesPath = path.join(ROOT, version.previous.archive, "cfb_full_games.json");
  if (!existsSync(prevGamesPath)) fail(`previous model version not found at ${path.relative(ROOT, prevGamesPath)} (needed for the version history)`);
  if (!Array.isArray(overrides)) fail("g6_venue_overrides.json must be a JSON array");

  // ---- primary JSON
  const gamesBuf = readFileSync(gamesPath);
  let raw: RawGame[];
  try {
    raw = JSON.parse(gamesBuf.toString("utf8"));
  } catch (e) {
    fail(`cfb_full_games.json is not valid JSON: ${(e as Error).message}`);
  }
  if (!Array.isArray(raw)) fail("cfb_full_games.json must be a JSON array");
  raw.forEach((r, i) => {
    const keys = Object.keys(r);
    const missing = RAW_KEYS.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !(RAW_KEYS as string[]).includes(k));
    if (missing.length || extra.length) fail(`record #${i} (${r["Game ID"]}) schema drift — missing [${missing}] extra [${extra}]`);
  });
  console.log(`  games      ${raw.length} records  ${dim(path.relative(ROOT, gamesPath))}`);

  // ---- workbook
  const wbBuf = readFileSync(wbPath);
  const sheets = await readWorkbook(wbBuf);
  const names = [...sheets.keys()];
  const missingSheets = SHEETS.filter((s) => !sheets.has(s));
  if (missingSheets.length) fail(`workbook is missing sheet(s): ${missingSheets.join(", ")} (found: ${names.join(", ")})`);
  console.log(`  workbook   ${names.length} sheets     ${dim(path.relative(ROOT, wbPath))}`);
  const S = (n: (typeof SHEETS)[number]) => sheets.get(n)!;

  const weekly = tableOf(S("02 | Weekly Games"), ["Year", "Week", "Saturday", "Away", "Home", "Away League", "Home League", "Game Category", "Conf / G6 League", "Venue", "Site", "Origin", "Source URL", "Game ID"]);
  const calendar = tableOf(S("03 | Team Calendar"), ["Year", "Team", "Conference", ...Array.from({ length: 14 }, (_, i) => `Week ${i}`)]);
  const teamGamesRows = tableOf(S("04 | Team Games"), ["Year", "Team", "League", "Week", "Saturday", "Opponent", "Opponent League", "H/A/N", "Category", "Venue", "Origin", "Game ID", "Source URL"]);

  const workbook: WorkbookData = {
    file: path.basename(wbPath),
    sheetNames: names,
    overview: parseOverview(S("01 | Overview")),
    conferenceHA: tableOf(S("05 | Conference H-A"), ["Conference", "Team A", "Team B", "A admin home", "B admin home", "Games / 5y", "2027", "2031", "Coverage", "Notes"]).map((r) => ({
      conference: str(r.Conference), teamA: str(r["Team A"]), teamB: str(r["Team B"]), aAdminHome: num(r["A admin home"]), bAdminHome: num(r["B admin home"]), games5y: num(r["Games / 5y"]),
      byYear: Object.fromEntries(SEASONS.map((y) => [String(y), str(r[String(y)])])), coverage: str(r.Coverage), notes: str(r.Notes),
    })),
    annualValidation: tableOf(S("06 | Annual Validation"), ["Year", "Team", "Conference", "Games", "Conf games", "Conf required", "P4 total", "P4 NC", "G6", "Home", "Away", "Neutral", "Byes", "Validation"]).map((r) => ({
      year: num(r.Year), team: str(r.Team), conference: str(r.Conference), games: num(r.Games), confGames: num(r["Conf games"]), confRequired: num(r["Conf required"]), p4Total: num(r["P4 total"]), p4Nc: num(r["P4 NC"]), g6: num(r.G6), home: num(r.Home), away: num(r.Away), neutral: num(r.Neutral), byes: num(r.Byes), validation: str(r.Validation),
    })),
    rivalryLocks: tableOf(S("07 | Rivalry Locks"), ["Grouping", "Team A", "Team B", "Year", "Week", "Saturday", "Away", "Home", "Venue", "Site", "Origin", "Source"]).map((r) => ({
      grouping: str(r.Grouping), teamA: str(r["Team A"]), teamB: str(r["Team B"]), year: num(r.Year), week: num(r.Week), date: str(r.Saturday), away: str(r.Away), home: str(r.Home), venue: str(r.Venue), site: str(r.Site), origin: str(r.Origin), source: str(r.Source),
    })),
    p4Balance: tableOf(S("08 | P4 Balance"), ["League A", "League B", "2027", "2031", "5-year Total", "Annual Mean", "Year-to-Year Range"]).map((r) => ({
      leagueA: str(r["League A"]), leagueB: str(r["League B"]), byYear: yearCols(r), total: num(r["5-year Total"]), mean: num(r["Annual Mean"]), range: num(r["Year-to-Year Range"]),
    })),
    teamCrossplay: tableOf(S("09 | Team Crossplay"), ["Team", "Home League", "Other League", "2027", "2031", "Total P4 NC", "Distinct Opponents"]).map((r) => ({
      team: str(r.Team), league: str(r["Home League"]), otherLeague: str(r["Other League"]), byYear: yearCols(r), total: num(r["Total P4 NC"]), distinct: num(r["Distinct Opponents"]),
    })),
    repeatAudit: tableOf(S("10 | P4 Repeat Audit"), ["Team A", "Team B", "League A", "League B", "Times Met", "Seasons", "Interpretation"]).map((r) => ({
      teamA: str(r["Team A"]), teamB: str(r["Team B"]), leagueA: str(r["League A"]), leagueB: str(r["League B"]), timesMet: num(r["Times Met"]), seasons: str(r.Seasons).split(",").map((s) => Number(s.trim())), interpretation: str(r.Interpretation),
    })),
    g6Assignments: tableOf(S("11 | G6 Assignments"), ["Year", "Power Team", "Power League", "G6 Opponent", "G6 League", "Power State", "G6 State", "Regional Affinity", "Site", "Week", "Saturday", "Venue", "Origin", "Source URL"]).map((r) => ({
      year: num(r.Year), powerTeam: str(r["Power Team"]), powerLeague: str(r["Power League"]), g6Opponent: str(r["G6 Opponent"]), g6League: str(r["G6 League"]), powerState: str(r["Power State"]), g6State: str(r["G6 State"]), affinity: str(r["Regional Affinity"]), site: str(r.Site), week: num(r.Week), date: str(r.Saturday), venue: str(r.Venue), origin: str(r.Origin), source: str(r["Source URL"]),
    })),
    conferenceSources: tableOf(S("12 | Conference Sources"), ["Year", "Conference", "Members", "Conference Games", "Published Locked", "Modeled Games", "Source Coverage", "Provenance / Source Note", "Source URL"]).map((r) => ({
      year: num(r.Year), conference: str(r.Conference), members: num(r.Members), conferenceGames: num(r["Conference Games"]), publishedLocked: num(r["Published Locked"]), modeledGames: num(r["Modeled Games"]), coverage: num(r["Source Coverage"]), note: str(r["Provenance / Source Note"]), sourceUrl: str(r["Source URL"]),
    })),
    contractExceptions: tableOf(S("13 | Contract Exceptions"), ["Year", "Matchup / Issue", "Exception Type", "Existing Commitment / Issue", "Model Treatment", "Why", "Source URL"]).map((r) => ({
      year: num(r.Year), matchup: str(r["Matchup / Issue"]), exceptionType: str(r["Exception Type"]), existing: str(r["Existing Commitment / Issue"]), treatment: str(r["Model Treatment"]), why: str(r.Why), sourceUrl: str(r["Source URL"]),
    })),
    sources: tableOf(S("14 | Sources"), ["Source Label", "Organization", "URL", "Use / Coverage"]).map((r) => ({ label: str(r["Source Label"]), organization: str(r.Organization), url: str(r.URL), coverage: str(r["Use / Coverage"]) })),
    assumptions: tableOf(S("15 | Assumptions"), ["Rule or Field", "Explanation"]).map((r) => ({ rule: str(r["Rule or Field"]), explanation: str(r.Explanation) })),
  };

  // ---- dataset + invariants
  let ds;
  try {
    ds = buildDataset(raw);
  } catch (e) {
    fail(`normalization error: ${(e as Error).message}`);
  }
  const checks = runInvariants(ds, workbook, overrides, version.rules, { weeklyGames: weekly, teamGames: teamGamesRows, teamCalendar: calendar });

  // Roster vs workbook
  const rosterProblems: string[] = [];
  const wbTeams = new Map<string, string>();
  for (const r of workbook.annualValidation) wbTeams.set(r.team, r.conference);
  if (wbTeams.size !== POWER_TEAMS.length) rosterProblems.push(`workbook lists ${wbTeams.size} participants`);
  for (const t of POWER_TEAMS) if (wbTeams.get(t.name) !== t.conference) rosterProblems.push(`${t.name}: workbook ${wbTeams.get(t.name)} vs roster ${t.conference}`);
  for (const r of workbook.g6Assignments) if (!G6_MEMBERS[r.g6League as G6League]?.includes(r.g6Opponent)) rosterProblems.push(`G6 ${r.g6Opponent} league ${r.g6League}`);
  checks.unshift({ id: "roster-workbook", label: "Roster matches workbook (06 participants, 11 G6 leagues)", expected: "match", actual: rosterProblems.length ? "mismatch" : "match", pass: !rosterProblems.length, detail: rosterProblems.slice(0, 25) });
  checks.unshift(await crossCheckSourceZip(zipPath));

  // Roster vs logo-targets.json (134 schools; Power pool membership)
  const lt = JSON.parse(readFileSync(logoTargetsPath, "utf8")) as { teams: { name: string; pool: string; conference: string | null }[] };
  const ltProblems: string[] = [];
  const inGames = new Set(ds.games.flatMap((g) => [g.home, g.away]));
  if (lt.teams.length !== inGames.size) ltProblems.push(`${lt.teams.length} targets vs ${inGames.size} schools in games`);
  for (const t of lt.teams) {
    if (!inGames.has(t.name)) ltProblems.push(`${t.name} not in games`);
    const p = POWER_TEAMS.find((x) => x.name === t.name);
    if ((t.pool === "Power") !== !!p || (p && p.conference !== t.conference)) ltProblems.push(`${t.name}: pool/conference differs`);
  }
  checks.unshift({ id: "roster-logo-targets", label: "Roster matches logo-targets.json (134 schools, 68 Power)", expected: `${inGames.size} schools`, actual: ltProblems.length ? "mismatch" : `${lt.teams.length} schools`, pass: !ltProblems.length, detail: ltProblems.slice(0, 25) });

  // Kit-supplied standalone G6 hosting validator must also pass
  let g6Script = { pass: true, out: "" };
  const g6ScriptPath = locate("scripts/validate-g6-hosting.mjs", false);
  if (g6ScriptPath) {
    try {
      g6Script.out = execFileSync(process.execPath, [g6ScriptPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    } catch (e) {
      const err = e as { stderr?: string; stdout?: string };
      g6Script = { pass: false, out: `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() };
    }
  } else g6Script = { pass: false, out: "scripts/validate-g6-hosting.mjs not found" };
  checks.push({ id: "g6-hosting-script", label: "scripts/validate-g6-hosting.mjs", expected: "PASS", actual: g6Script.pass ? "PASS" : "FAIL", pass: g6Script.pass, detail: g6Script.pass ? [] : g6Script.out.split("\n").slice(0, 25) });

  // Original solver issue list
  let originalIssues: unknown[] = [];
  if (issuesPath) {
    originalIssues = JSON.parse(readFileSync(issuesPath, "utf8"));
    checks.push({ id: "solver-issues", label: "Original solver validation issues (cfb_validation_issues.json)", expected: "0", actual: String(originalIssues.length), pass: Array.isArray(originalIssues) && originalIssues.length === 0 });
  }

  // ---- report
  const width = Math.max(...checks.map((c) => c.label.length));
  console.log("");
  for (const c of checks) {
    console.log(`  ${c.pass ? green("PASS") : red("FAIL")}  ${c.label.padEnd(width)}  ${dim(`expected ${c.expected} · actual ${c.actual}`)}`);
    if (!c.pass) for (const d of c.detail ?? []) console.log(red(`          · ${d}`));
  }

  const inputs = [gamesPath, wbPath, overridesPath, logoTargetsPath, versionPath, issuesPath, zipPath].filter((p): p is string => !!p).map((p) => {
    const b = readFileSync(p);
    return { file: path.relative(ROOT, p), bytes: b.length, sha256: sha(b) };
  });
  const report: ValidationReport = {
    inputs,
    counts: { games: ds.games.length, seasons: [...SEASONS], powerTeams: POWER_TEAMS.length, g6Programs: ds.g6Appearances.size },
    checks,
    originalSolverIssues: originalIssues,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "validation-report.json"), JSON.stringify(report, null, 1) + "\n");
  const failed = checks.filter((c) => !c.pass);
  // Only publish data to the app when every check passes; the report is always written for diagnosis.
  if (!failed.length) {
    writeFileSync(path.join(OUT_DIR, "games.json"), JSON.stringify(raw) + "\n");
    writeFileSync(path.join(OUT_DIR, "workbook.json"), JSON.stringify(workbook, null, 1) + "\n");
    writeFileSync(path.join(OUT_DIR, "g6-venue-overrides.json"), JSON.stringify(overrides, null, 1) + "\n");
    // Version history: how this model differs from the archived previous version
    const prev = JSON.parse(readFileSync(prevGamesPath, "utf8")) as RawGame[];
    const prevById = new Map(prev.map((g) => [g["Game ID"], g]));
    const ids = new Set(raw.map((g) => g["Game ID"]));
    const info: VersionInfo = {
      ...version,
      diff: {
        movedWeeks: Object.fromEntries(raw.filter((g) => prevById.has(g["Game ID"]) && prevById.get(g["Game ID"])!.Week !== g.Week).map((g) => [g["Game ID"], { from: prevById.get(g["Game ID"])!.Week, to: g.Week }])),
        newGameIds: raw.filter((g) => !prevById.has(g["Game ID"])).map((g) => g["Game ID"]),
        removed: prev.filter((g) => !ids.has(g["Game ID"])).map((g) => ({ "Game ID": g["Game ID"], Year: g.Year, Week: g.Week, Home: g.Home, Away: g.Away, Status: g.Status })),
      },
    };
    writeFileSync(path.join(OUT_DIR, "version.json"), JSON.stringify(info, null, 1) + "\n");
  }
  if (failed.length) fail(`${failed.length} invariant(s) failed: ${failed.map((c) => c.id).join(", ")}`);
  console.log(green(`\n✔ model v${version.version}: ${checks.length} checks passed · wrote ${path.relative(ROOT, OUT_DIR)}/{games,workbook,version,validation-report}.json\n`));
}

main().catch((e) => fail(e instanceof Error ? e.stack ?? e.message : String(e)));
