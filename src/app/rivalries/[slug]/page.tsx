import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge, ProvenanceBadge, TeamBadge } from "@/components/badges";
import { Callout, Card, CardHeader, cn, ExternalLink } from "@/components/ui";
import { workbook } from "@/lib/data";
import { SEASONS } from "@/lib/data/roster";
import { formatDate, isHttpUrl, pairKey } from "@/lib/model";
import { gameHref, parseSeason, programHref, weekHref } from "@/lib/routes";
import { rivalries } from "@/lib/data/derived";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = rivalries.find((x) => x.slug === slug);
  return { title: r ? (r.name ?? `${r.teamA}–${r.teamB}`) : "Rivalry not found" };
}

export default async function RivalryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const r = rivalries.find((x) => x.slug === slug);
  if (!r) notFound();
  const season = parseSeason(sp.season);
  const exceptions = workbook.contractExceptions.filter((e) => {
    const names = e.matchup.split("–").map((s) => s.trim());
    return names.length === 2 && pairKey(names[0], names[1]) === pairKey(r.teamA, r.teamB);
  });
  const status = r.annualExpected
    ? r.seasonsMissing.length === 0
      ? { label: "Preserved — played all five seasons", tone: "ok" as const }
      : { label: `Expected annually but missing ${r.seasonsMissing.join(", ")}`, tone: "warn" as const }
    : r.seasonsPresent.length
      ? { label: `Not annual in this scenario — modeled in ${r.seasonsPresent.join(", ")}`, tone: "info" as const }
      : { label: "No modeled meeting 2027–2031", tone: "info" as const };

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="no-print text-xs text-ink-3">
        <Link href={`/rivalries?season=${season}`} className="hover:text-ink">
          Rivalries
        </Link>{" "}
        / <span className="text-ink-2">{r.name ?? `${r.teamA}–${r.teamB}`}</span>
      </nav>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex -space-x-2">
          <TeamBadge name={r.teamA} size="xl" className="ring-4 ring-bg" />
          <TeamBadge name={r.teamB} size="xl" className="ring-4 ring-bg" />
        </div>
        <div>
          <div className="eyebrow mb-1">
            {r.kind} · {r.grouping}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{r.name ?? `${r.teamA} – ${r.teamB}`}</h1>
          <p className="mt-0.5 text-sm text-ink-2">
            <Link href={programHref(r.teamA, season)} className="hover:underline">
              {r.teamA}
            </Link>{" "}
            vs{" "}
            <Link href={programHref(r.teamB, season)} className="hover:underline">
              {r.teamB}
            </Link>
          </p>
        </div>
      </header>

      <Callout tone={status.tone} title={status.label}>
        {r.note ?? (r.annualExpected ? "Locked as an annual fixture by the scheduling model. Site rotation and week are model outputs unless a source pinned them." : "")}
      </Callout>

      <Card>
        <CardHeader eyebrow="Derived from the fixture feed" title="Season by season" />
        <ol className="divide-y divide-line">
          {SEASONS.map((s) => {
            const g = r.games.find((x) => x.season === s);
            const wbRow = r.workbookRows.find((w) => w.year === s);
            const ex = exceptions.find((e) => e.year === s);
            return (
              <li key={s} className={cn("grid gap-2 px-4 py-3 sm:grid-cols-[80px_1fr_auto] sm:items-center sm:px-5", s === season && "bg-accent-soft/40")} data-testid="rivalry-season-row">
                <div className="tnum font-display text-lg font-semibold">{s}</div>
                {g ? (
                  <div className="min-w-0">
                    <Link href={gameHref(g.id)} className="font-medium hover:text-accent hover:underline">
                      {g.away} {g.isNeutral ? "vs" : "at"} {g.home}
                    </Link>
                    <div className="tnum text-sm text-ink-2">
                      <Link href={weekHref(g.season, g.week)} className="hover:underline">
                        Week {g.week}
                      </Link>{" "}
                      · {formatDate(g.date)} (modeled)
                    </div>
                    <div className={cn("text-sm", g.isNeutral ? "font-medium text-accent" : "text-ink-3")}>
                      {g.isNeutral ? `Neutral site · ${g.venue} · administrative home ${g.home}` : g.venue}
                    </div>
                    {wbRow && <div className="mt-0.5 text-[11px] text-ok">✓ matches 07 | Rivalry Locks (Week {wbRow.week}, {wbRow.away} @ {wbRow.home})</div>}
                  </div>
                ) : (
                  <div className="text-sm">
                    <span className="font-medium">No modeled meeting.</span>{" "}
                    <span className="text-ink-2">{ex ? `${ex.exceptionType}: ${ex.treatment}.` : r.annualExpected ? "Expected annual game is absent." : "Temporarily absent in this scenario."}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {g && <CategoryBadge type={g.type} />}
                  {g && <ProvenanceBadge status={g.status} />}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {exceptions.length > 0 && (
        <Card>
          <CardHeader eyebrow="13 | Contract Exceptions" title="Related exceptions" />
          <ul className="divide-y divide-line text-sm">
            {exceptions.map((e) => (
              <li key={e.year + e.exceptionType} className="px-4 py-3 sm:px-5">
                <div className="font-medium">
                  {e.year} · {e.exceptionType}
                </div>
                <div className="text-ink-2">
                  {e.existing}. Model: {e.treatment}. {e.why}.
                </div>
                {isHttpUrl(e.sourceUrl) && <ExternalLink href={e.sourceUrl} className="text-xs">Source</ExternalLink>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
