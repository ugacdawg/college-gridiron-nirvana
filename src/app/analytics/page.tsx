import type { Metadata } from "next";
import Link from "next/link";
import { TeamBadge } from "@/components/badges";
import { Bars, HBars } from "@/components/charts";
import { ConferenceLogo } from "@/components/logo";
import { MatchupCard } from "@/components/schedule";
import { Callout, Card, CardHeader, cn, PageHeader } from "@/components/ui";
import { g6Overrides, workbook, dataset } from "@/lib/data";
import { G6OverridesTable } from "@/components/g6-overrides";
import { AFFILIATIONS, POWER_CONFERENCES, SEASONS, conferenceSlug, slugify, type Affiliation } from "@/lib/data/roster";
import { formatDate, pairKey } from "@/lib/model";
import { gameHref, teamHref } from "@/lib/routes";
import {
  affiliationMatrix,
  byesByWeek,
  g6Mix,
  neutralGames,
  p4Balance,
  p4BalanceMatchesWorkbook,
  provenanceCountsBySeason,
  repeatPairs,
  teamCrossplay,
  typeCountsBySeason,
  type SeasonScope,
} from "@/lib/selectors/analytics";
import { allPairCoverage } from "@/lib/selectors/conference";
import type { Dataset } from "@/lib/data/dataset";
import { protectedKeys } from "@/lib/data/derived";

export const metadata: Metadata = { title: "Analytics & audits" };

const VIEWS = [
  ["overview", "Game types"],
  ["matrix", "Matchup heatmap"],
  ["balance", "P4 balance"],
  ["crossplay", "Team crossplay"],
  ["repeats", "Repeat audit"],
  ["g6", "G6 assignments"],
  ["g6home", "G6 home sites"],
  ["neutral", "Neutral sites & byes"],
  ["coverage", "H/A coverage"],
] as const;
type View = (typeof VIEWS)[number][0];

