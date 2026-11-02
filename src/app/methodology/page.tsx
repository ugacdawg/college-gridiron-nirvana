import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { ProvenanceBadge } from "@/components/badges";
import { ExceptionsTable } from "@/components/exceptions-table";
import { Callout, Card, CardHeader, ExternalLink, PageHeader } from "@/components/ui";
import { dataset, g6Overrides, validationReport, versionInfo, workbook } from "@/lib/data";
import { G6OverridesTable } from "@/components/g6-overrides";
import { ACC_EIGHT_GAME, SEASONS } from "@/lib/data/roster";
import { isHttpUrl, RAW_STATUSES, STATUS_INFO } from "@/lib/model";

export const metadata: Metadata = { title: "Methodology, provenance & exceptions" };

const RULES: [string, string][] = [
  ["Scenario", "A hypothetical 2027–2031 scheduling exercise produced by an optimization model. It is not an official NCAA, conference or school schedule, and contains no results, kickoff times, TV, odds or rankings."],
  ["Participants", "68 programs: 67 Power Four conference members (SEC 16, Big Ten 18, Big 12 16, ACC 17) plus independent Notre Dame."],
  ["Games per team", "Exactly 12 every season: 11 against the Power/Notre Dame pool and exactly 1 against a non-Power FBS (G6) program. No FCS games."],
  ["Game counts", "Each season has 442 unique games — 301 conference, 73 P4 nonconference, 68 G6 — so 2,210 over five years. Power-vs-Power games count once even though they appear in two team schedules."],
  ["Conference mandates", "Nine conference games for SEC, Big Ten and Big 12 members. ACC: sixteen teams play nine and one plays eight each season because the league has 17 members."],
  ["ACC eight-game exception", SEASONS.map((s) => `${s} ${ACC_EIGHT_GAME[s].team} (${ACC_EIGHT_GAME[s].basis === "Published" ? "published" : "modeled assumption"})`).join("; ") + "."],
  ["Notre Dame", "Independent with zero conference games. All 11 Power-pool games are P4 nonconference, including ACC opponents under the scheduling arrangement (never relabeled as conference games). Notre Dame–Navy is protected every year and is Notre Dame’s one G6 game. Notre Dame–USC is on hiatus 2027–2029 and scheduled in 2030 and 2031."],
  ["Calendar", "Fourteen weekly slots, Week 0 through Week 13, each a modeled Saturday. Every participant has exactly two byes. Dates are calendar days, not timestamps; no kickoff times exist."],
  ["Home and away", "Over five seasons, every intra-conference pair has each member as administrative host at least once (529/529). Florida–Georgia (Tampa 2027, Jacksonville 2028–31) and Oklahoma–Texas (Cotton Bowl) are neutral-site games whose administrative home alternates for accounting only — not campus visits."],
  ["G6 home-campus rule", "Every G6 game for the 67 SEC, Big Ten, Big 12 and ACC schools is played on the Power Four school's own campus: 335 of 335 over five seasons, with no road or neutral-site G6 games. The only exception is Notre Dame–Navy, which alternates Notre Dame's campus (2027, 2029, 2031) and Navy's (2028, 2030). Applying the rule changed 68 G6 site records without changing any opponent, week, date or Game ID. Seven of those were published commitments; they are labeled “Venue override”, meaning the modeled campus site is not an officially renegotiated venue."],
  ["Bye spacing (v2.0)", "Each team's two byes are separated by at least 4 games, so back-to-back byes never occur."],
  ["Non-conference repeats (v2.0)", "No P4 non-conference pair meets in consecutive seasons, except the six protected annual rivalries and the published multi-year series listed under Version history."],
  ["Clemson–Notre Dame (v2.0)", "Treated as an annual series. The sources list 2027, 2028, 2029 and 2031; the 2030 game (Clemson at Notre Dame) is model-added."],
  ["Pac-12 classification", "Rebuilt Pac-12 programs are classified as non-Power (G6) in this particular model and are not recategorized from external sources."],
  ["G6 programs", "The source covers only G6 games against the 68 participants. A G6 page lists P4-model appearances, never a full season."],
  ["Published commitments", "“Published” marks a matchup/site taken from a cited source. It does not make the modeled week or date official. Ingested commitments are not an exhaustive audit of every athletic department’s 2027–2031 contracts."],
];

