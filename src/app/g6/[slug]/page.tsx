import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConferenceChip, TeamBadge } from "@/components/badges";
import { ConferenceLogo } from "@/components/logo";
import { MatchupCard } from "@/components/schedule";
import { Callout } from "@/components/ui";
import { workbook, dataset } from "@/lib/data";
import { G6_BY_SLUG, SEASONS } from "@/lib/data/roster";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = G6_BY_SLUG.get((await params).slug);
  return { title: t ? `${t.name} — P4-model appearances` : "Program not found" };
}

export default async function G6Page({ params }: Props) {
  const t = G6_BY_SLUG.get((await params).slug);
  if (!t) notFound();
  const games = dataset.g6Appearances.get(t.name) ?? [];
  const state = workbook.g6Assignments.find((r) => r.g6Opponent === t.name)?.g6State;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <TeamBadge name={t.name} size="xl" />
        <div>
          <div className="eyebrow mb-1 flex items-center gap-2">
            <ConferenceLogo name={t.league} size="xs" /> <ConferenceChip conference={t.league} /> non-Power FBS (G6) in this model{state ? ` · ${state}` : ""}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t.name}</h1>
          <p className="mt-0.5 text-sm font-medium text-accent">P4-model appearance(s) only</p>
        </div>
      </div>
      <Callout tone="warn" title="This is not a full season schedule">
        The model only schedules games between G6 programs and the 68 Power/Notre Dame participants. {t.name}’s other games are outside the scenario and are not shown or implied.
        {t.league === "Pac-12" && " The rebuilt Pac-12 is classified as non-Power (G6) for this particular model."}
      </Callout>
      {SEASONS.map((s) => {
        const gs = games.filter((g) => g.season === s);
        return (
          <section key={s} aria-labelledby={`s-${s}`}>
            <h2 id={`s-${s}`} className="mb-2 flex items-baseline gap-2 font-display text-lg font-semibold">
              {s} <span className="text-sm font-normal text-ink-3">{gs.length} appearance{gs.length === 1 ? "" : "s"}</span>
            </h2>
            {gs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-ink-3">No P4-model appearance in {s}.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {gs.map((g) => (
                  <MatchupCard key={g.id} game={g} showWeek />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
