/**
 * Non-negotiable model invariants. Run by `npm run data:prepare` (fails the build on any
 * failure), by the Vitest suite, and summarised on /methodology.
 */
import type { Dataset } from "../data/dataset";
import { ytKey, ywKey } from "../data/dataset";
import {
  CONFERENCE_MEMBERS,
  expectedConferenceGames,
  G6_BY_NAME,
  POWER_BY_NAME,
  POWER_TEAMS,
  SEASONS,
  WEEKS,
  type PowerConference,
} from "../data/roster";
import type { CheckResult, G6VenueOverride, ModelVersion, WorkbookData } from "../data/workbook-types";
import { pairKey, parseIsoDate, teamView } from "../model";
import { allPairCoverage } from "../selectors/conference";
import { teamSchedule } from "../selectors/team";

export interface WorkbookSheetRows {
  weeklyGames?: Record<string, unknown>[];
  teamGames?: Record<string, unknown>[];
  teamCalendar?: Record<string, unknown>[];
}

const EXPECTED = { games: 2210, perYear: 442, conference: 301, p4nc: 73, g6: 68, participants: 68, pairs: 529 };

function check(id: string, label: string, expected: string | number, actual: string | number, problems: string[] = []): CheckResult {
  const pass = String(expected) === String(actual) && problems.length === 0;
  return { id, label, expected: String(expected), actual: String(actual), pass, detail: problems.slice(0, 25) };
}

