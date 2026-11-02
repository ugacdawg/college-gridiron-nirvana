import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WeekBoard } from "@/components/week-board";
import { cn } from "@/components/ui";
import { ywKey, dataset } from "@/lib/data";
import { FIRST_SEASON, LAST_SEASON, SEASONS, WEEKS } from "@/lib/data/roster";
import { formatDate } from "@/lib/model";
import { weekHref } from "@/lib/routes";
import { stepWeek } from "@/lib/selectors/week";

type Props = { params: Promise<{ year: string; week: string }>; searchParams: Promise<Record<string, string | undefined>> };

function parse(year: string, week: string) {
  const y = Number(year);
  const w = Number(week);
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(week) || y < FIRST_SEASON || y > LAST_SEASON || w < 0 || w > 13) return null;
  return { y, w };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, week } = await params;
  return { title: `${year} Week ${week} game board` };
}

export default async function WeekPage({ params, searchParams }: Props) {
  const [{ year, week }, sp] = await Promise.all([params, searchParams]);
  const p = parse(year, week);
  if (!p) notFound();
  const { y, w } = p;
  const games = dataset.byYearWeek.get(ywKey(y, w)) ?? [];
  const date = games[0]?.date;
  const qs = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  const prev = stepWeek(y, w, -1);
  const next = stepWeek(y, w, 1);
  const arrow = "inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2";

  return (
    <div>
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow mb-1.5">Weekly game board · every modeled game, once</div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]" data-testid="week-title">
            {y} · Week {w}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {date ? (
              <>
                <span className="tnum font-medium text-ink">{formatDate(date)}</span> — modeled Saturday; no kickoff times are modeled.
              </>
            ) : (
              "No games in this week."
            )}
          </p>
        </div>
        <nav aria-label="Week navigation" className="no-print flex flex-wrap items-center gap-2">
          {prev ? (
            <Link href={weekHref(prev.year, prev.week, qs)} className={arrow} data-testid="week-prev" rel="prev">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {prev.year !== y ? `${prev.year} Wk ${prev.week}` : `Wk ${prev.week}`}
            </Link>
          ) : (
            <span className={cn(arrow, "opacity-40")} title="Start of the 2027–2031 dataset">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Start
            </span>
          )}
          {next ? (
            <Link href={weekHref(next.year, next.week, qs)} className={arrow} data-testid="week-next" rel="next">
              {next.year !== y ? `${next.year} Wk ${next.week}` : `Wk ${next.week}`}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className={cn(arrow, "opacity-40")} title="End of the 2027–2031 dataset">
              End <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </nav>
      </header>

      <div className="no-print mb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Season">
          {SEASONS.map((s) => (
            <Link
              key={s}
              href={weekHref(s, w, qs)}
              aria-current={s === y ? "page" : undefined}
              className={cn("tnum rounded-md border px-2.5 py-1 text-[13px] font-semibold", s === y ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:bg-surface-2")}
            >
              {s}
            </Link>
          ))}
        </div>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-1" role="group" aria-label="Week">
            {WEEKS.map((wk) => {
              const n = dataset.byYearWeek.get(ywKey(y, wk))?.length ?? 0;
              return (
                <Link
                  key={wk}
                  href={weekHref(y, wk, qs)}
                  aria-current={wk === w ? "page" : undefined}
                  aria-label={`Week ${wk}, ${n} games`}
                  className={cn(
                    "tnum flex w-14 flex-col items-center rounded-lg border py-1.5",
                    wk === w ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink-2 hover:bg-surface-2",
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Wk</span>
                  <span className="font-display text-base font-semibold leading-tight">{wk}</span>
                  <span className="text-[10px] text-ink-3">{n} g</span>
                </Link>
              );
            })}
          </div>
        </div>
        <p className="text-[11px] text-ink-3">Prev/next crosses seasons: Week 13 → next season’s Week 0. Filters in the URL carry over.</p>
      </div>

      <Suspense>
        <WeekBoard games={games} year={y} week={w} />
      </Suspense>
    </div>
  );
}
