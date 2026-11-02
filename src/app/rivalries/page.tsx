import type { Metadata } from "next";
import Link from "next/link";
import { Lock, MapPin } from "lucide-react";
import { TeamBadge } from "@/components/badges";
import { cn, EmptyState, PageHeader } from "@/components/ui";
import { SEASONS } from "@/lib/data/roster";
import { parseSeason } from "@/lib/routes";
import type { Rivalry } from "@/lib/selectors/rivalries";
import { rivalries } from "@/lib/data/derived";

export const metadata: Metadata = { title: "Rivalries" };

const GROUPS = ["All", "SEC", "Big Ten", "Big 12", "ACC", "Cross-conference", "Special", "Notable"];

export default async function RivalriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const season = parseSeason(sp.season);
  const group = GROUPS.includes(sp.group ?? "") ? sp.group! : "All";
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = rivalries.filter(
    (r) =>
      (group === "All" || r.grouping === group) &&
      (!q || [r.teamA, r.teamB, r.name ?? ""].some((s) => s.toLowerCase().includes(q))),
  );
  const href = (g: string) => `/rivalries?season=${season}${g !== "All" ? `&group=${encodeURIComponent(g)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <PageHeader eyebrow={`${rivalries.filter((r) => r.annualExpected).length} annual series · games found by searching the fixtures`} title="Rivalry Explorer">
        Protected locks from workbook sheet <code className="text-[13px]">07 | Rivalry Locks</code> (conference and six cross-conference series), plus Notre Dame–Navy (annual, G6) and Notre Dame–USC (hiatus 2027–29). A few notable unprotected series are shown for context.
      </PageHeader>

      <form method="get" className="no-print mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="season" value={season} />
        {group !== "All" && <input type="hidden" name="group" value={group} />}
        <label htmlFor="riv-q" className="sr-only">
          Search rivalries
        </label>
        <input id="riv-q" name="q" defaultValue={sp.q ?? ""} placeholder="Search team or rivalry name…" className="h-9 w-72 rounded-lg border border-line bg-surface px-3 text-sm" />
        <button type="submit" className="h-9 rounded-lg bg-ink px-3 text-sm font-medium text-bg">
          Search
        </button>
      </form>
      <nav aria-label="Rivalry groups" className="no-print mb-6 flex flex-wrap gap-1.5">
        {GROUPS.map((g) => (
          <Link key={g} href={href(g)} aria-current={g === group ? "page" : undefined} className={cn("rounded-lg border px-2.5 py-1.5 text-[13px] font-medium", g === group ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:bg-surface-2")}>
            {g}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <EmptyState title="No rivalries match" action={<Link href={`/rivalries?season=${season}`} className="text-sm font-medium text-accent">Clear search</Link>}>
          Try a school name like “Georgia” or a rivalry name like “Iron Bowl”.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => (
            <RivalryTile key={r.slug} r={r} season={season} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RivalryTile({ r, season }: { r: Rivalry; season: number }) {
  const neutral = r.games.some((g) => g.isNeutral);
  return (
    <li>
      <Link href={`/rivalries/${r.slug}?season=${season}`} className="group block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-ink-3" data-testid="rivalry-tile">
        <div className="flex items-center gap-2">
          <TeamBadge name={r.teamA} size="sm" />
          <TeamBadge name={r.teamB} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold group-hover:text-accent">{r.name ?? `${r.teamA}–${r.teamB}`}</div>
            <div className="truncate text-xs text-ink-3">
              {r.teamA} – {r.teamB}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1" aria-label={`Modeled seasons: ${r.seasonsPresent.join(", ") || "none"}`}>
          {SEASONS.map((s) => {
            const on = r.seasonsPresent.includes(s);
            return (
              <span key={s} className={cn("tnum flex-1 rounded py-1 text-center text-[11px] font-semibold", on ? "bg-ink text-bg" : "hatch border border-dashed border-line-strong text-ink-3", s === season && "ring-2 ring-accent ring-offset-1 ring-offset-surface")}>
                {String(s).slice(2)}
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium", r.annualExpected ? "bg-accent-soft text-accent" : "border border-line text-ink-3")}>
            {r.annualExpected && <Lock className="h-3 w-3" aria-hidden="true" />}
            {r.kind}
          </span>
          {r.grouping !== "Special" && r.grouping !== "Notable" && <span className="rounded-md border border-line px-1.5 py-0.5 text-ink-2">{r.grouping}</span>}
          {neutral && (
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-accent px-1.5 py-0.5 text-accent">
              <MapPin className="h-3 w-3" aria-hidden="true" /> Neutral site
            </span>
          )}
          {r.seasonsMissing.length > 0 && <span className="text-ink-3">absent {r.seasonsMissing.join(", ")}</span>}
        </div>
      </Link>
    </li>
  );
}