const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3";
const td = "tnum px-3 py-2";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const view: View = (VIEWS.find((v) => v[0] === sp.view)?.[0] ?? "overview") as View;
  const scope: SeasonScope = sp.scope && SEASONS.includes(Number(sp.scope) as 2027) ? Number(sp.scope) : "all";
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view, scope: scope === "all" ? undefined : String(scope), season: sp.season, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/analytics?${p.toString()}`;
  };
  const scoped = ["matrix", "g6", "neutral"].includes(view);

  return (
    <div>
      <PageHeader eyebrow="Five-year views · computed from fixtures, cross-checked against the workbook" title="Analytics & audits">
        Structural counts only. No scores, records, odds, rankings or travel distances exist in this model, and none are estimated here.
      </PageHeader>
      <nav aria-label="Analytics views" className="no-print mb-4 flex flex-wrap gap-1 border-b border-line">
        {VIEWS.map(([k, l]) => (
          <Link key={k} href={href({ view: k, cell: undefined })} aria-current={view === k ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", view === k ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
            {l}
          </Link>
        ))}
      </nav>
      {scoped && (
        <div className="no-print mb-5 flex flex-wrap items-center gap-1" role="group" aria-label="Season scope">
          {(["all", ...SEASONS] as const).map((s) => (
            <Link key={s} href={href({ scope: s === "all" ? undefined : String(s), cell: undefined })} aria-current={scope === s ? "page" : undefined} className={cn("tnum rounded-md border px-2.5 py-1 text-[13px] font-semibold", scope === s ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:bg-surface-2")}>
              {s === "all" ? "2027–2031" : s}
            </Link>
          ))}
        </div>
      )}
      {view === "overview" && <Overview ds={dataset} />}
      {view === "matrix" && <Matrix ds={dataset} scope={scope} cell={sp.cell} href={href} />}
      {view === "balance" && <Balance ds={dataset} />}
      {view === "crossplay" && <Crossplay ds={dataset} />}
      {view === "repeats" && <Repeats ds={dataset} protectedKeys={protectedKeys} />}
      {view === "g6" && <G6 scope={scope} />}
      {view === "g6home" && <G6Home ds={dataset} />}
      {view === "neutral" && <NeutralByes ds={dataset} scope={scope} />}
      {view === "coverage" && <Coverage ds={dataset} />}
    </div>
  );
}

function Overview({ ds }: { ds: Dataset }) {
  const types = typeCountsBySeason(ds);
  const prov = provenanceCountsBySeason(ds);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader eyebrow="Unique games per season" title="Game categories" />
        <div className="p-4">
          <Bars
            ariaLabel="Stacked bars of conference, P4 nonconference and G6 games per season; each season totals 442"
            data={types.map((r) => ({ ...r, season: String(r.season) }))}
            x="season"
            stacked
            series={[
              { key: "Conference", label: "Conference", color: "var(--cat-conf)" },
              { key: "P4 nonconference", label: "P4 nonconference", color: "var(--cat-p4nc)" },
              { key: "G6", label: "G6", color: "var(--cat-g6)" },
            ]}
          />
        </div>
        <table className="w-full border-t border-line text-sm">
          <thead>
            <tr>
              <th className={th}>Season</th>
              <th className={th}>Conference</th>
              <th className={th}>P4 NC</th>
              <th className={th}>G6</th>
              <th className={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {types.map((r) => (
              <tr key={r.season} className="border-t border-line">
                <td className={td}>{r.season}</td>
                <td className={td}>{r.Conference}</td>
                <td className={td}>{r["P4 nonconference"]}</td>
                <td className={td}>{r.G6}</td>
                <td className={cn(td, "font-semibold")}>{r.Conference + r["P4 nonconference"] + r.G6}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <CardHeader eyebrow="How much is sourced vs modeled" title="Provenance by season" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Season</th>
                <th className={th}>Published</th>
                <th className={th}>Protected</th>
                <th className={th}>Modeled rotation</th>
                <th className={th}>Model generated</th>
                <th className={th}>Modeled regional</th>
                <th className={th}>Venue override</th>
              </tr>
            </thead>
            <tbody>
              {prov.map((r) => (
                <tr key={r.season} className="border-t border-line">
                  <td className={td}>{r.season}</td>
                  <td className={td}>{r.Published}</td>
                  <td className={td}>{r.Protected}</td>
                  <td className={td}>{r["Modeled rotation"]}</td>
                  <td className={td}>{r["Model generated"]}</td>
                  <td className={td}>{r["Modeled regional"]}</td>
                  <td className={td}>{r["Venue override"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-3">
          Published fixtures fall from {prov[0].Published} in 2027 to {prov[4].Published} in 2031: later seasons are increasingly model-generated. Workbook <code>01 | Overview</code> reports the same published counts.
        </p>
      </Card>
    </div>
  );
}

function Matrix({ ds, scope, cell, href }: { ds: Dataset; scope: SeasonScope; cell?: string; href: (p: Record<string, string | undefined>) => string }) {
  const m = affiliationMatrix(ds, scope);
  const off = AFFILIATIONS.flatMap((a) => AFFILIATIONS.filter((b) => b !== a).map((b) => m.get(a, b).length));
  const max = Math.max(...off, 1);
  const [ca, cb] = (cell ?? "").split("|") as [Affiliation?, Affiliation?];
  const drill = ca && cb && AFFILIATIONS.includes(ca) && AFFILIATIONS.includes(cb) ? m.get(ca, cb) : null;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader eyebrow={`${scope === "all" ? "2027–2031" : scope} · Power-vs-Power games`} title="Conference × conference matchups" />
        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="text-sm" aria-label="Matchup counts between affiliations">
            <thead>
              <tr>
                <th />
                {AFFILIATIONS.map((c) => (
                  <th key={c} scope="col" className="px-1 pb-2 text-xs font-semibold text-ink-2">
                    <span className="flex flex-col items-center gap-1">
                      {c !== "Independent" ? <ConferenceLogo name={c} size="sm" /> : <TeamBadge name="Notre Dame" size="sm" />}
                      {c}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AFFILIATIONS.map((a) => (
                <tr key={a}>
                  <th scope="row" className="whitespace-nowrap pr-3 text-right text-xs font-semibold text-ink-2">
                    {a}
                  </th>
                  {AFFILIATIONS.map((b) => {
                    const n = m.get(a, b).length;
                    const diag = a === b;
                    const sel = (ca === a && cb === b) || (ca === b && cb === a);
                    return (
                      <td key={b} className="p-0.5">
                        <Link
                          href={href({ cell: `${a}|${b}` }) + "#drill"}
                          aria-label={`${a} vs ${b}: ${n} games${diag ? " (conference games)" : ""}`}
                          className={cn("tnum flex h-14 w-20 flex-col items-center justify-center rounded-md text-sm font-semibold text-ink hover:outline hover:outline-2 hover:outline-ink-3", diag && "hatch bg-surface-2", sel && "outline outline-2 outline-ink")}
                          style={diag ? undefined : { background: `color-mix(in oklab, var(--cat-conf) ${Math.round((n / max) * 70) + (n ? 6 : 0)}%, var(--surface))` }}
                        >
                          {n}
                          {diag && <span className="text-[9px] font-normal uppercase tracking-wider text-ink-3">{a === "Independent" ? "—" : "conf"}</span>}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-3">Shade = off-diagonal nonconference volume (single hue, darker = more). Diagonal cells are conference games and are not shaded. Notre Dame appears as Independent. Click a cell to list its games.</p>
        </div>
      </Card>
      {drill && (
        <Card id="drill">
          <CardHeader eyebrow={`${drill.length} games`} title={`${ca} × ${cb}${scope === "all" ? " · 2027–2031" : ` · ${scope}`}`} />
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {drill.slice(0, 120).map((g) => (
              <MatchupCard key={g.id} game={g} showWeek />
            ))}
          </div>
          {drill.length > 120 && <p className="px-5 pb-4 text-xs text-ink-3">Showing first 120 of {drill.length}. Narrow the season scope to see fewer.</p>}
        </Card>
      )}
    </div>
  );
}

function Balance({ ds }: { ds: Dataset }) {
  const rows = p4Balance(ds);
  const check = p4BalanceMatchesWorkbook(ds, workbook);
  return (
    <Card>
      <CardHeader eyebrow="Mirrors 08 | P4 Balance" title="Nonconference P4 games between affiliations" action={<span className={cn("text-sm font-semibold", check.ok ? "text-ok" : "text-bad")}>{check.ok ? "✓ matches workbook" : `${check.mismatches.length} mismatches`}</span>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className={th}>Pairing</th>
              {SEASONS.map((s) => (
                <th key={s} className={th}>
                  {s}
                </th>
              ))}
              <th className={th}>5-yr</th>
              <th className={th}>Range</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const vals = SEASONS.map((s) => r.byYear[s]);
              return (
                <tr key={r.a + r.b} className="border-t border-line">
                  <td className="px-3 py-2 font-medium">
                    {r.a} – {r.b}
                  </td>
                  {vals.map((v, i) => (
                    <td key={i} className={td}>
                      {v}
                    </td>
                  ))}
                  <td className={cn(td, "font-semibold")}>{r.total}</td>
                  <td className={td}>{Math.max(...vals) - Math.min(...vals)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Crossplay({ ds }: { ds: Dataset }) {
  const rows = teamCrossplay(ds);
  return (
    <Card>
      <CardHeader eyebrow="Mirrors 09 | Team Crossplay · 2027–2031" title="Per-team P4 nonconference exposure" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              <th className={th}>Team</th>
              <th className={th}>League</th>
              {AFFILIATIONS.map((c) => (
                <th key={c} className={th}>
                  vs {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team} className="border-t border-line">
                <td className="px-3 py-1.5">
                  <Link href={teamHref(r.slug)} className="font-medium hover:text-accent hover:underline">
                    {r.team}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-ink-3">{r.conference}</td>
                {AFFILIATIONS.map((c) => (
                  <td key={c} className={td}>
                    {r.per[c] ? (
                      <span title={`${r.per[c].opponents.size} distinct: ${[...r.per[c].opponents].join(", ")}`}>
                        {r.per[c].games} <span className="text-xs text-ink-3">({r.per[c].opponents.size})</span>
                      </span>
                    ) : (
                      <span className="text-ink-3">own</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-3 text-xs text-ink-3">Games over five seasons (distinct opponents in parentheses).</p>
    </Card>
  );
}

function Repeats({ ds, protectedKeys }: { ds: Dataset; protectedKeys: Set<string> }) {
  const rows = repeatPairs(ds, protectedKeys);
  const wbKeys = new Set(workbook.repeatAudit.map((r) => pairKey(r.teamA, r.teamB)));
  const agree = rows.length === workbook.repeatAudit.length && rows.every((r) => wbKeys.has(pairKey(r.a, r.b)));
  return (
    <Card>
      <CardHeader eyebrow="Mirrors 10 | P4 Repeat Audit" title="Repeated nonconference pairings" action={<span className={cn("text-sm font-semibold", agree ? "text-ok" : "text-bad")}>{agree ? `✓ ${rows.length} pairs match workbook` : "differs from workbook"}</span>} />
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>Pairing</th>
            <th className={th}>Times</th>
            <th className={th}>Seasons</th>
            <th className={th}>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.a + r.b} className="border-t border-line">
              <td className="px-3 py-2 font-medium">
                {r.a} – {r.b}
              </td>
              <td className={td}>{r.count}</td>
              <td className={td}>
                {r.games.map((g, i) => (
                  <span key={g.id}>
                    <Link href={gameHref(g.id)} className="hover:text-accent hover:underline">
                      {g.season}
                    </Link>
                    {i < r.games.length - 1 ? ", " : ""}
                  </span>
                ))}
              </td>
              <td className="px-3 py-2">{r.protected ? <span className="font-semibold text-accent">Protected annual rivalry</span> : <span className="text-ink-2">Repeat to examine</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function G6({ scope }: { scope: SeasonScope }) {
  const mix = g6Mix(workbook, scope);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader eyebrow="From 11 | G6 Assignments" title="Regional affinity" />
        <div className="p-4">
          <HBars data={mix.affinity} ariaLabel="G6 games by regional affinity" color="var(--cat-g6)" />
        </div>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-3">Affinity is the model’s state/region heuristic, not a travel distance.</p>
      </Card>
      <Card>
        <CardHeader eyebrow="G6 league of opponent" title="League mix" />
        <div className="p-4">
          <HBars data={mix.league} ariaLabel="G6 games by opponent league" color="var(--cat-g6)" />
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader eyebrow={`${mix.rows.length} assignments`} title="Assignments" />
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr>
                <th className={th}>Year</th>
                <th className={th}>Power team</th>
                <th className={th}>G6 opponent</th>
                <th className={th}>League</th>
                <th className={th}>Affinity</th>
                <th className={th}>Wk</th>
                <th className={th}>Site</th>
                <th className={th}>Origin</th>
              </tr>
            </thead>
            <tbody>
              {mix.rows.map((r) => (
                <tr key={r.year + r.powerTeam} className="border-t border-line">
                  <td className={td}>{r.year}</td>
                  <td className="px-3 py-1.5">
                    <Link href={teamHref(slugify(r.powerTeam), r.year)} className="hover:underline">
                      {r.powerTeam}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">
                    <Link href={`/g6/${slugify(r.g6Opponent)}`} className="hover:underline">
                      {r.g6Opponent}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 text-ink-2">{r.g6League}</td>
                  <td className="px-3 py-1.5 text-ink-2">{r.affinity}</td>
                  <td className={td}>{r.week}</td>
                  <td className="px-3 py-1.5">{r.site}</td>
                  <td className="px-3 py-1.5 text-ink-3">{r.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function NeutralByes({ ds, scope }: { ds: Dataset; scope: SeasonScope }) {
  const neutral = neutralGames(ds, scope);
  const byes = byesByWeek(ds, scope);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader eyebrow={`${neutral.length} games`} title="Neutral-site games" />
        <ul className="divide-y divide-line">
          {neutral.map((g) => (
            <li key={g.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
              <span className="tnum w-20 shrink-0 text-ink-3">
                {g.season} · W{g.week}
              </span>
              <span className="min-w-0">
                <Link href={gameHref(g.id)} className="font-medium hover:text-accent hover:underline">
                  {g.away} vs {g.home}
                </Link>
                <span className="block text-xs text-ink-3">
                  {g.venue} · {g.type} · admin. home {g.home} · {formatDate(g.date)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader eyebrow="Power/ND programs idle each week" title="Byes by week" />
        <div className="p-4">
          <Bars ariaLabel="Number of Power programs on bye per week" data={byes.map((b) => ({ week: `W${b.week}`, Byes: b.byes }))} x="week" series={[{ key: "Byes", label: "Byes", color: "var(--cat-conf)" }]} />
        </div>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-3">Every program has exactly two byes per season (validated): {scope === "all" ? "340 team-seasons × 2 = 680" : "68 × 2 = 136"} bye-weeks in total.</p>
      </Card>
    </div>
  );
}

function Coverage({ ds }: { ds: Dataset }) {
  return (
    <div className="space-y-4">
      <Callout>Each conference pair must have each school as administrative host at least once in 2027–2031. Neutral-site rivalry games satisfy this administratively only.</Callout>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {POWER_CONFERENCES.map((c) => {
          const cov = allPairCoverage(ds, c);
          const pass = cov.filter((p) => p.pass).length;
          const neutral = cov.filter((p) => p.involvesNeutral).length;
          return (
            <Link key={c} href={`/conferences/${conferenceSlug(c)}#coverage`} className="rounded-xl border border-line bg-surface p-4 hover:border-ink-3">
              <div className="flex items-center gap-2 font-display text-lg font-semibold">
                <ConferenceLogo name={c} size="sm" />
                {c}
              </div>
              <div className="tnum mt-2 font-display text-3xl font-semibold text-ok">
                {pass}/{cov.length}
              </div>
              <div className="text-xs text-ink-3">pairs PASS · {neutral} involve a neutral site</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-ok" style={{ width: `${(pass / cov.length) * 100}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
      <p className="tnum text-sm text-ink-2">
        Total: {allPairCoverage(ds).filter((p) => p.pass).length} / {allPairCoverage(ds).length} unordered intra-conference pairings (workbook 05 | Conference H-A: {workbook.conferenceHA.filter((r) => r.coverage === "PASS").length} PASS).
      </p>
    </div>
  );
}

