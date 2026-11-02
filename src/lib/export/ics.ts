/**
 * RFC 5545 calendar export. Events are ALL-DAY, date-only (VALUE=DATE) on the modeled Saturday —
 * no kickoff times are invented. UIDs are stable per Game ID + team.
 */
import { nextDay, STATUS_INFO, teamView, type Game } from "../model";

export function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (curBytes + b > limit) {
      out.push(cur);
      cur = "";
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const compact = (iso: string) => iso.replace(/-/g, "");

export function stampFrom(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function teamScheduleIcs(team: string, games: Game[], opts: { dtstamp?: string; origin?: string } = {}): string {
  const dtstamp = opts.dtstamp ?? stampFrom(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//College Gridiron Nirvana//2027-2031 Scenario//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(`${team} — modeled schedule (hypothetical)`)}`,
  ];
  for (const g of games) {
    const v = teamView(g, team);
    const prefix = v.site === "H" ? "vs" : v.site === "A" ? "at" : "vs (neutral)";
    const summary = `${team} ${prefix} ${v.opponent} [modeled]`;
    const desc = [
      "Hypothetical scenario — not an official schedule.",
      "Modeled date; kickoff time unknown (all-day placeholder).",
      `Week ${g.week} · ${g.type}${g.isNeutral ? ` · Neutral site (administrative home: ${g.home})` : ""}`,
      `Status: ${STATUS_INFO[g.status].label}`,
      g.sourceUrl ? `Source: ${g.sourceUrl}` : "",
      `Game ID: ${g.id}`,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${g.id}-${team.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@college-gridiron-nirvana.scenario`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(g.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(g.date))}`,
      `SUMMARY:${icsEscape(summary)}`,
      `LOCATION:${icsEscape(g.venue)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      "TRANSP:TRANSPARENT",
      "STATUS:TENTATIVE",
      ...(opts.origin ? [`URL:${opts.origin}/games/${g.id}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