export default function MethodologyPage() {
  const moved = Object.entries(versionInfo.diff.movedWeeks).map(([id, m]) => ({ g: dataset.byId.get(id)!, ...m }));
  const added = versionInfo.diff.newGameIds.map((id) => dataset.byId.get(id)!);
  const failed = validationReport.checks.filter((c) => !c.pass);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={`${versionInfo.name} · released ${versionInfo.released} · how to read this scenario`} title="Methodology, provenance & exceptions">
        College Gridiron Nirvana is a read-only explorer over a fixed, model-generated scenario. Everything you see is derived from the supplied fixture feed and audit workbook — nothing is fetched live, scraped or invented.
      </PageHeader>

      <Callout tone="warn" title="Hypothetical — not an official schedule">
        Neutral sites and administrative host designations are accounting labels, not physical campus home games. Published matchup and venue commitments are distinct from model-assigned weeks and dates.
      </Callout>

      <Card>
        <CardHeader eyebrow="Model rules" title="What the scenario guarantees" />
        <dl className="divide-y divide-line">
          {RULES.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[220px_1fr] sm:px-5">
              <dt className="font-semibold">{k}</dt>
              <dd className="leading-relaxed text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardHeader eyebrow="Raw Status values → display" title="Provenance designations" />
        <ul className="divide-y divide-line">
          {RAW_STATUSES.map((s) => (
            <li key={s} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[260px_1fr] sm:px-5">
              <span className="flex items-center gap-2">
                <ProvenanceBadge status={s} /> <code className="text-xs text-ink-3">“{s}”</code>
              </span>
              <span className="text-ink-2">
                <strong className="text-ink">{STATUS_INFO[s].label}.</strong> {STATUS_INFO[s].description}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card id="validation">
        <CardHeader
          eyebrow="npm run data:prepare · rerun on every build"
          title="Validation report"
          action={<span className={failed.length ? "text-sm font-semibold text-bad" : "text-sm font-semibold text-ok"}>{validationReport.checks.length - failed.length}/{validationReport.checks.length} pass</span>}
        />
        <ul className="divide-y divide-line">
          {validationReport.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-4 py-2.5 text-sm sm:px-5">
              {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-label="pass" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-label="fail" />}
              <span className="min-w-0 flex-1">
                <span className="font-medium">{c.label}</span>
                <span className="block text-xs text-ink-3">
                  expected {c.expected} · actual {c.actual}
                </span>
                {c.detail && c.detail.length > 0 && <span className="block text-xs text-bad">{c.detail.join("; ")}</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-4 py-3 text-xs text-ink-3 sm:px-5">
          Inputs:{" "}
          {validationReport.inputs.map((i) => (
            <span key={i.file} className="mr-3 inline-block">
              <code>{i.file}</code> ({(i.bytes / 1024).toFixed(0)} KB, sha256 {i.sha256.slice(0, 10)}…)
            </span>
          ))}
        </div>
      </Card>

      <Card id="version">
        <CardHeader eyebrow={`Released ${versionInfo.released} · previous version archived in ${versionInfo.previous.archive}`} title={`Version history: ${versionInfo.name}`} />
        <div className="space-y-4 p-4 text-sm sm:p-5">
          <ul className="list-disc space-y-1 pl-5">
            {versionInfo.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="text-ink-2">
            Compared with v{versionInfo.previous.version}: <strong>{moved.length}</strong> games changed week, <strong>{versionInfo.diff.removed.length}</strong> model-generated non-conference games were replaced by <strong>{added.length}</strong> new pairings, and no published game was removed. Produced by <code className="text-xs">{versionInfo.producedBy}</code>.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="eyebrow mb-1">Removed in v{versionInfo.version}</div>
              <ul className="space-y-1">
                {versionInfo.diff.removed.map((d) => (
                  <li key={d["Game ID"]} className="text-ink-2">
                    {d.Year} · {d.Away} at {d.Home} <span className="text-xs text-ink-3">({d.Status})</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-1">Added in v{versionInfo.version}</div>
              <ul className="space-y-1">
                {added.map((g) => (
                  <li key={g.id}>
                    <Link href={`/games/${g.id}`} className="hover:text-accent hover:underline">
                      {g.season} · Wk {g.week} · {g.away} at {g.home}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <div className="eyebrow mb-1">Allowed consecutive-season series</div>
            <p className="text-ink-2">
              The six protected rivalries, plus: {versionInfo.rules.repeatExceptions.map(([a, b, ys]) => `${a}–${b} (${ys.join(", ")})`).join("; ")}.
            </p>
          </div>
          <details>
            <summary className="cursor-pointer font-medium text-accent">Show all {moved.length} week changes</summary>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {moved
                  .sort((x, z) => x.g.season - z.g.season || x.from - z.from)
                  .map((m) => (
                    <tr key={m.g.id} className="border-t border-line">
                      <td className="tnum w-14 py-1.5 text-ink-3">{m.g.season}</td>
                      <td className="tnum w-32 py-1.5">
                        Wk {m.from} → <strong>Wk {m.to}</strong>
                      </td>
                      <td className="py-1.5">
                        <Link href={`/games/${m.g.id}`} className="hover:text-accent hover:underline">
                          {m.g.away} {m.g.isNeutral ? "vs" : "at"} {m.g.home}
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow="Workbook sheet 13 | Contract Exceptions" title="Known conflicts and model treatments" />
        <ExceptionsTable rows={workbook.contractExceptions} />
      </Card>

      <Card id="g6-venues">
        <CardHeader eyebrow="data/g6_venue_overrides.json" title="G6 venue corrections: original vs modeled site" />
        <p className="px-4 pt-3 text-sm text-ink-2 sm:px-5">
          The seven highlighted rows were published commitments; their modeled P4-campus sites would require contract amendments that have not been announced. The remaining {g6Overrides.length - 7} were model-generated pairings re-oriented to the P4 campus.
        </p>
        <G6OverridesTable rows={[...g6Overrides].sort((a, b) => Number(b.Prior.Status === "Published") - Number(a.Prior.Status === "Published") || a["Game ID"].localeCompare(b["Game ID"]))} caption="G6 venue corrections" />
      </Card>

      <Card>
        <CardHeader eyebrow="Workbook sheet 12 | Conference Sources" title="Published vs modeled conference coverage" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Conference</th>
                <th className="px-3 py-2 text-right">Games</th>
                <th className="px-3 py-2 text-right">Published</th>
                <th className="px-3 py-2 text-right">Coverage</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {workbook.conferenceSources.map((r) => (
                <tr key={r.year + r.conference} className="border-b border-line last:border-0">
                  <td className="tnum px-3 py-1.5">{r.year}</td>
                  <td className="px-3 py-1.5 font-medium">{r.conference}</td>
                  <td className="tnum px-3 py-1.5 text-right">{r.conferenceGames}</td>
                  <td className="tnum px-3 py-1.5 text-right">{r.publishedLocked}</td>
                  <td className="tnum px-3 py-1.5 text-right">{Math.round(r.coverage * 100)}%</td>
                  <td className="px-3 py-1.5 text-ink-2">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Workbook sheet 14 | Sources" title="Sources" />
          <ul className="divide-y divide-line">
            {workbook.sources.map((s) => (
              <li key={s.url + s.label} className="px-4 py-2.5 text-sm sm:px-5">
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-ink-3">
                  {s.organization} · {s.coverage}
                </div>
                {isHttpUrl(s.url) ? <ExternalLink href={s.url} className="text-xs">{s.url}</ExternalLink> : <span className="text-xs">{s.url}</span>}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader eyebrow="Workbook sheet 15 | Assumptions" title="Assumptions" />
          <dl className="divide-y divide-line">
            {workbook.assumptions.map((a) => (
              <div key={a.rule} className="px-4 py-2.5 text-sm sm:px-5">
                <dt className="font-medium">{a.rule}</dt>
                <dd className="text-ink-2">{a.explanation}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card>
        <CardHeader eyebrow="Maintainers" title="Refreshing the data" />
        <ol className="list-decimal space-y-1.5 py-4 pl-9 pr-5 text-sm text-ink-2">
          <li>
            Regenerate the scenario with the Python sources in <code>source/College_Football_Model_Source_2027-2031.zip</code> (needs NumPy, SciPy, NetworkX, artifact_tool) — optional; the app never runs Python.
          </li>
          <li>
            Replace <code>data/cfb_full_games.json</code> and <code>data/College_Football_P4_Scheduling_Model_2027-2031.xlsx</code> (same basenames).
          </li>
          <li>
            Run <code>npm run data:prepare</code>. It rebuilds <code>src/data/generated/*.json</code>, re-derives every index and fails loudly if any invariant or workbook ↔ JSON reconciliation breaks.
          </li>
          <li>
            Run <code>npm test</code> and <code>npm run build</code>. Provenance stays visible; there is no live synchronization.
          </li>
        </ol>
      </Card>
    </div>
  );
}
