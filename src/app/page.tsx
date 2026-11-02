import Link from "next/link";
import { ArrowRight, CalendarRange, GitCompareArrows, Network, Search, Swords, ShieldCheck } from "lucide-react";
import { CategoryBadge, ProvenanceBadge, TeamBadge } from "@/components/badges";
import { SeasonSwitcher } from "@/components/schedule";
import { Card, CardHeader, cn, Stat } from "@/components/ui";
import { dataset, validationReport, versionInfo, ywKey } from "@/lib/data";
import { POWER_TEAMS, WEEKS } from "@/lib/data/roster";
import { formatDate } from "@/lib/model";
import { gameHref, parseSeason, weekHref } from "@/lib/routes";
import { rivalrySlug } from "@/lib/selectors/rivalries";
import { rivalries } from "@/lib/data/derived";

const FEATURED: [string, string][] = [
  ["Michigan", "Ohio State"],
  ["Oklahoma", "Texas"],
  ["Alabama", "Auburn"],
  ["Florida", "Georgia"],
  ["Navy", "Notre Dame"],
  ["Pitt", "West Virginia"],
  ["Clemson", "South Carolina"],
  ["BYU", "Utah"],
];

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const season = parseSeason(sp.season);
  const games = dataset.byYear.get(season) ?? [];
  const participants = new Set(games.flatMap((g) => [g.home, g.away]).filter((t) => POWER_TEAMS.some((p) => p.name === t)));
  const kpis = [
    { label: "Unique games", value: games.length, hint: "each fixture counted once" },
    { label: "P4 / ND programs", value: participants.size, hint: "67 conference + Notre Dame" },
    { label: "Conference", value: games.filter((g) => g.type === "Conference").length, hint: "league games" },
    { label: "P4 nonconference", value: games.filter((g) => g.type === "P4 nonconference").length, hint: "incl. all ND P4 games" },
    { label: "G6 matchups", value: games.filter((g) => g.type === "G6").length, hint: "one per program" },
    { label: "Published", value: games.filter((g) => g.status === "Published").length, hint: "matchup/site from a source" },
  ];
  const passed = validationReport.checks.filter((c) => c.pass).length;
  const featured = FEATURED.map(([a, b]) => {
    const r = rivalries.find((x) => x.slug === rivalrySlug(a, b));
    return { r, game: r?.games.find((g) => g.season === season) ?? null };
  }).filter((x) => x.r);
  const dateOf = (w: number) => dataset.byYearWeek.get(ywKey(season, w))?.[0]?.date;

  const shortcuts = [
    { href: `/teams?season=${season}`, label: "Find a team", desc: "Any of 68 programs, week by week", Icon: Search },
    { href: weekHref(season, 0), label: "Browse a week", desc: "Every game in a Week 0–13 slot", Icon: CalendarRange },
    { href: `/rivalries?season=${season}`, label: "Rivalries", desc: "Locks, hiatuses & neutral sites", Icon: Swords },
    { href: `/conferences?season=${season}`, label: "Conference rotations", desc: "Five-year home-and-away coverage", Icon: Network },
    { href: `/compare?season=${season}`, label: "Compare teams", desc: "Side-by-side structure & meetings", Icon: GitCompareArrows },
  ];

  return (
    <div className="space-y-8">
      <section className="yardlines relative overflow-hidden rounded-2xl border border-line bg-surface px-5 py-8 sm:px-8 sm:py-10">
        <div className="relative max-w-3xl">
          <div className="eyebrow mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-accent/40 bg-accent-soft px-1.5 py-0.5 font-bold text-accent">Scenario · not official</span>
            <span>Power Four + Notre Dame · 2027–2031</span>
            <Link href="/methodology#version" className="rounded-md border border-line px-1.5 py-0.5 font-bold text-ink-2 hover:text-ink" data-testid="model-version">
              Model v{versionInfo.version}
            </Link>
          </div>
          <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl" data-testid="app-title">
            College Gridiron Nirvana
          </h1>
          <p className="mt-2 font-display text-xl font-medium tracking-tight text-ink-2 sm:text-2xl">Five seasons. Every team. Every game.</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            A counterfactual schedule from a published-commitment-anchored optimization model — {dataset.games.length.toLocaleString()} unique fixtures across 68 programs. Dates are modeled Saturdays. No scores, kickoff times, TV or rankings exist here, and none are invented.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SeasonSwitcher season={season} hrefFor={(s) => `/?season=${s}`} />
            <Link href={`/teams?season=${season}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-bg hover:opacity-90">
              <Search className="h-4 w-4" aria-hidden="true" /> Find a team
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="kpi-h">
        <h2 id="kpi-h" className="eyebrow mb-3">
          {season} season · derived from the fixture feed
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <Stat key={k.label} label={k.label} value={k.value} hint={k.hint} />
          ))}
        </div>
      </section>

      <section aria-label="Shortcuts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {shortcuts.map(({ href, label, desc, Icon }) => (
          <Link key={label} href={href} className="group flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-ink-3">
            <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
            <span className="mt-3 flex items-center gap-1 font-semibold">
              {label} <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </span>
            <span className="mt-0.5 text-xs text-ink-3">{desc}</span>
          </Link>
        ))}
      </section>

      <Card>
        <CardHeader eyebrow={`${season} · choose a week`} title="Week control" action={<Link href={weekHref(season, 0)} className="text-sm font-medium text-accent hover:underline">Open Week 0 →</Link>} />
        <div className="-mx-px overflow-x-auto p-4 sm:p-5">
          <ol className="flex min-w-max gap-1.5">
            {WEEKS.map((w) => {
              const n = dataset.byYearWeek.get(ywKey(season, w))?.length ?? 0;
              const d = dateOf(w);
              return (
                <li key={w}>
                  <Link href={weekHref(season, w)} className={cn("tnum flex w-[74px] flex-col rounded-lg border border-line bg-surface-2/40 p-2 hover:border-ink-3", w === 0 && "border-accent")}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Week</span>
                    <span className="font-display text-xl font-semibold leading-none">{w}</span>
                    <span className="mt-1 text-[11px] text-ink-2">{d ? formatDate(d, { weekday: false, year: false }) : "—"}</span>
                    <span className="text-[11px] text-ink-3">{n} games</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <section aria-labelledby="riv-h">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="riv-h" className="font-display text-lg font-semibold">
            Notable rivalries in {season}
          </h2>
          <Link href={`/rivalries?season=${season}`} className="text-sm font-medium text-accent hover:underline">
            All rivalries →
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map(({ r, game }) => (
            <li key={r!.slug} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <TeamBadge name={r!.teamA} size="sm" />
                <TeamBadge name={r!.teamB} size="sm" />
                <Link href={`/rivalries/${r!.slug}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                  {r!.name ?? `${r!.teamA}–${r!.teamB}`}
                </Link>
              </div>
              {game ? (
                <Link href={gameHref(game.id)} className="mt-3 block rounded-lg bg-surface-2/60 p-2.5 hover:bg-surface-2">
                  <span className="block text-sm font-medium">
                    {game.away} {game.isNeutral ? "vs" : "at"} {game.home}
                  </span>
                  <span className="tnum mt-0.5 block text-xs text-ink-2">
                    Week {game.week} · {formatDate(game.date)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-3">{game.isNeutral ? `Neutral · ${game.venue}` : game.venue}</span>
                  <span className="mt-2 flex gap-1.5">
                    <CategoryBadge type={game.type} />
                    <ProvenanceBadge status={game.status} />
                  </span>
                </Link>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-line-strong p-2.5 text-sm text-ink-2">No modeled meeting in {season}.</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Link href="/methodology#validation" className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-sm hover:border-ok/60">
        <ShieldCheck className="h-5 w-5 shrink-0 text-ok" aria-hidden="true" />
        <span>
          <strong>{passed} of {validationReport.checks.length} data checks pass</strong> on the supplied files — 12 games per team-season, 2 byes, 529/529 home-and-away pairs, rivalry locks and workbook ↔ JSON reconciliation.
        </span>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />
      </Link>
    </div>
  );
}