export function runInvariants(ds: Dataset, wb: WorkbookData, overrides: G6VenueOverride[], rules: ModelVersion["rules"], sheets: WorkbookSheetRows = {}): CheckResult[] {
  const out: CheckResult[] = [];
  const games = ds.games;

  // Years
  const years = [...new Set(games.map((g) => g.season))].sort();
  out.push(check("years", "Seasons present", SEASONS.join(", "), years.join(", ")));

  // IDs
  const ids = new Set(games.map((g) => g.id));
  out.push(check("rows", "Fixture rows", EXPECTED.games, games.length));
  out.push(check("unique-ids", "Distinct Game IDs", EXPECTED.games, ids.size));

  // Per-year totals
  for (const [id, label, type, exp] of [
    ["per-year", "Unique games per season", null, EXPECTED.perYear],
    ["conf-per-year", "Conference games per season", "Conference", EXPECTED.conference],
    ["p4nc-per-year", "P4 nonconference games per season", "P4 nonconference", EXPECTED.p4nc],
    ["g6-per-year", "G6 games per season", "G6", EXPECTED.g6],
  ] as const) {
    const bad: string[] = [];
    for (const s of SEASONS) {
      const n = (ds.byYear.get(s) ?? []).filter((g) => !type || g.type === type).length;
      if (n !== exp) bad.push(`${s}: ${n}`);
    }
    out.push(check(id, label, exp, bad.length ? "varies" : exp, bad));
  }

  // Participant population
  const powerInData = new Set(games.flatMap((g) => [g.home, g.away]).filter((t) => POWER_BY_NAME.has(t)));
  const notInData = POWER_TEAMS.filter((t) => !powerInData.has(t.name)).map((t) => `${t.name} has no games`);
  out.push(check("participants", "Power-participant population (67 conference + Notre Dame)", EXPECTED.participants, powerInData.size, notInData));
  const confCounts = (Object.keys(CONFERENCE_MEMBERS) as PowerConference[]).map((c) => `${c} ${CONFERENCE_MEMBERS[c].length}`).join(", ");
  out.push(check("conference-sizes", "Conference sizes", "SEC 16, Big Ten 18, Big 12 16, ACC 17", confCounts));

  // FCS / unknown programs
  const unknown = [...new Set(games.flatMap((g) => [g.home, g.away]))].filter((t) => !POWER_BY_NAME.has(t) && !G6_BY_NAME.has(t));
  out.push(check("fcs", "FCS or unknown opponents", 0, unknown.length, unknown));

  // Team-season rules
  const rule = (id: string, label: string, expected: string, fn: (team: string, season: number) => string | null) => {
    const bad: string[] = [];
    for (const s of SEASONS) for (const t of POWER_TEAMS) {
      const msg = fn(t.name, s);
      if (msg) bad.push(`${s} ${t.name}: ${msg}`);
    }
    out.push(check(id, label, expected, bad.length ? `${bad.length} team-season failure(s)` : expected, bad));
  };
  const tg = (team: string, s: number) => (ds.byYearTeam.get(ytKey(s, team)) ?? []).map((g) => teamView(g, team));
  rule("games-per-team", "Games per team-season", "12 for all 340 team-seasons", (t, s) => (tg(t, s).length === 12 ? null : `${tg(t, s).length} games`));
  rule("p4-per-team", "Power-pool opponents per team-season", "11 for all 340 team-seasons", (t, s) => {
    const n = tg(t, s).filter((x) => x.opponentIsPower).length;
    const nType = tg(t, s).filter((x) => x.game.type !== "G6").length;
    return n === 11 && nType === 11 ? null : `${n} P4 opponents / ${nType} non-G6 games`;
  });
  rule("g6-per-team", "G6 opponents per team-season", "1 for all 340 team-seasons", (t, s) => {
    const n = tg(t, s).filter((x) => !x.opponentIsPower).length;
    return n === 1 ? null : `${n} G6 opponents`;
  });
  rule("conf-per-team", "Conference games per team-season", "9 (SEC/Big Ten/Big 12); ACC 9 or the yearly 8; Notre Dame 0", (t, s) => {
    const n = tg(t, s).filter((x) => x.game.type === "Conference").length;
    const e = expectedConferenceGames(t, s);
    const own = POWER_BY_NAME.get(t)!.conference;
    const wrongConf = tg(t, s).filter((x) => x.game.type === "Conference" && (x.game.categoryConference !== own || x.opponentConference !== own));
    if (wrongConf.length) return `${wrongConf.length} conference game(s) outside own league`;
    return n === e ? null : `${n} conference games, expected ${e}`;
  });
  rule("byes", "Bye weeks per team-season", "2 for all 340 team-seasons", (t, s) => {
    const b = teamSchedule(ds, t, s).byes.length;
    return b === 2 ? null : `${b} byes`;
  });
  const accEight = SEASONS.map((s) => {
    const eights = CONFERENCE_MEMBERS.ACC.filter((t) => tg(t, s).filter((x) => x.game.type === "Conference").length === 8);
    return `${s} ${eights.join("/") || "none"}`;
  }).join("; ");
  out.push(check("acc-eight", "ACC eight-game exception by season", "2027 Clemson; 2028 Stanford; 2029 SMU; 2030 California; 2031 Boston College", accEight));

  // Weeks
  const badWeeks = games.filter((g) => !Number.isInteger(g.week) || g.week < 0 || g.week > 13).map((g) => `${g.id}: ${g.week}`);
  out.push(check("week-range", "Weeks are integers 0–13", 0, badWeeks.length, badWeeks));

  const dateIssues: string[] = [];
  for (const s of SEASONS) for (const w of WEEKS) {
    const dates = new Set((ds.byYearWeek.get(ywKey(s, w)) ?? []).map((g) => g.date));
    if (dates.size !== 1) dateIssues.push(`${s} W${w}: ${dates.size} distinct dates`);
    for (const d of dates) {
      const { y, m, d: dd } = parseIsoDate(d);
      if (new Date(Date.UTC(y, m - 1, dd)).getUTCDay() !== 6) dateIssues.push(`${s} W${w}: ${d} is not a Saturday`);
    }
  }
  out.push(check("week-dates", "Each season-week has one modeled Saturday", 0, dateIssues.length, dateIssues));

  // Double bookings (any participant, including shared G6 opponents)
  const slot = new Map<string, string[]>();
  for (const g of games) for (const t of [g.home, g.away]) {
    const k = `${g.season}|${g.week}|${t}`;
    slot.set(k, [...(slot.get(k) ?? []), g.id]);
  }
  const doubles = [...slot.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}: ${v.join(", ")}`);
  out.push(check("double-bookings", "Weekly double bookings (all participants)", 0, doubles.length, doubles));

  // Self-play and duplicate pair in a season
  const dupPairs: string[] = [];
  for (const s of SEASONS) {
    const seen = new Set<string>();
    for (const g of ds.byYear.get(s) ?? []) {
      if (g.home === g.away) dupPairs.push(`${g.id} self-play`);
      const k = pairKey(g.home, g.away);
      if (seen.has(k)) dupPairs.push(`${s} ${k} twice`);
      seen.add(k);
    }
  }
  out.push(check("duplicate-pairs", "Same pairing twice in a season / self-play", 0, dupPairs.length, dupPairs));

  // Notre Dame
  const ndIssues: string[] = [];
  for (const s of SEASONS) {
    const nd = tg("Notre Dame", s);
    const navy = nd.filter((x) => x.opponent === "Navy");
    const otherG6 = nd.filter((x) => !x.opponentIsPower && x.opponent !== "Navy");
    if (navy.length !== 1) ndIssues.push(`${s}: Navy ${navy.length}×`);
    if (otherG6.length) ndIssues.push(`${s}: other G6 ${otherG6.map((x) => x.opponent).join(", ")}`);
    if (nd.some((x) => x.game.type === "Conference")) ndIssues.push(`${s}: has a conference game`);
    if (nd.filter((x) => x.game.type === "P4 nonconference").length !== 11) ndIssues.push(`${s}: P4 nonconference ≠ 11`);
  }
  out.push(check("nd-navy", "Notre Dame–Navy exactly once per season; no other ND G6; 11 P4 nonconference", 0, ndIssues.length, ndIssues));
  const ndUsc = (ds.byPair.get(pairKey("Notre Dame", "USC")) ?? []).map((g) => g.season).join(", ");
  out.push(check("nd-usc", "Notre Dame–USC seasons (hiatus 2027–2029)", "2030, 2031", ndUsc));

  // Version rules: bye spacing, no consecutive-season non-conference repeats, required meetings
  const byeBad: string[] = [];
  for (const s of SEASONS) for (const t of POWER_TEAMS) {
    const b = teamSchedule(ds, t.name, s).byes;
    if (b.length === 2 && b[1] - b[0] - 1 < rules.minGamesBetweenByes) byeBad.push(`${s} ${t.name}: byes W${b[0]} & W${b[1]}`);
  }
  out.push(check("bye-spacing", `Byes at least ${rules.minGamesBetweenByes} games apart (no back-to-back byes)`, 0, byeBad.length, byeBad));
  if (rules.noConsecutiveNonconfRepeats) {
    const allowed = new Set(rules.repeatExceptions.map(([x, y]) => pairKey(x, y)));
    const lockKeys = new Set(wb.rivalryLocks.map((r) => pairKey(r.teamA, r.teamB)));
    const ncSeasons = new Map<string, Set<number>>();
    for (const g of games) if (g.type === "P4 nonconference") {
      const k = pairKey(g.home, g.away);
      ncSeasons.set(k, (ncSeasons.get(k) ?? new Set()).add(g.season));
    }
    const rep = [...ncSeasons.entries()].filter(([k, ys]) => !allowed.has(k) && !lockKeys.has(k) && [...ys].some((y) => ys.has(y + 1))).map(([k]) => k.replace("|", "–"));
    out.push(check("no-repeat-nc", "No P4 non-conference pair in consecutive seasons (beyond protected rivalries and listed published series)", 0, rep.length, rep));
  }
  const reqMissing = rules.requiredGames.filter(([x, y, s]) => !(ds.byPair.get(pairKey(x, y)) ?? []).some((g) => g.season === s)).map(([x, y, s]) => `${x}–${y} ${s}`);
  out.push(check("required-games", `Required meetings present (${rules.requiredGames.map(([x, y, s]) => `${x}–${y} ${s}`).join(", ") || "none"})`, 0, reqMissing.length, reqMissing));

  // Mandatory G6 home-campus rule (Notre Dame–Navy exempt)
  const g6All = games.filter((g) => g.type === "G6");
  const isNdNavy = (g: (typeof games)[number]) => [g.home, g.away].includes("Notre Dame");
  const p4g6 = g6All.filter((g) => !isNdNavy(g));
  const hostViol = p4g6
    .filter((g) => !(g.homeIsPower && !g.awayIsPower && g.siteType === "Campus" && g.venue === `${g.home} campus`))
    .map((g) => `${g.id} ${g.away} @ ${g.home} (${g.siteType}, ${g.venue})`);
  const perYear = SEASONS.map((s) => p4g6.filter((g) => g.season === s && !hostViol.some((v) => v.startsWith(g.id))).length);
  out.push(check("g6-home", "P4–G6 games on the Power Four school's home campus", "335 / 335", `${p4g6.length - hostViol.length} / ${p4g6.length}`, hostViol));
  out.push(check("g6-home-yearly", "P4-campus G6 games per season (67 each)", "67, 67, 67, 67, 67", perYear.join(", ")));
  const ndNavy = g6All.filter(isNdNavy).map((g) => `${g.season}:${g.home}`).join("; ");
  out.push(check("nd-navy-venue", "Notre Dame–Navy venue exception (home or away allowed)", "2027:Notre Dame; 2028:Navy; 2029:Notre Dame; 2030:Navy; 2031:Notre Dame", ndNavy));
  const g6OvIssues: string[] = [];
  if (overrides.length !== 68) g6OvIssues.push(`${overrides.length} override records`);
  const pubOv = overrides.filter((o) => o.Prior.Status === "Published");
  if (pubOv.length !== 7) g6OvIssues.push(`${pubOv.length} published-site overrides`);
  for (const o of overrides) {
    const g = ds.byId.get(o["Game ID"]);
    if (!g) {
      g6OvIssues.push(`${o["Game ID"]}: not in fixtures`);
      continue;
    }
    const r = g.raw;
    if (r.Home !== o.New.Home || r.Away !== o.New.Away || r.Venue !== o.New.Venue || r["Site type"] !== o.New["Site type"] || r.Status !== o.New.Status || g.type !== "G6" || g.season !== o.Year || g.week !== o.Week)
      g6OvIssues.push(`${o["Game ID"]}: audit record differs from fixture`);
  }
  const statusOv = games.filter((g) => g.status === "Venue override").map((g) => g.id).sort();
  const expectOv = pubOv.map((o) => o["Game ID"]).sort();
  if (statusOv.join() !== expectOv.join()) g6OvIssues.push(`Venue override status on [${statusOv}] vs published overrides [${expectOv}]`);
  out.push(check("g6-overrides", "g6_venue_overrides.json: 68 corrections (7 published) reconcile by Game ID", 0, g6OvIssues.length, g6OvIssues));

  // Neutral-site venue exceptions
  const venue = (a: string, b: string) =>
    (ds.byPair.get(pairKey(a, b)) ?? []).map((g) => `${g.season}:${g.isNeutral ? "N" : "C"}:${g.venue.split(",")[1]?.trim() ?? g.venue}`).join("; ");
  out.push(check("fla-uga", "Florida–Georgia venues", "2027:N:Tampa; 2028:N:Jacksonville; 2029:N:Jacksonville; 2030:N:Jacksonville; 2031:N:Jacksonville", venue("Florida", "Georgia")));
  out.push(check("ou-tex", "Oklahoma–Texas venues", "2027:N:Dallas; 2028:N:Dallas; 2029:N:Dallas; 2030:N:Dallas; 2031:N:Dallas", venue("Oklahoma", "Texas")));
  const campusNeutral = games.filter((g) => g.isNeutral && /campus$/i.test(g.venue)).map((g) => `${g.id} ${g.venue}`);
  out.push(check("neutral-venues", "Neutral games list a non-campus venue", 0, campusNeutral.length, campusNeutral));

  // Home/away coverage
  const cov = allPairCoverage(ds);
  const covFail = cov.filter((p) => !p.pass).map((p) => `${p.conference} ${p.teamA}–${p.teamB}: ${p.aAdminHome}/${p.bAdminHome}`);
  out.push(check("ha-coverage", "Intra-conference pairs with both administrative home directions (2027–31)", `${EXPECTED.pairs} / ${EXPECTED.pairs}`, `${cov.length - covFail.length} / ${cov.length}`, covFail));
  const covWb: string[] = [];
  if (wb.conferenceHA.length !== EXPECTED.pairs) covWb.push(`workbook has ${wb.conferenceHA.length} rows`);
  for (const r of wb.conferenceHA) {
    const p = cov.find((c) => pairKey(c.teamA, c.teamB) === pairKey(r.teamA, r.teamB));
    if (!p) covWb.push(`${r.teamA}–${r.teamB} missing in fixtures`);
    else {
      const aH = p.teamA === r.teamA ? p.aAdminHome : p.bAdminHome;
      const bH = p.teamA === r.teamA ? p.bAdminHome : p.aAdminHome;
      if (aH !== r.aAdminHome || bH !== r.bAdminHome || p.meetings.length !== r.games5y) covWb.push(`${r.teamA}–${r.teamB}: fixtures ${aH}/${bH}/${p.meetings.length} vs workbook ${r.aAdminHome}/${r.bAdminHome}/${r.games5y}`);
      if ((r.coverage === "PASS") !== p.pass) covWb.push(`${r.teamA}–${r.teamB}: coverage flag differs`);
    }
  }
  out.push(check("ha-workbook", "`05 | Conference H-A` matches fixtures", 0, covWb.length, covWb));

  // Rivalry locks
  const lockIssues: string[] = [];
  for (const r of wb.rivalryLocks) {
    const ms = (ds.byPair.get(pairKey(r.teamA, r.teamB)) ?? []).filter((g) => g.season === r.year);
    if (ms.length !== 1) {
      lockIssues.push(`${r.year} ${r.teamA}–${r.teamB}: ${ms.length} fixtures`);
      continue;
    }
    const g = ms[0];
    if (g.week !== r.week || g.home !== r.home || g.away !== r.away || g.venue !== r.venue || g.siteType !== r.site || g.date !== r.date)
      lockIssues.push(`${r.year} ${r.teamA}–${r.teamB}: workbook W${r.week} ${r.away}@${r.home} vs fixture W${g.week} ${g.away}@${g.home}`);
  }
  const lockPairs = new Set(wb.rivalryLocks.map((r) => pairKey(r.teamA, r.teamB)));
  for (const k of lockPairs) {
    const seasons = new Set((ds.byPair.get(k) ?? []).map((g) => g.season));
    if (seasons.size !== 5) lockIssues.push(`${k}: only ${seasons.size} seasons`);
  }
  out.push(check("rivalry-locks", `Protected rivalry fixtures match \`07 | Rivalry Locks\` (${lockPairs.size} pairs × 5 seasons)`, 0, lockIssues.length, lockIssues));
  const crossRivals = [["Georgia", "Georgia Tech"], ["Florida", "Florida State"], ["Clemson", "South Carolina"], ["Kentucky", "Louisville"], ["Iowa", "Iowa State"], ["Pitt", "West Virginia"]];
  const crossMissing = crossRivals.filter(([a, b]) => (ds.byPair.get(pairKey(a, b)) ?? []).length !== 5).map(([a, b]) => `${a}–${b}`);
  out.push(check("cross-rivals", "Six cross-conference rivalries annual", 0, crossMissing.length, crossMissing));

  // Source vs display reconciliation
  const recon: string[] = [];
  const weekAppear = new Map<string, number>();
  for (const s of SEASONS) for (const w of WEEKS) for (const g of ds.byYearWeek.get(ywKey(s, w)) ?? []) weekAppear.set(g.id, (weekAppear.get(g.id) ?? 0) + 1);
  const teamAppear = new Map<string, number>();
  for (const s of SEASONS) for (const t of POWER_TEAMS) for (const x of teamSchedule(ds, t.name, s).games) teamAppear.set(x.game.id, (teamAppear.get(x.game.id) ?? 0) + 1);
  for (const g of games) {
    if (weekAppear.get(g.id) !== 1) recon.push(`${g.id}: on ${weekAppear.get(g.id) ?? 0} weekly boards`);
    const expectTeams = Number(g.homeIsPower) + Number(g.awayIsPower);
    if (expectTeams < 1) recon.push(`${g.id}: no Power participant`);
    if (teamAppear.get(g.id) !== expectTeams) recon.push(`${g.id}: in ${teamAppear.get(g.id) ?? 0} team schedules, expected ${expectTeams}`);
  }
  out.push(check("reconciliation", "Every fixture on exactly one weekly board and in each Power participant's schedule", 0, recon.length, recon));

  // Workbook overview KPIs
  const ov = Object.fromEntries(wb.overview.kpis.map((k) => [k.label, k.value]));
  const ovIssues: string[] = [];
  const derived: Record<string, number> = {
    TEAMS: powerInData.size,
    SEASONS: years.length,
    "GAMES / YEAR": (ds.byYear.get(2027) ?? []).length,
    "UNIQUE GAMES": games.length,
    "CONFERENCE GAMES / YEAR": (ds.byYear.get(2027) ?? []).filter((g) => g.type === "Conference").length,
    "NONCONF P4 GAMES / YEAR": (ds.byYear.get(2027) ?? []).filter((g) => g.type === "P4 nonconference").length,
    "G6 GAMES / YEAR": (ds.byYear.get(2027) ?? []).filter((g) => g.type === "G6").length,
    "CONFERENCE PAIRS VERIFIED": cov.filter((p) => p.pass).length,
    "RIVALRY GAMES VERIFIED": wb.rivalryLocks.length,
  };
  for (const [k, v] of Object.entries(derived)) if (ov[k] !== undefined && ov[k] !== v) ovIssues.push(`${k}: workbook ${ov[k]} vs derived ${v}`);
  for (const r of wb.overview.perYear) {
    const gs = ds.byYear.get(r.year) ?? [];
    const pub = gs.filter((g) => g.status === "Published").length;
    if (r.totalGames !== gs.length || r.publishedFixtures !== pub) ovIssues.push(`${r.year}: workbook ${r.totalGames}/${r.publishedFixtures} vs ${gs.length}/${pub}`);
  }
  out.push(check("overview", "`01 | Overview` KPIs match fixtures", 0, ovIssues.length, ovIssues));

  // Annual validation sheet
  const avIssues: string[] = [];
  if (wb.annualValidation.length !== 340) avIssues.push(`${wb.annualValidation.length} rows`);
  for (const r of wb.annualValidation) {
    const x = tg(r.team, r.year);
    const derivedRow = [x.length, x.filter((g) => g.game.type === "Conference").length, x.filter((g) => g.game.type !== "G6").length, x.filter((g) => g.game.type === "G6").length, x.filter((g) => g.site === "H").length, x.filter((g) => g.site === "A").length, x.filter((g) => g.site === "N").length, 14 - x.length];
    const wbRow = [r.games, r.confGames, r.p4Total, r.g6, r.home, r.away, r.neutral, r.byes];
    if (derivedRow.join() !== wbRow.join() || r.validation !== "PASS" || POWER_BY_NAME.get(r.team)?.conference !== r.conference)
      avIssues.push(`${r.year} ${r.team}: workbook [${wbRow}] ${r.validation} vs fixtures [${derivedRow}]`);
  }
  out.push(check("annual-validation", "`06 | Annual Validation` matches fixtures", 0, avIssues.length, avIssues));

  // G6 assignments sheet
  const g6Issues: string[] = [];
  for (const r of wb.g6Assignments) {
    const g = (ds.byPair.get(pairKey(r.powerTeam, r.g6Opponent)) ?? []).find((x) => x.season === r.year && x.type === "G6");
    if (!g) g6Issues.push(`${r.year} ${r.powerTeam}–${r.g6Opponent}: no fixture`);
    else if (g.week !== r.week || G6_BY_NAME.get(r.g6Opponent)?.league !== r.g6League) g6Issues.push(`${r.year} ${r.powerTeam}–${r.g6Opponent}: week/league differs`);
  }
  if (wb.g6Assignments.length !== 340) g6Issues.push(`${wb.g6Assignments.length} rows`);
  out.push(check("g6-workbook", "`11 | G6 Assignments` matches fixtures", 0, g6Issues.length, g6Issues));

  // Optional raw-sheet cross-checks (only during data:prepare)
  if (sheets.weeklyGames) {
    const issues: string[] = [];
    if (sheets.weeklyGames.length !== games.length) issues.push(`sheet has ${sheets.weeklyGames.length} rows`);
    const seenIds = new Set<string>();
    for (const r of sheets.weeklyGames) {
      const id = String(r["Game ID"]);
      seenIds.add(id);
      const g = ds.byId.get(id);
      if (!g) {
        issues.push(`${id}: not in JSON`);
        continue;
      }
      const same =
        Number(r.Year) === g.season && Number(r.Week) === g.week && r.Saturday === g.date && r.Home === g.home && r.Away === g.away &&
        r["Game Category"] === g.type && r.Venue === g.venue && r.Site === g.siteType && r.Origin === g.status &&
        (r["Source URL"] ?? "") === g.raw["Source URL"] && r["Conf / G6 League"] === g.categoryConference &&
        r["Home League"] === g.homeConference && r["Away League"] === g.awayConference;
      if (!same) issues.push(`${id}: workbook row differs from JSON`);
    }
    for (const g of games) if (!seenIds.has(g.id)) issues.push(`${g.id}: missing from workbook`);
    out.push(check("workbook-weekly", "`02 | Weekly Games` vs canonical JSON (ID, year, week, date, host, visitor, leagues, venue, status)", 0, issues.length, issues));
  }
  if (sheets.teamGames) {
    const issues: string[] = [];
    if (sheets.teamGames.length !== POWER_TEAMS.length * SEASONS.length * 12) issues.push(`sheet has ${sheets.teamGames.length} rows`);
    for (const r of sheets.teamGames) {
      const g = ds.byId.get(String(r["Game ID"]));
      if (!g) {
        issues.push(`${r["Game ID"]}: not in JSON`);
        continue;
      }
      const v = teamView(g, String(r.Team));
      if (v.opponent !== r.Opponent || v.site !== r["H/A/N"] || g.week !== Number(r.Week) || v.opponentConference !== r["Opponent League"])
        issues.push(`${r["Game ID"]} ${r.Team}: sheet ${r["H/A/N"]} ${r.Opponent} vs ${v.site} ${v.opponent}`);
    }
    out.push(check("workbook-team-games", "`04 | Team Games` (4,080 team rows) vs fixtures incl. H/A/N", 0, issues.length, issues));
  }
  if (sheets.teamCalendar) {
    const issues: string[] = [];
    for (const r of sheets.teamCalendar) {
      const sched = teamSchedule(ds, String(r.Team), Number(r.Year));
      for (const s of sched.slots) {
        const cell = String(r[`Week ${s.week}`] ?? "");
        if (!s.game) {
          if (cell !== "BYE") issues.push(`${r.Year} ${r.Team} W${s.week}: sheet "${cell}" vs BYE`);
        } else {
          const lead = s.game.site === "H" ? "vs " : s.game.site === "A" ? "@ " : "N ";
          if (!cell.startsWith(lead + s.game.opponent + " [")) issues.push(`${r.Year} ${r.Team} W${s.week}: sheet "${cell}" vs ${lead}${s.game.opponent}`);
        }
      }
    }
    out.push(check("workbook-calendar", "`03 | Team Calendar` byes and opponents vs fixtures", 0, issues.length, issues));
  }

  return out;
}
