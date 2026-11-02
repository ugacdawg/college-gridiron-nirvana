import { STATUS_INFO, teamView, type Game } from "../model";

export function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

const NOTE = "Hypothetical model scenario - not an official schedule. Dates are modeled Saturdays; kickoff times unknown.";

/** League-wide game rows (weekly board / any game list). */
export function gamesCsv(games: Game[]): string {
  return toCsv(
    ["Game ID", "Season", "Week", "Modeled date", "Away (admin)", "Away conference", "Home (admin)", "Home conference", "Category", "Category conference", "Site type", "Venue", "Status", "Status description", "Source URL", "Note"],
    games.map((g) => [
      g.id, g.season, g.week, g.date, g.away, g.awayConference, g.home, g.homeConference, g.type, g.categoryConference,
      g.siteType, g.venue, g.status, STATUS_INFO[g.status].label, g.sourceUrl ?? g.sourceNote ?? "", NOTE,
    ]),
  );
}

/** One team's schedule rows, from that team's perspective (H/A/N). */
export function teamScheduleCsv(team: string, games: Game[]): string {
  return toCsv(
    ["Team", "Season", "Week", "Modeled date", "Opponent", "Opponent conference", "H/A/N", "Category", "Venue", "Status", "Game ID", "Source URL", "Note"],
    games.map((g) => {
      const v = teamView(g, team);
      return [team, g.season, g.week, g.date, v.opponent, v.opponentConference, v.site, g.type, g.venue, g.status, g.id, g.sourceUrl ?? g.sourceNote ?? "", NOTE];
    }),
  );
}
