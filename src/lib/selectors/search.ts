/** Lightweight fuzzy team search (names, abbreviations, aliases, nicknames). */
import { POWER_TEAMS, type PowerTeam } from "../data/roster";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/&/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length;
}

export interface SearchHit {
  team: PowerTeam;
  score: number;
  reason: string;
}

export function scoreTeam(team: PowerTeam, query: string): SearchHit | null {
  const q = norm(query);
  if (!q) return { team, score: 1, reason: "" };
  const name = norm(team.name);
  const full = norm(team.fullName);
  const abbr = norm(team.abbr);
  const aliases = team.aliases.map(norm);
  const nick = norm(team.nickname);
  if (name === q || full === q) return { team, score: 100, reason: "name" };
  if (abbr === q || aliases.includes(q)) return { team, score: 90, reason: "abbreviation" };
  if (name.startsWith(q) || full.startsWith(q)) return { team, score: 80, reason: "name" };
  if (name.split(" ").some((w) => w.startsWith(q))) return { team, score: 70, reason: "name" };
  if (aliases.some((a) => a.startsWith(q)) || abbr.startsWith(q)) return { team, score: 60, reason: "abbreviation" };
  if (nick === q || nick.startsWith(q) || nick.split(" ").some((w) => w.startsWith(q))) return { team, score: 50, reason: `nickname: ${team.nickname}` };
  if (name.includes(q) || full.includes(q)) return { team, score: 40, reason: "name" };
  if (q.length >= 3 && isSubsequence(q.replace(/ /g, ""), name.replace(/ /g, ""))) return { team, score: 20, reason: "fuzzy" };
  return null;
}

export function searchTeams(query: string, teams: PowerTeam[] = POWER_TEAMS): SearchHit[] {
  return teams
    .map((t) => scoreTeam(t, query))
    .filter((h): h is SearchHit => h !== null)
    .sort((a, b) => b.score - a.score || a.team.name.localeCompare(b.team.name));
}
