import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { POWER_BY_NAME, SEASONS } from "@/lib/data/roster";
import { formatDate, type Game, type TeamGame } from "@/lib/model";
import { gameHref, programHref } from "@/lib/routes";
import type { WeekSlot } from "@/lib/selectors/team";
import { CategoryBadge, ConferenceChip, ProvenanceBadge, SiteBadge, TeamBadge, VenueChip, categoryAccent } from "./badges";
import { cn } from "./ui";

/** 14-slot Week 0–13 strip: opponent or BYE per week. Horizontally scrollable on small screens. */
export function SeasonStrip({ slots, team, season, compact }: { slots: WeekSlot[]; team: string; season: number; compact?: boolean }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="region" aria-label={`${team} ${season} week-by-week strip`} tabIndex={0}>
      <ol className={cn("grid min-w-[980px] grid-cols-14 gap-1.5", compact && "min-w-[860px]")} style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
        {slots.map((s) => {
          const tg = s.game;
          const label = tg
            ? `Week ${s.week}${s.date ? `, ${formatDate(s.date, { year: false })}` : ""}: ${tg.site === "H" ? "home vs" : tg.site === "A" ? "at" : "neutral site vs"} ${tg.opponent}, ${tg.game.type}`
            : `Week ${s.week}: bye`;
          return (
            <li key={s.week} className="min-w-0">
              {tg ? (
                <Link
                  href={gameHref(tg.game.id)}
                  aria-label={label}
                  className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface p-2 pt-2.5 transition-colors hover:border-ink-3"
                >
                  <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1", categoryAccent(tg.game.type))} />
                  <span className="tnum flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <span>Wk {s.week}</span>
                    {s.date && !compact && <span className="font-normal normal-case tracking-normal">{formatDate(s.date, { weekday: false, year: false })}</span>}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-ink-3">{tg.site === "H" ? "vs" : tg.site === "A" ? "@" : "N"}</span>
                    <TeamBadge name={tg.opponent} size="sm" />
                  </span>
                  <span className="mt-1 truncate text-[12px] font-semibold leading-tight text-ink" title={tg.opponent}>
                    {POWER_BY_NAME.get(tg.opponent)?.abbr && compact ? POWER_BY_NAME.get(tg.opponent)!.abbr : tg.opponent}
                  </span>
                  <span className="mt-auto pt-1.5">
                    <CategoryBadge type={tg.game.type} className="h-4 px-1 text-[9px]" />
                  </span>
                </Link>
              ) : (
                <div aria-label={label} className="hatch flex h-full min-h-[92px] flex-col rounded-lg border border-dashed border-line-strong p-2">
                  <span className="tnum flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <span>Wk {s.week}</span>
                    {s.date && !compact && <span className="font-normal normal-case tracking-normal">{formatDate(s.date, { weekday: false, year: false })}</span>}
                  </span>
                  <span className="m-auto font-display text-sm font-bold tracking-widest text-ink-3">BYE</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Team-perspective game list: table on desktop, stacked rows on mobile. */
export function ScheduleList({ games, season, showSeason }: { games: TeamGame[]; season: number; showSeason?: boolean }) {
  return (
    <div>
      <table className="hidden w-full text-sm md:table">
        <caption className="sr-only">Games in playing order</caption>
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
            {showSeason && <th scope="col" className="px-3 py-2 font-semibold">Season</th>}
            <th scope="col" className="px-3 py-2 font-semibold">Wk</th>
            <th scope="col" className="px-3 py-2 font-semibold">Modeled date</th>
            <th scope="col" className="px-3 py-2 font-semibold">Site</th>
            <th scope="col" className="px-3 py-2 font-semibold">Opponent</th>
            <th scope="col" className="px-3 py-2 font-semibold">Category</th>
            <th scope="col" className="px-3 py-2 font-semibold">Venue</th>
            <th scope="col" className="px-3 py-2 font-semibold">Provenance</th>
            <th scope="col" className="px-3 py-2"><span className="sr-only">Details</span></th>
          </tr>
        </thead>
        <tbody>
          {games.map((tg) => (
            <tr key={tg.game.id} className="print-break-avoid border-b border-line last:border-0 hover:bg-surface-2/60" data-testid="schedule-row">
              {showSeason && <td className="tnum px-3 py-2.5 text-ink-2">{tg.game.season}</td>}
              <td className="tnum px-3 py-2.5 font-semibold">{tg.game.week}</td>
              <td className="tnum whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(tg.game.date)}</td>
              <td className="px-3 py-2.5">
                <SiteBadge site={tg.site} />
              </td>
              <td className="px-3 py-2.5">
                <OpponentCell tg={tg} season={season} />
              </td>
              <td className="px-3 py-2.5">
                <CategoryBadge type={tg.game.type} />
              </td>
              <td className="max-w-[240px] px-3 py-2.5">
                <VenueChip game={tg.game} />
                {tg.site === "N" && <div className="mt-0.5 text-[11px] text-ink-3">Admin. {tg.adminSide} designation</div>}
              </td>
              <td className="px-3 py-2.5">
                <ProvenanceBadge status={tg.game.status} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <Link href={gameHref(tg.game.id)} className="no-print text-xs font-medium text-accent hover:underline" aria-label={`Details for ${tg.team} vs ${tg.opponent}`}>
                  Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ol className="divide-y divide-line md:hidden">
        {games.map((tg) => (
          <li key={tg.game.id} className="flex gap-3 py-3" data-testid="schedule-row-mobile">
            <div className="tnum w-12 shrink-0 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{showSeason ? tg.game.season : "Wk"}</div>
              <div className="font-display text-lg font-semibold">{tg.game.week}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SiteBadge site={tg.site} />
                <OpponentCell tg={tg} season={season} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="tnum text-xs text-ink-2">{formatDate(tg.game.date)}</span>
                <CategoryBadge type={tg.game.type} />
                <ProvenanceBadge status={tg.game.status} />
              </div>
              <VenueChip game={tg.game} className="mt-1 flex" />
              <Link href={gameHref(tg.game.id)} className="mt-1 block text-xs font-medium text-accent">
                Game details →
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function OpponentCell({ tg, season }: { tg: TeamGame; season: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TeamBadge name={tg.opponent} size="sm" />
      <span className="min-w-0">
        <Link href={programHref(tg.opponent, season)} className="block truncate font-semibold text-ink hover:text-accent hover:underline">
          {tg.opponent}
        </Link>
        <span className="flex items-center gap-1">
          <ConferenceChip conference={tg.opponentConference} />
          {!tg.opponentIsPower && <span className="text-[10px] text-ink-3">P4-model appearances only</span>}
        </span>
      </span>
    </span>
  );
}

function MatchupSide({ name, conf, role, season }: { name: string; conf: string; role: string; season: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <TeamBadge name={name} size="md" />
      <div className="min-w-0">
        <Link href={programHref(name, season)} className="block truncate font-semibold text-ink hover:text-accent hover:underline">
          {name}
        </Link>
        <div className="flex items-center gap-1.5">
          <ConferenceChip conference={conf} />
          <span className="text-[10px] uppercase tracking-wider text-ink-3">{role}</span>
        </div>
      </div>
    </div>
  );
}

/** League-wide matchup card used on the weekly board and elsewhere. */
export function MatchupCard({ game, season, showWeek }: { game: Game; season?: number; showWeek?: boolean }) {
  const s = season ?? game.season;
  return (
    <article className="print-break-avoid relative flex flex-col rounded-xl border border-line bg-surface p-3.5" data-testid="matchup-card" data-game-id={game.id}>
      <span aria-hidden="true" className={cn("absolute bottom-3 left-0 top-3 w-1 rounded-r", categoryAccent(game.type))} />
      <div className="flex items-center justify-between gap-2 pl-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge type={game.type} />
          <ProvenanceBadge status={game.status} />
        </div>
        <span className="tnum text-[11px] text-ink-3">{showWeek ? `${game.season} · Wk ${game.week}` : game.id}</span>
      </div>
      <div className="mt-3 grid gap-2 pl-1.5">
        <MatchupSide name={game.away} conf={game.awayConference} role={game.isNeutral ? "vs" : "away"} season={s} />
        <div className="flex items-center gap-2 pl-[46px] text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          {game.isNeutral ? <span className="text-accent">Neutral site</span> : <span>at</span>}
        </div>
        <MatchupSide name={game.home} conf={game.homeConference} role={game.isNeutral ? "admin. home" : "home"} season={s} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pl-1.5 pt-2.5">
        <VenueChip game={game} />
        <Link href={gameHref(game.id)} className="no-print shrink-0 text-xs font-medium text-accent hover:underline" aria-label={`Details: ${game.away} vs ${game.home}`}>
          Details
        </Link>
      </div>
    </article>
  );
}

/** Prev / next + direct season links, preserving the caller's path/query via `hrefFor`. */
export function SeasonSwitcher({ season, hrefFor, label = "Season" }: { season: number; hrefFor: (s: number) => string; label?: string }) {
  const idx = SEASONS.indexOf(season as (typeof SEASONS)[number]);
  const prev = SEASONS[idx - 1];
  const next = SEASONS[idx + 1];
  const arrow = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-2";
  return (
    <nav aria-label={label} className="no-print flex items-center gap-1">
      {prev ? (
        <Link href={hrefFor(prev)} className={arrow} aria-label={`Previous season (${prev})`} data-testid="season-prev">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-30")} aria-hidden="true">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      <div className="flex rounded-lg border border-line bg-surface p-0.5">
        {SEASONS.map((s) => (
          <Link
            key={s}
            href={hrefFor(s)}
            aria-current={s === season ? "page" : undefined}
            className={cn("tnum rounded-md px-2 py-1 text-[13px] font-semibold", s === season ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2")}
          >
            {s}
          </Link>
        ))}
      </div>
      {next ? (
        <Link href={hrefFor(next)} className={arrow} aria-label={`Next season (${next})`} data-testid="season-next">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-30")} aria-hidden="true">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

