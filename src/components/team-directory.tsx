"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Star } from "lucide-react";
import { AFFILIATIONS, POWER_TEAMS, type Affiliation } from "@/lib/data/roster";
import { parseSeason, teamHref } from "@/lib/routes";
import { searchTeams, type SearchHit } from "@/lib/selectors/search";
import { ConferenceChip, TeamBadge } from "./badges";
import { useFavorites } from "./favorites";
import { ConferenceLogo } from "./logo";
import { cn, EmptyState } from "./ui";

export function TeamDirectory() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const season = parseSeason(sp.get("season"));
  const conf = (sp.get("conf") as Affiliation | null) ?? null;
  const [q, setQ] = useState(sp.get("q") ?? "");
  const favs = useFavorites();

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const t = setTimeout(() => (q !== (sp.get("q") ?? "") ? setParam("q", q || null) : undefined), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const pool = conf ? POWER_TEAMS.filter((t) => t.conference === conf) : POWER_TEAMS;
  const hits = searchTeams(q, pool);
  const grouped = q.trim() ? null : AFFILIATIONS.map((c) => ({ c, teams: hits.filter((h) => h.team.conference === c) })).filter((g) => g.teams.length);
  const favTeams = POWER_TEAMS.filter((t) => favs.includes(t.slug));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-96">
          <label htmlFor="team-search" className="sr-only">
            Search teams
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            id="team-search"
            data-testid="team-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, abbreviation or nickname (UGA, OSU, Hokies)…"
            className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by conference">
          {[null, ...AFFILIATIONS].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              aria-pressed={conf === c}
              onClick={() => setParam("conf", c)}
              className={cn("rounded-lg border px-2.5 py-1.5 text-[13px] font-medium", conf === c ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:bg-surface-2")}
            >
              <span className="flex items-center gap-1.5">
                {c && c !== "Independent" && <ConferenceLogo name={c} size="xs" />}
                {c ?? "All 68"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {favTeams.length > 0 && !q && !conf && (
        <section className="mb-8" aria-labelledby="fav-h">
          <h2 id="fav-h" className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Star className="h-3.5 w-3.5 fill-current text-accent" aria-hidden="true" /> Your favorites <span className="text-xs font-normal text-ink-3">(saved on this device only)</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {favTeams.map((t) => (
              <Tile key={t.slug} h={{ team: t, score: 0, reason: "" }} season={season} />
            ))}
          </ul>
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {hits.length} teams shown
      </p>
      {hits.length === 0 ? (
        <EmptyState title={`No program matches “${q}”`}>
          Only the 68 Power Four / Notre Dame programs have full schedules. G6 schools appear as opponents on team and week pages.
        </EmptyState>
      ) : grouped ? (
        <div className="space-y-8">
          {grouped.map(({ c, teams }) => (
            <section key={c} aria-labelledby={`h-${c}`}>
              <h2 id={`h-${c}`} className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                {c !== "Independent" && <ConferenceLogo name={c} size="sm" />}
                {c === "Independent" ? "Independent" : c}
                <span className="tnum text-sm font-normal text-ink-3">{teams.length}</span>
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {teams.map((h) => (
                  <Tile key={h.team.slug} h={h} season={season} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="search-results">
          {hits.map((h) => (
            <Tile key={h.team.slug} h={h} season={season} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Tile({ h, season }: { h: SearchHit; season: number }) {
  return (
    <li>
      <Link
        href={teamHref(h.team.slug, season)}
        className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-ink-3"
        data-testid="team-tile"
      >
        <TeamBadge name={h.team.name} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold group-hover:text-accent">{h.team.name}</span>
          <span className="block truncate text-xs text-ink-3">
            {h.team.nickname}
            {h.reason && h.reason !== "name" && <> · {h.reason}</>}
          </span>
        </span>
        <ConferenceChip conference={h.team.conference} />
      </Link>
    </li>
  );
}
