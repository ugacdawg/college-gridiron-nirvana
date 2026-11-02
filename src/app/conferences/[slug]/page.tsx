import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge, ConferenceChip, SiteBadge, TeamBadge } from "@/components/badges";
import { ConferenceLogo } from "@/components/logo";
import { ScheduleList, SeasonSwitcher } from "@/components/schedule";
import { Callout, Card, CardHeader, cn, PageHeader } from "@/components/ui";
import { workbook, dataset } from "@/lib/data";
import { ACC_EIGHT_GAME, CONFERENCE_BY_SLUG, CONFERENCE_MEMBERS, POWER_BY_NAME, POWER_BY_SLUG, SEASONS, WEEKS, slugify } from "@/lib/data/roster";
import { formatDate, pairKey } from "@/lib/model";
import { gameHref, parseSeason, teamHref, weekHref } from "@/lib/routes";
import { allPairCoverage, conferenceSeason, pairCoverage } from "@/lib/selectors/conference";
import { teamGames } from "@/lib/selectors/team";
import type { Dataset } from "@/lib/data/dataset";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug === "independent" ? "Independent · Notre Dame" : (CONFERENCE_BY_SLUG.get(slug) ?? "Conference") };
}

export default async function ConferencePage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const season = parseSeason(sp.season);
  if (slug === "independent") return <Independent season={season} ds={dataset} />;
  const conf = CONFERENCE_BY_SLUG.get(slug);
  if (!conf) notFound();
  const data = conferenceSeason(dataset, conf, season);
  const members = CONFERENCE_MEMBERS[conf];
  const cov = allPairCoverage(dataset, conf);
  const covMap = new Map(cov.map((c) => [pairKey(c.teamA, c.teamB), c]));
  const a = sp.a ? POWER_BY_SLUG.get(sp.a)?.name : undefined;
  const b = sp.b ? POWER_BY_SLUG.get(sp.b)?.name : undefined;
  const pair = a && b && a !== b && members.includes(a) && members.includes(b) ? pairCoverage(dataset, conf, a, b) : null;
  const pairWb = pair ? workbook.conferenceHA.find((r) => pairKey(r.teamA, r.teamB) === pairKey(pair.teamA, pair.teamB)) : undefined;
  const maxWeek = Math.max(...data.byWeek.map((w) => w.games.length), 1);
  const hrefPair = (x: string, y: string) => `/conferences/${slug}?season=${season}&a=${slugify(x)}&b=${slugify(y)}#pair`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${members.length} members · ${data.games.length} league games in ${season}`}
        title={
          <span className="flex items-center gap-3">
            <ConferenceLogo name={conf} size="lg" />
            {conf}
          </span>
        }
        actions={<SeasonSwitcher season={season} hrefFor={(s) => `/conferences/${slug}?season=${s}${sp.a ? `&a=${sp.a}` : ""}${sp.b ? `&b=${sp.b}` : ""}`} />}
      >
        Each member plays nine conference games{conf === "ACC" ? ", except one designated ACC team each season that plays eight (17 members)" : ""}. Conference home/away below are administrative designations.
      </PageHeader>

      {conf === "ACC" && (
        <Card>
          <CardHeader eyebrow="17 members cannot all play nine" title="ACC eight-game exception" />
          <ol className="grid gap-px bg-line sm:grid-cols-5">
            {SEASONS.map((s) => (
              <li key={s} className={cn("bg-surface px-4 py-3", s === season && "bg-accent-soft")}>
                <div className="tnum text-xs font-semibold text-ink-3">{s}</div>
                <Link href={teamHref(slugify(ACC_EIGHT_GAME[s].team), s)} className="font-semibold hover:underline">
                  {ACC_EIGHT_GAME[s].team}
                </Link>
                <div className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium", ACC_EIGHT_GAME[s].basis === "Published" ? "bg-ok-soft text-ok" : "border border-dashed border-line-strong text-ink-3")}>
                  {ACC_EIGHT_GAME[s].basis === "Published" ? "Published (ACC release)" : "Modeled assumption"}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card>
        <CardHeader eyebrow={`${season} · administrative designations`} title="Members: mandates and home/away balance" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
                <th scope="col" className="px-4 py-2 font-semibold">Team</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Conf games</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Conf H / A / N</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">All H / A / N</th>
                <th scope="col" className="px-3 py-2 font-semibold">Mandate</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.team} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    <Link href={teamHref(slugify(m.team), season)} className="flex items-center gap-2 font-medium hover:text-accent hover:underline">
                      <TeamBadge name={m.team} size="xs" /> {m.team}
                    </Link>
                  </th>
                  <td className="tnum px-3 py-2 text-right">
                    {m.confGames}/{m.confExpected}
                  </td>
                  <td className="tnum px-3 py-2 text-right">
                    {m.confHome} / {m.confAway} / {m.confNeutral}
                  </td>
                  <td className="tnum px-3 py-2 text-right">
                    {m.allHome} / {m.allAway} / {m.allNeutral}
                  </td>
                  <td className="px-3 py-2">
                    {m.confGames === m.confExpected ? <span className="text-ok">✓ met</span> : <span className="text-bad">✗</span>}
                    {m.confExpected === 8 && <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">8-game exception{ACC_EIGHT_GAME[season as 2027].basis === "Published" ? " · published" : " · modeled"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow={`${season}`} title="Conference games by week" />
        <div className="overflow-x-auto p-4 sm:p-5">
          <ol className="flex min-w-[700px] items-end gap-1.5" aria-label="Conference games per week">
            {data.byWeek.map((w) => (
              <li key={w.week} className="flex flex-1 flex-col items-center gap-1">
                <span className="tnum text-xs font-semibold">{w.games.length}</span>
                <span className="w-full rounded-t bg-conf/80" style={{ height: `${Math.max(2, (w.games.length / maxWeek) * 90)}px` }} aria-hidden="true" />
                <Link href={weekHref(season, w.week, `conf=${encodeURIComponent(conf)}&type=conf`)} className="tnum text-[11px] text-ink-3 hover:text-accent hover:underline" aria-label={`Week ${w.week}: ${w.games.length} ${conf} games — open filtered board`}>
                  W{w.week}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow={`${season} · member × week`} title="Team-season matrix" action={<span className="flex gap-1.5"><CategoryBadge type="Conference" /><CategoryBadge type="P4 nonconference" /><CategoryBadge type="G6" /></span>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-xs">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-3">
                <th scope="col" className="sticky left-0 bg-surface px-3 py-2 text-left font-semibold">Team</th>
                {WEEKS.map((w) => (
                  <th key={w} scope="col" className="tnum px-1 py-2 font-semibold">
                    W{w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.team} className="border-b border-line last:border-0">
                  <th scope="row" className="sticky left-0 bg-surface px-3 py-1.5 text-left font-medium">
                    <Link href={teamHref(slugify(m.team), season)} className="hover:underline">
                      {m.team}
                    </Link>
                  </th>
                  {m.byWeek.map((tg, i) => (
                    <td key={i} className="px-0.5 py-1 text-center">
                      {tg ? (
                        <Link
                          href={gameHref(tg.game.id)}
                          title={`${tg.site === "H" ? "vs" : tg.site === "A" ? "at" : "neutral vs"} ${tg.opponent} · ${tg.game.type}`}
                          className={cn(
                            "block rounded px-1 py-1 font-semibold",
                            tg.game.type === "Conference" ? "bg-conf-soft text-conf" : tg.game.type === "G6" ? "bg-g6-soft text-g6" : "bg-p4nc-soft text-p4nc",
                          )}
                        >
                          {tg.site === "A" ? "@" : tg.site === "N" ? "N·" : ""}
                          {POWER_BY_NAME.get(tg.opponent)?.abbr ?? tg.opponent.slice(0, 4).toUpperCase()}
                        </Link>
                      ) : (
                        <span className="hatch block rounded py-1 text-[10px] text-ink-3">BYE</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="coverage">
        <CardHeader
          eyebrow="2027–2031 · sourced from 05 | Conference H-A and verified against fixtures"
          title="Five-year home-and-away coverage"
          action={
            <span className="tnum text-sm font-semibold text-ok">
              {cov.filter((c) => c.pass).length}/{cov.length} pairs PASS
            </span>
          }
        />
        <div className="space-y-3 p-4 sm:p-5">
          <Callout title="Administrative home ≠ campus visit">
            Cell shows how often the <em>row</em> team is administrative host vs the <em>column</em> team (row/col). Pairs marked <strong className="text-accent">N</strong> include a neutral-site game (Florida–Georgia, Oklahoma–Texas): their administrative home alternates for accounting, but neither school hosts on campus.
          </Callout>
          <div className="overflow-x-auto">
            <table className="text-[11px]" aria-label={`${conf} pair coverage matrix`}>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 bg-surface" />
                  {members.map((t) => (
                    <th key={t} scope="col" className="h-24 w-8 align-bottom font-medium text-ink-3">
                      <span className="inline-block origin-bottom-left translate-x-3 -rotate-60 whitespace-nowrap">{POWER_BY_NAME.get(t)!.abbr}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((row) => (
                  <tr key={row}>
                    <th scope="row" className="sticky left-0 whitespace-nowrap bg-surface pr-2 text-right font-medium">
                      {row}
                    </th>
                    {members.map((col) => {
                      if (row === col) return <td key={col} className="h-8 w-8 bg-surface-3" aria-hidden="true" />;
                      const c = covMap.get(pairKey(row, col))!;
                      const rowH = c.teamA === row ? c.aAdminHome : c.bAdminHome;
                      const colH = c.teamA === row ? c.bAdminHome : c.aAdminHome;
                      const selected = pair && pairKey(pair.teamA, pair.teamB) === pairKey(row, col);
                      return (
                        <td key={col} className="p-0.5">
                          <Link
                            href={hrefPair(row, col)}
                            aria-label={`${row} vs ${col}: ${row} admin home ${rowH}, ${col} admin home ${colH}, ${c.pass ? "pass" : "fail"}${c.involvesNeutral ? ", includes neutral site" : ""}`}
                            className={cn(
                              "tnum flex h-8 w-8 flex-col items-center justify-center rounded leading-none",
                              c.pass ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad",
                              c.involvesNeutral && "ring-1 ring-inset ring-accent",
                              selected && "outline outline-2 outline-ink",
                            )}
                          >
                            <span className="font-semibold">
                              {rowH}/{colH}
                            </span>
                            {c.involvesNeutral && <span className="text-[8px] font-bold text-accent">N</span>}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card id="pair">
        <CardHeader eyebrow="Pair detail" title={pair ? `${pair.teamA} – ${pair.teamB}, 2027–2031` : "Select two members"} />
        <div className="p-4 sm:p-5">
          <form method="get" action={`/conferences/${slug}`} className="no-print mb-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="season" value={season} />
            {(["a", "b"] as const).map((k) => (
              <label key={k} className="text-xs font-medium text-ink-2">
                Team {k.toUpperCase()}
                <select name={k} defaultValue={sp[k] ?? ""} className="mt-1 block h-9 w-52 rounded-lg border border-line bg-surface px-2 text-sm text-ink">
                  <option value="">Choose…</option>
                  {members.map((t) => (
                    <option key={t} value={slugify(t)}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button type="submit" className="h-9 rounded-lg bg-ink px-3.5 text-sm font-medium text-bg">
              Show meetings
            </button>
          </form>
          {pair ? (
            <PairDetail pair={pair} wbCoverage={pairWb?.coverage} wbNotes={pairWb?.notes} />
          ) : (
            <p className="text-sm text-ink-3">Pick two {conf} members above, or click a matrix cell.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function PairDetail({ pair, wbCoverage, wbNotes }: { pair: ReturnType<typeof pairCoverage>; wbCoverage?: string; wbNotes?: string }) {
  return (
    <div data-testid="pair-detail">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={cn("rounded-md px-2 py-0.5 font-bold", pair.pass ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>{pair.pass ? "PASS" : "FAIL"}</span>
        <span className="text-ink-2">
          Admin. host: {pair.teamA} {pair.aAdminHome}× · {pair.teamB} {pair.bAdminHome}× — workbook coverage: <strong>{wbCoverage ?? "n/a"}</strong>
          {wbNotes ? ` (${wbNotes})` : ""}
        </span>
      </div>
      {pair.involvesNeutral && (
        <Callout tone="warn" className="mb-3">
          Campus visits actually played: {pair.teamA} {pair.aCampusHome}, {pair.teamB} {pair.bCampusHome}. Neutral-site meetings count toward administrative coverage only.
        </Callout>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
            <th scope="col" className="py-2 pr-3 font-semibold">Season</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Week</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Administrative home</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Venue</th>
          </tr>
        </thead>
        <tbody>
          {SEASONS.map((s) => {
            const m = pair.meetings.find((x) => x.season === s);
            return (
              <tr key={s} className="border-b border-line last:border-0">
                <td className="tnum py-2 pr-3 font-semibold">{s}</td>
                {m ? (
                  <>
                    <td className="tnum py-2 pr-3">
                      <Link href={gameHref(m.game.id)} className="text-accent hover:underline">
                        Wk {m.game.week} · {formatDate(m.game.date, { year: false })}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1.5">
                        <SiteBadge site={m.neutral ? "N" : "H"} className="h-5 w-5 text-[10px]" /> {m.adminHome}
                        {m.neutral && <span className="text-xs text-accent">(administrative only)</span>}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-ink-2">{m.game.venue}</td>
                  </>
                ) : (
                  <td colSpan={3} className="py-2 pr-3 text-ink-3">
                    No meeting this season
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Independent({ season, ds }: { season: number; ds: Dataset }) {
  const games = teamGames(ds, "Notre Dame", season);
  const acc = SEASONS.map((s) => ({ s, n: teamGames(ds, "Notre Dame", s).filter((t) => t.opponentConference === "ACC").length }));
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="FBS Independent" title="Notre Dame" actions={<SeasonSwitcher season={season} hrefFor={(s) => `/conferences/independent?season=${s}`} />}>
        Notre Dame has no conference and therefore zero conference games. All 11 Power-pool games are recorded as P4 nonconference — including games against ACC programs under the long-standing football scheduling arrangement. Navy is protected annually and is Notre Dame’s one and only G6 game.
      </PageHeader>
      <Card>
        <CardHeader eyebrow="Scheduling arrangement, not membership" title="ACC opponents per season" />
        <ol className="grid gap-px bg-line sm:grid-cols-5">
          {acc.map(({ s, n }) => (
            <li key={s} className={cn("bg-surface px-4 py-3", s === season && "bg-accent-soft")}>
              <div className="tnum text-xs font-semibold text-ink-3">{s}</div>
              <div className="tnum font-display text-2xl font-semibold">{n}</div>
              <div className="text-[11px] text-ink-3">ACC opponents (nonconference)</div>
            </li>
          ))}
        </ol>
      </Card>
      <Card>
        <CardHeader eyebrow={`${season}`} title="Notre Dame schedule" action={<ConferenceChip conference="Independent" long />} />
        <div className="px-2 pb-2 sm:px-3">
          <ScheduleList games={games} season={season} />
        </div>
      </Card>
      <Link href={teamHref("notre-dame", season)} className="text-sm font-medium text-accent hover:underline">
        Full Notre Dame team page →
      </Link>
    </div>
  );
}

