import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, MapPin } from "lucide-react";
import { CategoryBadge, ConferenceChip, ProvenanceBadge, TeamBadge } from "@/components/badges";
import { MatchupCard } from "@/components/schedule";
import { Callout, Card, CardHeader, ExternalLink, LinkButton } from "@/components/ui";
import { g6OverrideById, workbook, dataset, versionInfo } from "@/lib/data";
import { ACC_EIGHT_GAME, isPowerTeam, type Season } from "@/lib/data/roster";
import { formatDate, isHttpUrl, pairKey, RAW_KEYS, STATUS_INFO, TYPE_LABEL } from "@/lib/model";
import { programHref, weekHref } from "@/lib/routes";
import { meetings } from "@/lib/selectors/team";
import { protectedKeys, rivalries } from "@/lib/data/derived";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = dataset.byId.get((await params).id);
  return { title: g ? `${g.away} ${g.isNeutral ? "vs" : "at"} ${g.home} · ${g.season} Week ${g.week}` : "Game not found" };
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const g = dataset.byId.get(id);
  if (!g) notFound();
  const info = STATUS_INFO[g.status];
  const others = meetings(dataset, g.home, g.away).filter((x) => x.id !== g.id);
  const rivalry = rivalries.find((r) => pairKey(r.teamA, r.teamB) === pairKey(g.home, g.away));
  const isProtected = protectedKeys.has(pairKey(g.home, g.away));
  const exceptions = workbook.contractExceptions.filter((e) => {
    const names = e.matchup.split("–").map((s) => s.trim());
    return names.length === 2 && names.every((n) => n === g.home || n === g.away);
  });
  const accNote = g.type === "Conference" && g.categoryConference === "ACC" ? ACC_EIGHT_GAME[g.season as Season] : null;
  const pinned = g.requestedWeek !== null;
  const override = g6OverrideById.get(g.id);
  const ndNavy = g.type === "G6" && [g.home, g.away].includes("Notre Dame");

  const Facts: [string, React.ReactNode][] = [
    ["Season", g.season],
    ["Week", <Link key="w" href={weekHref(g.season, g.week)} className="text-accent hover:underline">{g.weekLabel}</Link>],
    ["Modeled date", <span key="d">{formatDate(g.date)} <span className="text-ink-3">(modeled Saturday · kickoff time unknown)</span></span>],
    ["Category", <span key="c" className="inline-flex items-center gap-2"><CategoryBadge type={g.type} /> {TYPE_LABEL[g.type]}</span>],
    ["Category conference", <span key="cc">{g.categoryConference} <span className="text-ink-3">— the conference associated with this game/category (raw “Conference” field)</span></span>],
    ["Away (administrative)", <span key="a" className="inline-flex items-center gap-2">{g.away} <ConferenceChip conference={g.awayConference} /></span>],
    ["Home (administrative)", <span key="h" className="inline-flex items-center gap-2">{g.home} <ConferenceChip conference={g.homeConference} /></span>],
    ["Venue", g.venue],
    ["Site type", g.isNeutral ? "Neutral site" : "Campus"],
    ["Requested / pinned week", pinned ? `Week ${g.requestedWeek}${g.requestedWeek === g.week ? " (honored)" : ` (model placed it in Week ${g.week})`}` : "None — week assigned by the model"],
    ["Provenance", <span key="p" className="inline-flex flex-wrap items-center gap-2"><ProvenanceBadge status={g.status} full /> <span className="text-ink-3">raw status “{g.status}”</span></span>],
    ["Source", g.sourceUrl ? <ExternalLink key="s" href={g.sourceUrl}>{g.sourceUrl}</ExternalLink> : g.sourceNote ? <span key="s">{g.sourceNote} <span className="text-ink-3">(no URL)</span></span> : <span key="s" className="text-ink-3">No source cited — model-generated</span>],
    ["Game ID", <code key="id" className="font-mono text-[13px]">{g.id}</code>],
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="no-print text-xs text-ink-3">
        <Link href={weekHref(g.season, g.week)} className="hover:text-ink">
          {g.season} Week {g.week} board
        </Link>{" "}
        / <span className="text-ink-2">{g.id}</span>
      </nav>

      <section className="yardlines rounded-2xl border border-line bg-surface p-5 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <CategoryBadge type={g.type} />
          <ProvenanceBadge status={g.status} />
          {isProtected && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">Protected annual rivalry</span>}
          <span className="tnum ml-auto text-sm text-ink-2">
            {g.season} · Week {g.week} · {formatDate(g.date)}
          </span>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          {[{ name: g.away, conf: g.awayConference, role: g.isNeutral ? "Admin. away" : "Away" }, null, { name: g.home, conf: g.homeConference, role: g.isNeutral ? "Admin. home" : "Home" }].map((side, i) =>
            side ? (
              <div key={side.name} className={i === 2 ? "sm:text-right" : ""}>
                <div className={`flex items-center gap-3 ${i === 2 ? "sm:flex-row-reverse" : ""}`}>
                  <TeamBadge name={side.name} size="lg" />
                  <div>
                    <div className="eyebrow">{side.role}</div>
                    <Link href={programHref(side.name, g.season)} className="font-display text-2xl font-semibold tracking-tight hover:text-accent hover:underline sm:text-3xl">
                      {side.name}
                    </Link>
                    <div className={`mt-1 flex items-center gap-1.5 ${i === 2 ? "sm:justify-end" : ""}`}>
                      <ConferenceChip conference={side.conf} long />
                      {!isPowerTeam(side.name) && <span className="text-[11px] text-ink-3">P4-model appearances only</span>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key="mid" className="text-center font-display text-lg font-semibold text-ink-3">
                {g.isNeutral ? <span className="text-accent">vs · neutral</span> : "at"}
              </div>
            ),
          )}
        </div>
        <p className="mt-5 flex items-center gap-1.5 text-sm text-ink-2">
          <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> {g.venue}
        </p>
      </section>

      {(versionInfo.diff.movedWeeks[g.id] || versionInfo.diff.newGameIds.includes(g.id)) && (
        <Callout title={`Changed in model v${versionInfo.version}`}>
          {versionInfo.diff.newGameIds.includes(g.id) ? (
            <>This pairing was added in v{versionInfo.version} ({versionInfo.released}) to satisfy the version&apos;s scheduling rules; it is model-generated, not a known contract.</>
          ) : (
            <>
              In model v{versionInfo.previous.version} this game was in Week {versionInfo.diff.movedWeeks[g.id].from}; v{versionInfo.version} moved it to Week {g.week} under the bye-spacing rule. Matchup, site and status are unchanged.
            </>
          )}{" "}
          <Link href="/methodology#version" className="font-medium underline">
            Version history →
          </Link>
        </Callout>
      )}
      {override && (
        <Callout tone="warn" title={g.status === "Venue override" ? "Venue overridden — modeled, not an official venue change" : "Site corrected under the G6 home-campus rule"}>
          Every Power Four school hosts its G6 opponent on its own campus in this scenario. Originally this game was{" "}
          <strong>
            {override.Prior.Away} {override.Prior["Site type"] === "Neutral" ? "vs" : "at"} {override.Prior.Home} — {override.Prior.Venue}
          </strong>{" "}
          ({override.Prior.Status}
          {isHttpUrl(override.Prior["Source URL"]) ? (
            <>
              ; <ExternalLink href={override.Prior["Source URL"]}>original source</ExternalLink>
            </>
          ) : null}
          ). The model moved it to <strong>{override.New.Venue}</strong>.
          {g.status === "Venue override" && " The original site came from a published commitment; this relocation would require a contract amendment and has not been announced by either school."}
        </Callout>
      )}
      {ndNavy && (
        <Callout title="Notre Dame–Navy exception">
          The only G6 game exempt from the Power Four home-campus rule. Played at {g.venue} this season (the baseline alternates Notre Dame 2027/2029/2031 and Navy 2028/2030).
        </Callout>
      )}

      {g.isNeutral && (
        <Callout tone="warn" title="Neutral-site game">
          Played at {g.venue}. {g.home} is the <em>administrative</em> home team for accounting (e.g. conference home/away rotation); this is <strong>not</strong> a campus home game for either school.
        </Callout>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader eyebrow="Fixture record" title="Game information" />
          <dl className="divide-y divide-line">
            {Facts.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[200px_1fr] sm:px-5">
                <dt className="text-ink-3">{k}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader eyebrow="What this designation means" title={info.label} />
            <p className="px-4 py-3 text-sm leading-relaxed text-ink-2 sm:px-5">{info.description}</p>
            <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-ink-3 sm:px-5">
              Published matchup/venue commitments are distinct from model-assigned weeks and dates. Even “Published” does not mean this date is official.
            </p>
          </Card>
          {accNote && (
            <Callout title="ACC uneven membership">
              In {g.season}, {accNote.team} plays eight ACC games ({accNote.basis === "Published" ? "published designation" : "modeled assumption"}); all other ACC members play nine.
            </Callout>
          )}
          {rivalry && (
            <Callout tone={rivalry.annualExpected ? "ok" : "info"} title={rivalry.name ?? "Rivalry series"}>
              {rivalry.kind}. Modeled in {rivalry.seasonsPresent.length} of 5 seasons.{" "}
              <Link href={`/rivalries/${rivalry.slug}`} className="font-medium underline">
                Rivalry detail →
              </Link>
            </Callout>
          )}
          {exceptions.map((e) => (
            <Callout key={e.year + e.exceptionType} tone="warn" title={`Contract exception · ${e.exceptionType} (${e.year})`}>
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {e.treatment}. {e.why}.
            </Callout>
          ))}
        </div>
      </div>

      {others.length > 0 && (
        <Card>
          <CardHeader eyebrow="2027–2031" title={`Other modeled meetings: ${g.away} & ${g.home}`} />
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
            {others.map((x) => (
              <MatchupCard key={x.id} game={x} showWeek />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader eyebrow="Audit" title="Original input record (cfb_full_games.json)" />
        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="text-sm">
            <tbody>
              {RAW_KEYS.map((k) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <th scope="row" className="py-1.5 pr-6 text-left font-mono text-xs font-normal text-ink-3">
                    {k}
                  </th>
                  <td className="py-1.5 font-mono text-xs">{JSON.stringify(g.raw[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="no-print flex flex-wrap gap-2">
        <LinkButton href={weekHref(g.season, g.week)} size="sm">
          ← {g.season} Week {g.week} board
        </LinkButton>
        <LinkButton href={programHref(g.away, g.season)} size="sm">
          {g.away} schedule
        </LinkButton>
        <LinkButton href={programHref(g.home, g.season)} size="sm">
          {g.home} schedule
        </LinkButton>
      </div>
    </div>
  );
}