function G6Home({ ds }: { ds: Dataset }) {
  const rows = SEASONS.map((s) => {
    const g6 = (ds.byYear.get(s) ?? []).filter((g) => g.type === "G6");
    const nd = g6.filter((g) => [g.home, g.away].includes("Notre Dame"));
    const p4 = g6.filter((g) => !nd.includes(g));
    const ok = p4.filter((g) => g.homeIsPower && !g.awayIsPower && g.siteType === "Campus" && g.venue === `${g.home} campus`);
    return { s, total: p4.length, ok: ok.length, nd: nd[0] };
  });
  const published = g6Overrides.filter((o) => o.Prior.Status === "Published");
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader eyebrow="Mandatory rule · Notre Dame–Navy exempt" title="G6 Home-Site Compliance" action={<span className="tnum text-sm font-semibold text-ok">{rows.reduce((n, r) => n + r.ok, 0)}/{rows.reduce((n, r) => n + r.total, 0)} on P4 campuses</span>} />
        <div className="grid gap-px bg-line sm:grid-cols-5">
          {rows.map((r) => (
            <div key={r.s} className="bg-surface px-4 py-3">
              <div className="tnum text-xs font-semibold text-ink-3">{r.s}</div>
              <div className={cn("tnum font-display text-2xl font-semibold", r.ok === r.total ? "text-ok" : "text-bad")}>
                {r.ok}/{r.total}
              </div>
              <div className="text-[11px] text-ink-3">conference-member G6 games at home</div>
              {r.nd && (
                <Link href={gameHref(r.nd.id)} className="mt-2 block text-[11px] text-ink-2 hover:underline">
                  Exempt: Notre Dame–Navy at {r.nd.home} campus
                </Link>
              )}
            </div>
          ))}
        </div>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-3">Zero P4 road or neutral-site G6 games in any season. Notre Dame–Navy is the only G6 game allowed away or neutral.</p>
      </Card>
      <Card>
        <CardHeader eyebrow={`${published.length} published commitments relocated`} title="Historical published-venue conflicts" />
        <G6OverridesTable rows={published} caption="Published G6 venues overridden by the home-campus rule" />
        <p className="border-t border-line px-4 py-3 text-xs text-ink-3">These pairings were published; the new campus sites are modeled and not announced by the schools.</p>
      </Card>
      <Card>
        <CardHeader eyebrow="data/g6_venue_overrides.json" title={`All ${g6Overrides.length} G6 site corrections`} />
        <details className="group">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-accent">Show all {g6Overrides.length} corrections</summary>
          <G6OverridesTable rows={g6Overrides} caption="All G6 site corrections" />
        </details>
      </Card>
    </div>
  );
}
