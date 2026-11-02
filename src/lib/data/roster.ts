/**
 * Participant roster for the 2027–2031 scenario.
 *
 * Mirrors `CONF` (+ Notre Dame) and `G6` in `source/.../cfb_model.py`. `npm run data:prepare`
 * cross-checks this table against the workbook (`06 | Annual Validation`, `11 | G6 Assignments`)
 * and, when the source ZIP is present, against the Python source itself — it fails if they drift.
 */

export const SEASONS = [2027, 2028, 2029, 2030, 2031] as const;
export type Season = (typeof SEASONS)[number];
export const WEEKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export const FIRST_SEASON = 2027;
export const LAST_SEASON = 2031;
export const FIRST_WEEK = 0;
export const LAST_WEEK = 13;

export const POWER_CONFERENCES = ["SEC", "Big Ten", "Big 12", "ACC"] as const;
export type PowerConference = (typeof POWER_CONFERENCES)[number];
export type Affiliation = PowerConference | "Independent";
export const AFFILIATIONS: Affiliation[] = [...POWER_CONFERENCES, "Independent"];

export const G6_LEAGUES = ["American", "CUSA", "MAC", "Mountain West", "Pac-12", "Sun Belt"] as const;
export type G6League = (typeof G6_LEAGUES)[number];

export const CONFERENCE_MEMBERS: Record<PowerConference, string[]> = {
  SEC: ["Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Mississippi State", "Missouri", "Ole Miss", "Oklahoma", "South Carolina", "Tennessee", "Texas", "Texas A&M", "Vanderbilt"],
  "Big Ten": ["Illinois", "Indiana", "Iowa", "Maryland", "Michigan", "Michigan State", "Minnesota", "Nebraska", "Northwestern", "Ohio State", "Oregon", "Penn State", "Purdue", "Rutgers", "UCLA", "USC", "Washington", "Wisconsin"],
  "Big 12": ["Arizona", "Arizona State", "Baylor", "BYU", "Cincinnati", "Colorado", "Houston", "Iowa State", "Kansas", "Kansas State", "Oklahoma State", "TCU", "Texas Tech", "UCF", "Utah", "West Virginia"],
  ACC: ["Boston College", "California", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami", "North Carolina", "NC State", "Pitt", "SMU", "Stanford", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest"],
};

export const INDEPENDENTS = ["Notre Dame"] as const;

/** Non-Power FBS programs that appear in the model, by league (Pac-12 is G6 in this scenario). */
export const G6_MEMBERS: Record<G6League, string[]> = {
  American: ["Army", "Charlotte", "East Carolina", "Florida Atlantic", "Memphis", "Navy", "North Texas", "Rice", "South Florida", "Temple", "Tulane", "Tulsa", "UAB", "UTSA"],
  CUSA: ["Delaware", "FIU", "Jacksonville State", "Kennesaw State", "Liberty", "Louisiana Tech", "Middle Tennessee", "Missouri State", "New Mexico State", "Sam Houston", "Western Kentucky"],
  MAC: ["Akron", "Ball State", "Bowling Green", "Buffalo", "Central Michigan", "Eastern Michigan", "Kent State", "Miami (OH)", "Ohio", "Toledo", "UMass", "Western Michigan"],
  "Mountain West": ["Air Force", "Hawaii", "Nevada", "New Mexico", "Northern Illinois", "San Jose State", "UNLV", "UTEP", "Wyoming"],
  "Pac-12": ["Boise State", "Colorado State", "Fresno State", "Oregon State", "San Diego State", "Texas State", "Utah State", "Washington State"],
  "Sun Belt": ["Appalachian State", "Arkansas State", "Coastal Carolina", "Georgia Southern", "Georgia State", "James Madison", "Louisiana", "Louisiana-Monroe", "Marshall", "Old Dominion", "South Alabama", "Southern Miss", "Troy"],
};

