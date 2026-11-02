import type { Metadata } from "next";
import Link from "next/link";
import { ConferenceChip, TeamBadge } from "@/components/badges";
import { ConferenceLogo } from "@/components/logo";
import { PageHeader } from "@/components/ui";
import { ACC_EIGHT_GAME, CONFERENCE_MEMBERS, POWER_CONFERENCES, SEASONS, conferenceSlug } from "@/lib/data/roster";
import { parseSeason } from "@/lib/routes";
import { allPairCoverage, conferenceGames } from "@/lib/selectors/conference";
import { dataset } from "@/lib/data";

export const metadata: Metadata = { title: "Conferences" };

export default async function ConferencesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const season = parseSeason(sp.season);
  return (
    <div>
      <PageHeader eyebrow={`${season} · four Power conferences + Notre Dame`} title="Conferences">
        Member programs, nine-game league mandates and the five-year home-and-away rotation. Every intra-conference pair must have each school as administrative host at least once in 2027–2031.
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {POWER_CONFERENCES.map((c) => {
          const cov = allPairCoverage(dataset, c);
          const games = conferenceGames(dataset, c, season).length;
          return (
            <Link key={c} href={`/conferences/${conferenceSlug(c)}?season=${season}`} className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ink-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight group-hover:text-accent">
                  <ConferenceLogo name={c} size="lg" decorative />
                  {c}
                </h2>
                <span className="tnum text-sm text-ink-3">{CONFERENCE_MEMBERS[c].length} members</span>
              </div>
              <dl className="tnum mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="eyebrow">{season} league games</dt>
                  <dd className="font-display text-xl font-semibold">{games}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Mandate</dt>
                  <dd className="font-display text-xl font-semibold">9</dd>
                </div>
                <div>
                  <dt className="eyebrow">H/A pairs</dt>
                  <dd className="font-display text-xl font-semibold">
                    {cov.filter((p) => p.pass).length}/{cov.length}
                  </dd>
                </div>
              </dl>
              {c === "ACC" && (
                <p className="mt-3 text-xs text-ink-2">
                  17 members → one team plays 8 each year: {SEASONS.map((s) => `${s} ${ACC_EIGHT_GAME[s].team}${ACC_EIGHT_GAME[s].basis === "Published" ? " (published)" : ""}`).join(" · ")}. 2028–31 designations are modeled assumptions.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-1">
                {CONFERENCE_MEMBERS[c].map((t) => (
                  <TeamBadge key={t} name={t} size="sm" />
                ))}
              </div>
            </Link>
          );
        })}
        <Link href={`/conferences/independent?season=${season}`} className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ink-3 md:col-span-2">
          <div className="flex items-center gap-3">
            <TeamBadge name="Notre Dame" size="md" />
            <div>
              <h2 className="font-display text-xl font-semibold group-hover:text-accent">Independent · Notre Dame</h2>
              <p className="text-sm text-ink-2">
                Zero conference games. All 11 Power-pool games are P4 nonconference (including ACC opponents under the scheduling arrangement); Navy is the one G6 game every year. <ConferenceChip conference="Independent" />
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
