/** Typed shape of `src/data/generated/workbook.json` (written by `npm run data:prepare`). */

export type ByYear = Record<string, number>;

export interface OverviewData {
  title: string;
  subtitle: string;
  kpis: { label: string; value: number }[];
  perYear: {
    year: number;
    teams: number;
    totalGames: number;
    conference: number;
    nonconferenceP4: number;
    g6: number;
    publishedFixtures: number;
    conferencePairsPassed: number;
    teamRulesPassed: number;
    repeatedP4NcPairs: number;
  }[];
  notes: string[];
}

export interface ConferenceHARow {
  conference: string;
  teamA: string;
  teamB: string;
  aAdminHome: number;
  bAdminHome: number;
  games5y: number;
  byYear: Record<string, string>;
  coverage: string;
  notes: string;
}

export interface AnnualValidationRow {
  year: number;
  team: string;
  conference: string;
  games: number;
  confGames: number;
  confRequired: number;
  p4Total: number;
  p4Nc: number;
  g6: number;
  home: number;
  away: number;
  neutral: number;
  byes: number;
  validation: string;
}

export interface RivalryLockRow {
  grouping: string;
  teamA: string;
  teamB: string;
  year: number;
  week: number;
  date: string;
  away: string;
  home: string;
  venue: string;
  site: string;
  origin: string;
  source: string;
}

export interface P4BalanceRow {
  leagueA: string;
  leagueB: string;
  byYear: ByYear;
  total: number;
  mean: number;
  range: number;
}

export interface TeamCrossplayRow {
  team: string;
  league: string;
  otherLeague: string;
  byYear: ByYear;
  total: number;
  distinct: number;
}

export interface RepeatAuditRow {
  teamA: string;
  teamB: string;
  leagueA: string;
  leagueB: string;
  timesMet: number;
  seasons: number[];
  interpretation: string;
}

export interface G6AssignmentRow {
  year: number;
  powerTeam: string;
  powerLeague: string;
  g6Opponent: string;
  g6League: string;
  powerState: string;
  g6State: string;
  affinity: string;
  site: string;
  week: number;
  date: string;
  venue: string;
  origin: string;
  source: string;
}

export interface ConferenceSourceRow {
  year: number;
  conference: string;
  members: number;
  conferenceGames: number;
  publishedLocked: number;
  modeledGames: number;
  coverage: number;
  note: string;
  sourceUrl: string;
}

export interface ContractExceptionRow {
  year: number;
  matchup: string;
  exceptionType: string;
  existing: string;
  treatment: string;
  why: string;
  sourceUrl: string;
}

export interface SourceRow {
  label: string;
  organization: string;
  url: string;
  coverage: string;
}

export interface AssumptionRow {
  rule: string;
  explanation: string;
}

export interface WorkbookData {
  file: string;
  sheetNames: string[];
  overview: OverviewData;
  conferenceHA: ConferenceHARow[];
  annualValidation: AnnualValidationRow[];
  rivalryLocks: RivalryLockRow[];
  p4Balance: P4BalanceRow[];
  teamCrossplay: TeamCrossplayRow[];
  repeatAudit: RepeatAuditRow[];
  g6Assignments: G6AssignmentRow[];
  conferenceSources: ConferenceSourceRow[];
  contractExceptions: ContractExceptionRow[];
  sources: SourceRow[];
  assumptions: AssumptionRow[];
}

/** One record of `data/g6_venue_overrides.json` (G6 home-campus rule audit). */
export interface G6VenueOverride {
  "Game ID": string;
  Year: number;
  Week: number;
  "Power Team": string;
  "G6 Opponent": string;
  Prior: { Home: string; Away: string; Venue: string; "Site type": string; Status: string; "Source URL": string };
  New: { Home: string; Away: string; Venue: string; "Site type": string; Status: string };
  "Override Reason": string;
}

export interface CheckResult {
  id: string;
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
  detail?: string[];
}

export interface ValidationReport {
  inputs: { file: string; bytes: number; sha256: string }[];
  counts: { games: number; seasons: number[]; powerTeams: number; g6Programs: number };
  checks: CheckResult[];
  originalSolverIssues: unknown[];
}

/** `data/model-version.json` — current model version and the extra rules it enforces. */
export interface ModelVersion {
  version: string;
  name: string;
  released: string;
  previous: { version: string; archive: string; description: string };
  rules: {
    minGamesBetweenByes: number;
    noConsecutiveNonconfRepeats: boolean;
    /** P4 non-conference pairs allowed to meet in consecutive seasons: [team A, team B, seasons] */
    repeatExceptions: [string, string, number[]][];
    /** Non-conference meetings the model must contain: [team A, team B, season] */
    requiredGames: [string, string, number][];
  };
  changes: string[];
  producedBy: string;
}

/** `src/data/generated/version.json` — the model version plus how it differs from the previous one. */
export interface VersionInfo extends ModelVersion {
  diff: {
    movedWeeks: Record<string, { from: number; to: number }>;
    newGameIds: string[];
    removed: { "Game ID": string; Year: number; Week: number; Home: string; Away: string; Status: string }[];
  };
}