/** ACC member playing eight (not nine) conference games each season. Only 2027 is sourced as published. */
export const ACC_EIGHT_GAME: Record<Season, { team: string; basis: "Published" | "Modeled assumption" }> = {
  2027: { team: "Clemson", basis: "Published" },
  2028: { team: "Stanford", basis: "Modeled assumption" },
  2029: { team: "SMU", basis: "Modeled assumption" },
  2030: { team: "California", basis: "Modeled assumption" },
  2031: { team: "Boston College", basis: "Modeled assumption" },
};

interface TeamExtra {
  abbr: string;
  nickname: string;
  state: string;
  aliases?: string[];
  fullName?: string;
}

/** Display metadata (monogram abbreviation, nickname, home state from cfb_model.py `ST`, search aliases). */
const POWER_EXTRA: Record<string, TeamExtra> = {
  Alabama: { abbr: "ALA", nickname: "Crimson Tide", state: "AL", aliases: ["bama", "ua"] },
  Arkansas: { abbr: "ARK", nickname: "Razorbacks", state: "AR", aliases: ["hogs"] },
  Auburn: { abbr: "AUB", nickname: "Tigers", state: "AL", aliases: ["au"] },
  Florida: { abbr: "FLA", nickname: "Gators", state: "FL", aliases: ["uf"] },
  Georgia: { abbr: "UGA", nickname: "Bulldogs", state: "GA", aliases: ["uga", "dawgs"] },
  Kentucky: { abbr: "UK", nickname: "Wildcats", state: "KY", aliases: ["uk"] },
  LSU: { abbr: "LSU", nickname: "Tigers", state: "LA", fullName: "Louisiana State" },
  "Mississippi State": { abbr: "MSST", nickname: "Bulldogs", state: "MS", aliases: ["msu", "miss st", "msstate"] },
  Missouri: { abbr: "MIZ", nickname: "Tigers", state: "MO", aliases: ["mizzou", "mu"] },
  "Ole Miss": { abbr: "MISS", nickname: "Rebels", state: "MS", aliases: ["mississippi", "um"] },
  Oklahoma: { abbr: "OU", nickname: "Sooners", state: "OK", aliases: ["ou"] },
  "South Carolina": { abbr: "SC", nickname: "Gamecocks", state: "SC", aliases: ["scar", "sc", "usc gamecocks"] },
  Tennessee: { abbr: "TENN", nickname: "Volunteers", state: "TN", aliases: ["ut", "vols"] },
  Texas: { abbr: "TEX", nickname: "Longhorns", state: "TX", aliases: ["ut", "horns"] },
  "Texas A&M": { abbr: "TAMU", nickname: "Aggies", state: "TX", aliases: ["tamu", "a&m", "texas am"] },
  Vanderbilt: { abbr: "VAN", nickname: "Commodores", state: "TN", aliases: ["vandy"] },
  Illinois: { abbr: "ILL", nickname: "Fighting Illini", state: "IL", aliases: ["illini"] },
  Indiana: { abbr: "IND", nickname: "Hoosiers", state: "IN", aliases: ["iu"] },
  Iowa: { abbr: "IOWA", nickname: "Hawkeyes", state: "IA" },
  Maryland: { abbr: "MD", nickname: "Terrapins", state: "MD", aliases: ["umd", "terps"] },
  Michigan: { abbr: "MICH", nickname: "Wolverines", state: "MI", aliases: ["um", "umich"] },
  "Michigan State": { abbr: "MSU", nickname: "Spartans", state: "MI", aliases: ["msu", "mich st"] },
  Minnesota: { abbr: "MINN", nickname: "Golden Gophers", state: "MN", aliases: ["gophers"] },
  Nebraska: { abbr: "NEB", nickname: "Cornhuskers", state: "NE", aliases: ["huskers", "unl"] },
  Northwestern: { abbr: "NU", nickname: "Wildcats", state: "IL", aliases: ["nu"] },
  "Ohio State": { abbr: "OSU", nickname: "Buckeyes", state: "OH", aliases: ["osu", "tosu"] },
  Oregon: { abbr: "ORE", nickname: "Ducks", state: "OR", aliases: ["uo"] },
  "Penn State": { abbr: "PSU", nickname: "Nittany Lions", state: "PA", aliases: ["psu"] },
  Purdue: { abbr: "PUR", nickname: "Boilermakers", state: "IN", aliases: ["boilers"] },
  Rutgers: { abbr: "RUTG", nickname: "Scarlet Knights", state: "NJ", aliases: ["ru"] },
  UCLA: { abbr: "UCLA", nickname: "Bruins", state: "CA" },
  USC: { abbr: "USC", nickname: "Trojans", state: "CA", fullName: "University of Southern California", aliases: ["southern cal", "southern california"] },
  Washington: { abbr: "UW", nickname: "Huskies", state: "WA", aliases: ["uw", "udub"] },
  Wisconsin: { abbr: "WIS", nickname: "Badgers", state: "WI", aliases: ["uw", "wisc"] },
  Arizona: { abbr: "ARIZ", nickname: "Wildcats", state: "AZ", aliases: ["ua", "zona"] },
  "Arizona State": { abbr: "ASU", nickname: "Sun Devils", state: "AZ", aliases: ["asu"] },
  Baylor: { abbr: "BAY", nickname: "Bears", state: "TX", aliases: ["bu"] },
  BYU: { abbr: "BYU", nickname: "Cougars", state: "UT", fullName: "Brigham Young" },
  Cincinnati: { abbr: "CIN", nickname: "Bearcats", state: "OH", aliases: ["cincy", "uc"] },
  Colorado: { abbr: "COLO", nickname: "Buffaloes", state: "CO", aliases: ["cu", "buffs"] },
  Houston: { abbr: "HOU", nickname: "Cougars", state: "TX", aliases: ["uh"] },
  "Iowa State": { abbr: "ISU", nickname: "Cyclones", state: "IA", aliases: ["isu"] },
  Kansas: { abbr: "KU", nickname: "Jayhawks", state: "KS", aliases: ["ku"] },
  "Kansas State": { abbr: "KSU", nickname: "Wildcats", state: "KS", aliases: ["ksu", "k-state", "kstate"] },
  "Oklahoma State": { abbr: "OKST", nickname: "Cowboys", state: "OK", aliases: ["osu", "okst", "ok state", "pokes"] },
  TCU: { abbr: "TCU", nickname: "Horned Frogs", state: "TX", fullName: "Texas Christian" },
  "Texas Tech": { abbr: "TTU", nickname: "Red Raiders", state: "TX", aliases: ["ttu"] },
  UCF: { abbr: "UCF", nickname: "Knights", state: "FL", fullName: "Central Florida" },
  Utah: { abbr: "UTAH", nickname: "Utes", state: "UT" },
  "West Virginia": { abbr: "WVU", nickname: "Mountaineers", state: "WV", aliases: ["wvu"] },
  "Boston College": { abbr: "BC", nickname: "Eagles", state: "MA", aliases: ["bc"] },
  California: { abbr: "CAL", nickname: "Golden Bears", state: "CA", aliases: ["cal", "berkeley"] },
  Clemson: { abbr: "CLEM", nickname: "Tigers", state: "SC" },
  Duke: { abbr: "DUKE", nickname: "Blue Devils", state: "NC" },
  "Florida State": { abbr: "FSU", nickname: "Seminoles", state: "FL", aliases: ["fsu", "noles"] },
  "Georgia Tech": { abbr: "GT", nickname: "Yellow Jackets", state: "GA", aliases: ["gt", "tech"] },
  Louisville: { abbr: "LOU", nickname: "Cardinals", state: "KY", aliases: ["uofl", "ul"] },
  Miami: { abbr: "MIA", nickname: "Hurricanes", state: "FL", fullName: "Miami (FL)", aliases: ["miami fl", "the u", "canes"] },
  "North Carolina": { abbr: "UNC", nickname: "Tar Heels", state: "NC", aliases: ["unc"] },
  "NC State": { abbr: "NCSU", nickname: "Wolfpack", state: "NC", aliases: ["ncsu", "north carolina state"] },
  Pitt: { abbr: "PITT", nickname: "Panthers", state: "PA", aliases: ["pittsburgh"] },
  SMU: { abbr: "SMU", nickname: "Mustangs", state: "TX", fullName: "Southern Methodist" },
  Stanford: { abbr: "STAN", nickname: "Cardinal", state: "CA" },
  Syracuse: { abbr: "SYR", nickname: "Orange", state: "NY", aliases: ["cuse"] },
  Virginia: { abbr: "UVA", nickname: "Cavaliers", state: "VA", aliases: ["uva", "hoos"] },
  "Virginia Tech": { abbr: "VT", nickname: "Hokies", state: "VA", aliases: ["vt", "vatech"] },
  "Wake Forest": { abbr: "WAKE", nickname: "Demon Deacons", state: "NC", aliases: ["wake", "wfu"] },
  "Notre Dame": { abbr: "ND", nickname: "Fighting Irish", state: "IN", aliases: ["nd", "irish"] },
};

