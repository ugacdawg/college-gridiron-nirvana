import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ConferenceChip, TeamBadge } from "@/components/badges";
import { ComparePickers } from "@/components/compare-pickers";
import { MatchupCard, SeasonStrip, SeasonSwitcher } from "@/components/schedule";
import { Callout, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { AFFILIATIONS, POWER_BY_SLUG, SEASONS, type PowerTeam } from "@/lib/data/roster";
import { parseSeason, programHref, teamHref } from "@/lib/routes";
import { meetings, teamGames, teamSchedule, teamSummary } from "@/lib/selectors/team";
import type { Dataset } from "@/lib/data/dataset";
import { dataset } from "@/lib/data";
import { protectedKeys } from "@/lib/data/derived";

export const metadata: Metadata = { title: "Compare teams" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const season = parseSeason(sp.season);
  const a = sp.a ? POWER_BY_SLUG.get(sp.a) : undefined;
  const b = sp.b ? POWER_BY_SLUG.get(sp.b) : undefined;
  const qs = (s: number) => `/compare?${new URLSearchParams({ ...(sp.a ? { a: sp.a } : {}), ...(sp.b ? { b: sp.b } : {}), season: String(s) })}`;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Record-free structural comparison" title="Compare teams" actions={<SeasonSwitcher season={season} hrefFor={qs} />}>
        Side-by-side schedule structure and head-to-head meetings. No strength-of-schedule rating is computed: counting Power opponents does not measure competitive strength.
      </PageHeader>
      <Suspense>
        <ComparePickers />
      </Suspense>
      {a && b && a.slug !== b.slug ? (
        <Comparison a={a} b={b} season={season} ds={dataset} protectedKeys={protectedKeys} />
      ) : (
        <EmptyState title="Choose two programs">
          Try{" "}
          <Link href={`/compare?a=ohio-state&b=michigan&season=${season}`} className="font-medium text-accent hover:underline">
            Ohio State vs Michigan
          </Link>{" "}
          or{" "}
          <Link href={`/compare?a=notre-dame&b=usc&season=${season}`} className="font-medium text-accent hover:underline">
            Notre Dame vs USC
          </Link>
          .
        </EmptyState>
      )}
    </div>
  );
}

function Comparison({ a, b, season, ds, protectedKeys }: { a: PowerTeam; b: PowerTeam; season: number; ds: Dataset; protectedKeys: Set<string> }) {
  const [sa, sb] = [a, b].map((t) => teamSchedule(ds, t.name, season));
  const [ma, mb] = [a, b].map((t) => teamSummary(ds, t.name, season, protectedKeys));
  const h2h = meetings(ds, a.name, b.name);
  const thisSeason = h2h.find((g) => g.season === season);
  const opps = (t: PowerTeam) => new Set(teamGames(ds, t.name, season).map((x) => x.opponent));
  const [oa, ob] = [opps(a), opps(b)];
  const common = [...oa].filter((o) => ob.has(o) && o !== a.name && o !== b.name).sort();
  const five = (t: PowerTeam) => new Set(SEASONS.flatMap((s) => teamGames(ds, t.name, s).map((x) => x.opponent))).size;
  const list = (xs: string[]) =>
    xs.length ? (
      <span className="leading-relaxed">
        {xs.map((o, i) => (
          <span key={o}>
            <Link href={programHref(o, season)} className="hover:text-accent hover:underline">
              {o}
            </Link>
            {i < xs.length - 1 ? ", " : ""}
          </span>
        ))}
      </span>
    ) : (
      <span className="text-ink-3">—</span>
    );
  const byType = (t: PowerTeam, type: string) => teamGames(ds, t.name, season).filter((x) => x.game.type === type).map((x) => x.opponent).sort();
  const rows: [string, ReactNode, ReactNode][] = [
    ["Conference", <ConferenceChip key="a" conference={a.conference} long />, <ConferenceChip key="b" conference={b.conference} long />],
    ["Games / byes", `${ma.total} · Weeks ${ma.byes.join(" & ")}`, `${mb.total} · Weeks ${mb.byes.join(" & ")}`],
    ["Conference games", a.conference === "Independent" ? "0 (independent)" : `${ma.conference} of ${ma.conferenceExpected}`, b.conference === "Independent" ? "0 (independent)" : `${mb.conference} of ${mb.conferenceExpected}`],
    ["Conference opponents", list(byType(a, "Conference")), list(byType(b, "Conference"))],
    ["P4 nonconference opponents", list(byType(a, "P4 nonconference")), list(byType(b, "P4 nonconference"))],
    ["G6 opponent", list(byType(a, "G6")), list(byType(b, "G6"))],
    ["Home / Away / Neutral", `${ma.home} / ${ma.away} / ${ma.neutral}`, `${mb.home} / ${mb.away} / ${mb.neutral}`],
    ["Unique opponents", `${oa.size} this season · ${five(a)} over 2027–31`, `${ob.size} this season · ${five(b)} over 2027–31`],
    [
      "P4 opponents by affiliation",
      AFFILIATIONS.map((c) => `${c} ${ma.p4OpponentsByConference.find((x) => x.conference === c)?.opponents.length ?? 0}`).join(" · "),
      AFFILIATIONS.map((c) => `${c} ${mb.p4OpponentsByConference.find((x) => x.conference === c)?.opponents.length ?? 0}`).join(" · "),
    ],
    ["Protected rivalries", list(ma.protectedRivalries.map((x) => x.opponent)), list(mb.protectedRivalries.map((x) => x.opponent))],
  ];

  return (
    <>
      <Card>
        <CardHeader eyebrow="Head-to-head" title={`${a.name} vs ${b.name}`} />
        <div className="space-y-4 p-4 sm:p-5" data-testid="h2h">
          {thisSeason ? (
            <Callout tone="ok" title={`They meet in ${season}`}>
              Week {thisSeason.week}. The same Game ID ({thisSeason.id}) appears in both team schedules and once on the {season} Week {thisSeason.week} board.
            </Callout>
          ) : (
            <Callout title={`No modeled meeting in ${season}`}>{h2h.length ? `They meet in ${h2h.map((g) => g.season).join(", ")}.` : "They do not meet at all in 2027–2031."}</Callout>
          )}
          {h2h.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {h2h.map((g) => (
                <MatchupCard key={g.id} game={g} showWeek />
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium" data-testid="no-meeting">
              No modeled meeting, 2027–2031.
            </p>
          )}
        </div>
      </Card>

      {[
        { t: a, s: sa },
        { t: b, s: sb },
      ].map(({ t, s }) => (
        <Card key={t.slug}>
          <CardHeader
            eyebrow={`${season} · Weeks 0–13`}
            title={
              <span className="flex items-center gap-2">
                <TeamBadge name={t.name} size="sm" />
                <Link href={teamHref(t.slug, season)} className="hover:underline">
                  {t.name}
                </Link>
              </span>
            }
          />
          <div className="p-4 sm:p-5">
            <SeasonStrip slots={s.slots} team={t.name} season={season} compact />
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader eyebrow={`${season}`} title="Structure side by side" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="w-48 px-4 py-2 text-[11px] uppercase tracking-wider text-ink-3">
                  Measure
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  {a.name}
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  {b.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, va, vb]) => (
                <tr key={k} className="border-b border-line align-top last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal text-ink-3">
                    {k}
                  </th>
                  <td className="px-4 py-2.5">{va}</td>
                  <td className="px-4 py-2.5">{vb}</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-ink-3">
                  Common opponents
                </th>
                <td colSpan={2} className="px-4 py-2.5">
                  {list(common)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
