import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Info } from "lucide-react";
import { CategoryBadge, ConferenceChip, SiteBadge, TeamBadge } from "@/components/badges";
import { FavoriteToggle } from "@/components/favorites";
import { ConferenceLogo } from "@/components/logo";
import { MatchupCard, ScheduleList, SeasonStrip, SeasonSwitcher } from "@/components/schedule";
import { TeamExports } from "@/components/team-exports";
import { Callout, Card, CardHeader, cn, LinkButton, Stat } from "@/components/ui";
import { ACC_EIGHT_GAME, POWER_BY_SLUG, POWER_TEAMS, SEASONS, conferenceSlug, type Season } from "@/lib/data/roster";
import { formatDate, pairKey } from "@/lib/model";
import { gameHref, parseSeason, programHref, teamHref } from "@/lib/routes";
import { fiveYearOpponents, meetings, teamSchedule, teamSummary } from "@/lib/selectors/team";
import type { Dataset } from "@/lib/data/dataset";
import { dataset } from "@/lib/data";
import { protectedKeys } from "@/lib/data/derived";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const t = POWER_BY_SLUG.get(slug);
  return { title: t ? `${t.name} ${parseSeason(sp.season)} modeled schedule` : "Team not found" };
}

export default async function TeamPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const team = POWER_BY_SLUG.get(slug);
  if (!team) notFound();
  const season = parseSeason(sp.season);
  const view = sp.view === "five-year" || sp.view === "nonconf" ? sp.view : "season";
  const sched = teamSchedule(dataset, team.name, season);
  const sum = teamSummary(dataset, team.name, season, protectedKeys);
  const opponentsAll = fiveYearOpponents(dataset, team.name);
  const vsTeam = sp.vs ? (POWER_BY_SLUG.get(sp.vs)?.name ?? opponentsAll.find((o) => o.opponentSlug === sp.vs)?.opponent) : undefined;
  const vsMeetings = vsTeam ? meetings(dataset, team.name, vsTeam) : [];
  const href = (s: number, extra: Record<string, string> = {}) =>
    teamHref(team.slug, s, { ...(view !== "season" ? { view } : {}), ...(view === "nonconf" && sp.nc ? { nc: sp.nc } : {}), ...(sp.vs ? { vs: sp.vs } : {}), ...extra });
  const eightGame = team.conference === "ACC" && ACC_EIGHT_GAME[season as Season].team === team.name;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <TeamBadge name={team.name} size="xl" />
          <div className="min-w-0">
            <div className="eyebrow mb-1 flex items-center gap-2">
              <Link href={`/conferences/${conferenceSlug(team.conference)}?season=${season}`} className="flex items-center gap-1.5 hover:text-ink">
                {team.conference !== "Independent" && <ConferenceLogo name={team.conference} size="xs" />}
                {team.conference === "Independent" ? "FBS Independent" : team.conference}
              </Link>
              <span aria-hidden="true">·</span>
              <span>{season} modeled schedule</span>
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="team-title">
              {team.name}
            </h1>
            <p className="mt-0.5 text-sm text-ink-2">
              {team.nickname}
              {team.fullName !== team.name && <span className="text-ink-3"> · {team.fullName}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <SeasonSwitcher season={season} hrefFor={(s) => href(s)} />
          <div className="flex flex-wrap gap-2">
            <FavoriteToggle slug={team.slug} name={team.name} />
            {view !== "nonconf" && <TeamExports team={team.name} season={season} games={sched.games.map((g) => g.game)} />}
          </div>
        </div>
      </div>

      <nav aria-label="Team views" className="no-print mb-5 flex gap-1 border-b border-line">
        {(["season", "five-year", "nonconf"] as const).map((v) => (
          <Link
            key={v}
            data-testid={`tab-${v}`}
            href={teamHref(team.slug, season, v !== "season" ? { view: v } : {})}
            aria-current={view === v ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              view === v ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {v === "season" ? `${season} season` : v === "five-year" ? "Five-year view (2027–31)" : "Non-conference (2027–31)"}
          </Link>
        ))}
      </nav>

      {view === "season" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader
              eyebrow="Weeks 0–13 · modeled Saturdays"
              title={`${season} season strip`}
              action={
                <span className="flex items-center gap-3 text-[11px] text-ink-3">
                  <Legend />
                </span>
              }
            />
            <div className="p-4 sm:p-5">
              <SeasonStrip slots={sched.slots} team={team.name} season={season} />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <CardHeader eyebrow={`${sched.games.length} games in playing order`} title="Schedule" />
              <div className="px-2 pb-2 sm:px-3">
                <ScheduleList games={sched.games} season={season} />
              </div>
              <p className="border-t border-line px-4 py-3 text-xs text-ink-3 sm:px-5">
                Dates are modeled Saturdays, not announced kickoff dates; no kickoff times exist in the source. “N” marks a neutral site — the administrative home/away label is accounting only.
              </p>
            </Card>

            <aside className="space-y-4" aria-label="Season summary">
              <Card>
                <CardHeader eyebrow="Structural summary" title={`${season} at a glance`} />
                <dl className="grid grid-cols-3 gap-px bg-line text-center">
                  {[
                    ["Games", sum.total],
                    ["P4 / ND", sum.p4],
                    ["G6", sum.g6],
                    ["Home", sum.home],
                    ["Away", sum.away],
                    ["Neutral", sum.neutral],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-surface px-2 py-3">
                      <dt className="eyebrow">{k}</dt>
                      <dd className="tnum font-display text-xl font-semibold" data-testid={`sum-${String(k).toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="space-y-3 px-4 py-4 text-sm">
                  <Row label="Conference games">
                    {team.conference === "Independent" ? (
                      <span>0 — independent (no conference mandate)</span>
                    ) : (
                      <span className="tnum">
                        {sum.conference} of {sum.conferenceExpected} required{" "}
                        <span className={sum.conference === sum.conferenceExpected ? "text-ok" : "text-bad"}>{sum.conference === sum.conferenceExpected ? "✓" : "✗"}</span>
                      </span>
                    )}
                  </Row>
                  {eightGame && (
                    <Callout tone="warn" title="ACC eight-game exception">
                      With 17 members, one ACC team plays eight league games each year. {season === 2027 ? "Clemson’s 2027 designation comes from the published ACC release." : `${team.name} in ${season} is a modeled assumption, not a published designation.`}
                    </Callout>
                  )}
                  <Row label="P4 nonconference">{sum.p4Nonconference}</Row>
                  <Row label="Byes">
                    <span className="tnum">Weeks {sum.byes.join(" & ")}</span>
                  </Row>
                  {sum.g6Opponent && (
                    <Row label="G6 opponent">
                      <Link className="font-medium hover:text-accent hover:underline" href={programHref(sum.g6Opponent.name)}>
                        {sum.g6Opponent.name}
                      </Link>{" "}
                      <ConferenceChip conference={sum.g6Opponent.league} />
                    </Row>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader eyebrow="11 Power-pool opponents" title="P4 opponents by conference" />
                <ul className="space-y-3 px-4 py-4">
                  {sum.p4OpponentsByConference.map((c) => (
                    <li key={c.conference}>
                      <div className="mb-1 flex items-center gap-2">
                        <ConferenceChip conference={c.conference} long logo />
                        <span className="tnum text-xs text-ink-3">{c.opponents.length}</span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {c.opponents.map((o, i) => (
                          <span key={o}>
                            <Link href={programHref(o, season)} className="hover:text-accent hover:underline">
                              {o}
                            </Link>
                            {i < c.opponents.length - 1 && <span className="text-ink-3">, </span>}
                          </span>
                        ))}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader eyebrow="Annual locks" title="Protected rivalries" />
                <ul className="divide-y divide-line">
                  {sum.protectedRivalries.length === 0 && <li className="px-4 py-3 text-sm text-ink-3">No protected annual rivalry for this program in the model.</li>}
                  {sum.protectedRivalries.map((r) => (
                    <li key={r.game.id} className="flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="protected-rivalry">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                      <Link href={gameHref(r.game.id)} className="min-w-0 flex-1 truncate hover:underline">
                        {r.site === "A" ? "at" : "vs"} {r.opponent}
                      </Link>
                      <SiteBadge site={r.site} className="h-5 w-5 text-[10px]" />
                      <span className="tnum text-xs text-ink-3">Wk {r.game.week}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        </div>
      ) : view === "five-year" ? (
        <FiveYear team={team.name} slug={team.slug} season={season} opponents={opponentsAll} ds={dataset} />
      ) : (
        <NonConference team={team.name} slug={team.slug} season={season} ds={dataset} p4Only={sp.nc === "p4"} protectedKeys={protectedKeys} />
      )}

      <Card className="mt-6" id="lookup">
        <CardHeader eyebrow="Meeting finder" title={`Where does ${team.name} play an opponent across 2027–2031?`} />
        <div className="p-4 sm:p-5">
          <form method="get" action={`/teams/${team.slug}`} className="no-print flex flex-wrap items-end gap-2">
            <input type="hidden" name="season" value={season} />
            {view !== "season" && <input type="hidden" name="view" value={view} />}
            <label className="text-xs font-medium text-ink-2">
              Opponent
              <select name="vs" defaultValue={sp.vs ?? ""} className="mt-1 block h-9 w-64 rounded-lg border border-line bg-surface px-2 text-sm text-ink">
                <option value="">Choose an opponent…</option>
                <optgroup label="Faced 2027–2031">
                  {opponentsAll.map((o) => (
                    <option key={o.opponent} value={o.opponentSlug}>
                      {o.opponent} ({o.count}×)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other Power / ND programs">
                  {POWER_TEAMS.filter((t) => t.name !== team.name && !opponentsAll.some((o) => o.opponent === t.name)).map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <button type="submit" className="h-9 rounded-lg bg-ink px-3.5 text-sm font-medium text-bg">
              Find meetings
            </button>
          </form>
          {vsTeam && (
            <div className="mt-4" data-testid="meeting-results">
              {vsMeetings.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm">
                  <strong>No modeled meeting</strong> between {team.name} and {vsTeam} in 2027–2031.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-ink-2">
                    {vsMeetings.length} modeled meeting{vsMeetings.length > 1 ? "s" : ""} · seasons without one:{" "}
                    {SEASONS.filter((s) => !vsMeetings.some((g) => g.season === s)).join(", ") || "none"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {vsMeetings.map((g) => (
                      <MatchupCard key={g.id} game={g} showWeek />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-3">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function Legend() {
  return (
    <>
      <CategoryBadge type="Conference" />
      <CategoryBadge type="P4 nonconference" />
      <CategoryBadge type="G6" />
    </>
  );
}

function FiveYear({ team, slug, season, opponents, ds }: { team: string; slug: string; season: number; opponents: ReturnType<typeof fiveYearOpponents>; ds: Dataset }) {
  const schedules = SEASONS.map((s) => teamSchedule(ds, team, s));
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader eyebrow="All five seasons" title="Week-by-week, 2027–2031" />
        <div className="space-y-4 p-4 sm:p-5">
          {schedules.map((sch) => (
            <div key={sch.season}>
              <div className="mb-1.5 flex items-center gap-2">
                <Link href={teamHref(slug, sch.season)} className={cn("tnum font-display text-sm font-semibold hover:underline", sch.season === season && "text-accent")}>
                  {sch.season}
                </Link>
                <span className="text-xs text-ink-3">byes: Weeks {sch.byes.join(" & ")}</span>
              </div>
              <SeasonStrip slots={sch.slots} team={team} season={sch.season} compact />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader eyebrow={`${opponents.length} distinct opponents`} title="Opponent matrix" action={<span className="flex items-center gap-1 text-xs text-ink-3"><Info className="h-3.5 w-3.5" aria-hidden="true" /> cell = week · site</span>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">{team} opponents by season</caption>
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
                <th scope="col" className="px-4 py-2 font-semibold">Opponent</th>
                {SEASONS.map((s) => (
                  <th key={s} scope="col" className="tnum px-2 py-2 text-center font-semibold">
                    {s}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {opponents.map((o) => (
                <tr key={o.opponent} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    <span className="flex items-center gap-2">
                      <Link href={programHref(o.opponent, season)} className="font-medium hover:text-accent hover:underline">
                        {o.opponent}
                      </Link>
                      <ConferenceChip conference={o.opponentConference} />
                    </span>
                  </th>
                  {SEASONS.map((s) => {
                    const tg = o.bySeason.get(s);
                    return (
                      <td key={s} className="px-2 py-1.5 text-center">
                        {tg ? (
                          <Link href={gameHref(tg.game.id)} className="tnum inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs hover:border-ink-3" title={`${s} Week ${tg.game.week} · ${formatDate(tg.game.date)} · ${tg.game.type}`}>
                            W{tg.game.week}
                            <SiteBadge site={tg.site} className="h-4 w-4 text-[9px]" />
                          </Link>
                        ) : (
                          <span className="text-ink-3" aria-label="no meeting">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="tnum px-3 py-1.5 text-right font-semibold">{o.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/compare?a=${slug}&season=${season}`} size="sm">
          Compare {team} with another team →
        </LinkButton>
      </div>
    </div>
  );
}

/** Every non-conference game a program plays across 2027–2031 (P4 non-conference + G6, or P4 only). */
function NonConference({ team, slug, season, ds, p4Only, protectedKeys }: { team: string; slug: string; season: number; ds: Dataset; p4Only: boolean; protectedKeys: Set<string> }) {
  const all = SEASONS.flatMap((s) => teamSchedule(ds, team, s).games).filter((tg) => tg.game.type !== "Conference");
  const games = p4Only ? all.filter((tg) => tg.game.type === "P4 nonconference") : all;
  const p4 = all.filter((tg) => tg.game.type === "P4 nonconference");
  const byConf = new Map<string, Map<string, number[]>>();
  for (const tg of games) {
    const m = byConf.get(tg.opponentConference) ?? new Map<string, number[]>();
    m.set(tg.opponent, [...(m.get(tg.opponent) ?? []), tg.game.season]);
    byConf.set(tg.opponentConference, m);
  }
  const repeats = [...byConf.values()].flatMap((m) => [...m.entries()]).filter(([, ys]) => ys.length > 1);
  const isProtected = (o: string) => protectedKeys.has(pairKey(team, o));
  const tab = (nc: boolean, label: string) => (
    <Link
      href={teamHref(slug, season, { view: "nonconf", ...(nc ? { nc: "p4" } : {}) })}
      aria-current={p4Only === nc ? "page" : undefined}
      data-testid={nc ? "nc-p4" : "nc-all"}
      className={cn("rounded-md px-2.5 py-1 text-[13px] font-medium", p4Only === nc ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2")}
    >
      {label}
    </Link>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Which non-conference games">
          {tab(false, "P4 non-con + G6")}
          {tab(true, "P4 non-con only")}
        </div>
        <TeamExports team={team} season={season} games={games.map((g) => g.game)} fileLabel={`2027-2031-${p4Only ? "p4-nonconference" : "nonconference"}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Games shown" value={games.length} hint={p4Only ? "P4 non-conference" : "P4 non-con + G6"} />
        <Stat label="P4 non-conference" value={p4.length} hint="2027–2031" />
        <Stat label="Distinct opponents" value={new Set(games.map((g) => g.opponent)).size} />
        <Stat label="Home / Away / Neutral" value={`${games.filter((g) => g.site === "H").length}/${games.filter((g) => g.site === "A").length}/${games.filter((g) => g.site === "N").length}`} />
        <Stat label="Repeat opponents" value={repeats.length} hint="met in 2+ seasons" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader eyebrow={`${games.length} games · in season and week order`} title={`${team} non-conference games, 2027–2031`} />
          <div className="overflow-x-auto px-2 pb-2 sm:px-3">
            {games.length ? (
              <ScheduleList games={games} season={season} showSeason />
            ) : (
              <p className="p-4 text-sm text-ink-3">No P4 non-conference games in 2027–2031.</p>
            )}
          </div>
        </Card>
        <aside className="space-y-4" aria-label="Non-conference opponents by conference">
          <Card>
            <CardHeader eyebrow="Opponent seasons" title="Opponents by conference" />
            <ul className="space-y-3 px-4 py-4">
              {[...byConf.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([c, m]) => (
                <li key={c}>
                  <div className="mb-1 flex items-center gap-2">
                    <ConferenceChip conference={c} long logo />
                    <span className="tnum text-xs text-ink-3">{[...m.values()].flat().length}</span>
                  </div>
                  <ul className="space-y-0.5 text-sm">
                    {[...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([o, ys]) => (
                      <li key={o} className="flex items-baseline justify-between gap-2">
                        <Link href={programHref(o, season)} className="truncate hover:text-accent hover:underline">
                          {o}
                          {isProtected(o) && <span className="ml-1 text-[11px] font-semibold text-accent">protected</span>}
                        </Link>
                        <span className="tnum shrink-0 text-xs text-ink-3">{ys.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