export interface PowerTeam {
  name: string;
  slug: string;
  conference: Affiliation;
  abbr: string;
  nickname: string;
  state: string;
  fullName: string;
  aliases: string[];
}

export interface G6Team {
  name: string;
  slug: string;
  league: G6League;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const POWER_TEAMS: PowerTeam[] = [
  ...POWER_CONFERENCES.flatMap((c) => CONFERENCE_MEMBERS[c].map((name) => ({ name, conference: c as Affiliation }))),
  ...INDEPENDENTS.map((name) => ({ name, conference: "Independent" as Affiliation })),
].map(({ name, conference }) => {
  const extra = POWER_EXTRA[name];
  if (!extra) throw new Error(`Roster metadata missing for ${name}`);
  return {
    name,
    slug: slugify(name),
    conference,
    abbr: extra.abbr,
    nickname: extra.nickname,
    state: extra.state,
    fullName: extra.fullName ?? name,
    aliases: extra.aliases ?? [],
  };
});

export const G6_TEAMS: G6Team[] = G6_LEAGUES.flatMap((league) =>
  G6_MEMBERS[league].map((name) => ({ name, slug: slugify(name), league })),
);

export const POWER_BY_NAME = new Map(POWER_TEAMS.map((t) => [t.name, t]));
export const POWER_BY_SLUG = new Map(POWER_TEAMS.map((t) => [t.slug, t]));
export const G6_BY_NAME = new Map(G6_TEAMS.map((t) => [t.name, t]));
export const G6_BY_SLUG = new Map(G6_TEAMS.map((t) => [t.slug, t]));

export function isPowerTeam(name: string): boolean {
  return POWER_BY_NAME.has(name);
}

/** Conference affiliation for any program in the model (Power conference, Independent, or G6 league). */
export function affiliationOf(name: string): string {
  return POWER_BY_NAME.get(name)?.conference ?? G6_BY_NAME.get(name)?.league ?? "Unknown";
}

export function conferenceSlug(c: Affiliation): string {
  return slugify(c);
}

export const CONFERENCE_BY_SLUG = new Map<string, PowerConference>(
  POWER_CONFERENCES.map((c) => [slugify(c), c]),
);

export function expectedConferenceGames(team: string, season: number): number {
  const t = POWER_BY_NAME.get(team);
  if (!t) throw new Error(`Not a Power participant: ${team}`);
  if (t.conference === "Independent") return 0;
  if (t.conference === "ACC" && ACC_EIGHT_GAME[season as Season]?.team === team) return 8;
  return 9;
}
