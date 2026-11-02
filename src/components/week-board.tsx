"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { AFFILIATIONS, G6_LEAGUES } from "@/lib/data/roster";
import { gamesCsv } from "@/lib/export/csv";
import { GAME_TYPES, PROVENANCE_LABEL, TYPE_LABEL, type Game, type GameType, type Provenance } from "@/lib/model";
import {
  countsByType,
  DEFAULT_FILTERS,
  filterWeekGames,
  groupGames,
  isFiltered,
  parseWeekFilters,
  serializeWeekFilters,
  type GroupBy,
  type SortBy,
  type VenueFilter,
  type WeekFilters,
} from "@/lib/selectors/week";
import { CategoryBadge } from "./badges";
import { ConferenceLogo } from "./logo";
import { CopyLinkButton, DownloadButton, PrintButton } from "./export-bar";
import { MatchupCard } from "./schedule";
import { buttonClass, cn, EmptyState } from "./ui";

export function WeekBoard({ games, year, week }: { games: Game[]; year: number; week: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const f = useMemo(() => parseWeekFilters(sp), [sp]);
  const [q, setQ] = useState(f.q);
  const [urlQ, setUrlQ] = useState(f.q);
  if (urlQ !== f.q) {
    // URL changed externally (back/forward, reset): adopt it
    setUrlQ(f.q);
    setQ(f.q);
  }

  const commit = (next: WeekFilters, mode: "push" | "replace" = "push") => {
    const qs = serializeWeekFilters(next).toString();
    const url = `${pathname}${qs ? `?${qs}` : ""}`;
    if (mode === "replace") router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  // Debounce search typing into the URL
  useEffect(() => {
    if (q === f.q) return;
    const t = setTimeout(() => commit({ ...f, q }, "replace"), 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const live = { ...f, q };
  const filtered = filterWeekGames(games, live);
  const groups = groupGames(filtered, f.group, f.sort);
  const typeCountsBase = countsByType(filterWeekGames(games, { ...live, types: [] }));
  const filteredCounts = countsByType(filtered);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const teamsInWeek = useMemo(() => [...new Set(games.flatMap((g) => [g.home, g.away]))].sort(), [games]);
  const g6Present = G6_LEAGUES.filter((l) => games.some((g) => g.homeConference === l || g.awayConference === l));

  const describe = () => {
    const parts: string[] = [];
    if (f.types.length) parts.push(`category: ${f.types.join(" or ")}`);
    if (f.confs.length) parts.push(`conference: ${f.confs.join(" or ")}`);
    if (f.teams.length) parts.push(`team: ${f.teams.join(" or ")}`);
    if (f.venue !== "all") parts.push(`venue: ${f.venue}`);
    if (f.prov.length) parts.push(`designation: ${f.prov.map((p) => PROVENANCE_LABEL[p]).join(" or ")}`);
    if (q.trim()) parts.push(`search “${q.trim()}”`);
    return parts.join("; ");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="no-print space-y-5" aria-label="Filters">
        <div>
          <label htmlFor="week-search" className="mb-1 block text-xs font-medium text-ink-2">
            Search home or away school
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              id="week-search"
              data-testid="week-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Georgia, Navy"
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
            />
          </div>
        </div>

        <FilterGroup label="Quick view">
          <QuickView types={f.types} onChange={(types) => commit({ ...f, q, types })} />
        </FilterGroup>

        <FilterGroup label="Game category">
          {GAME_TYPES.map((t) => (
            <Chip key={t} on={f.types.includes(t)} onClick={() => commit({ ...f, q, types: toggle(f.types, t) })} testId={`type-${t}`}>
              <CategoryBadge type={t} className="border-0 bg-transparent px-0" />
              <span className="sr-only">{TYPE_LABEL[t]}</span>
              <span className="tnum ml-auto text-ink-3">{typeCountsBase[t]}</span>
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Conference (either participant)">
          <div className="flex flex-wrap gap-1.5">
            {[...AFFILIATIONS, ...g6Present].map((c) => (
              <Chip key={c} compact on={f.confs.includes(c)} onClick={() => commit({ ...f, q, confs: toggle(f.confs, c) })} testId={`conf-${c}`}>
                {c !== "Independent" && <ConferenceLogo name={c} size="xs" />}
                {c}
                {(G6_LEAGUES as readonly string[]).includes(c) && <span className="text-[10px] text-ink-3">G6</span>}
              </Chip>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Teams">
          <select
            aria-label="Add a team filter"
            value=""
            onChange={(e) => e.target.value && commit({ ...f, q, teams: [...new Set([...f.teams, e.target.value])] })}
            className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm"
            data-testid="team-filter"
          >
            <option value="">Add a team playing this week…</option>
            {teamsInWeek.filter((t) => !f.teams.includes(t)).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {f.teams.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.teams.map((t) => (
                <button key={t} type="button" onClick={() => commit({ ...f, q, teams: f.teams.filter((x) => x !== t) })} className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 text-xs font-medium text-bg" aria-label={`Remove team filter ${t}`}>
                  {t} <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </FilterGroup>

        <FilterGroup label="Venue type">
          <Segmented<VenueFilter>
            value={f.venue}
            options={[["all", "All"], ["campus", "Campus"], ["neutral", "Neutral"]]}
            onChange={(v) => commit({ ...f, q, venue: v })}
            label="Venue type"
          />
        </FilterGroup>

        <FilterGroup label="Designation">
          {(["published", "protected", "override", "modeled"] as Provenance[]).map((p) => (
            <Chip key={p} on={f.prov.includes(p)} onClick={() => commit({ ...f, q, prov: toggle(f.prov, p) })} testId={`prov-${p}`}>
              {PROVENANCE_LABEL[p]}
            </Chip>
          ))}
        </FilterGroup>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-ink-2">
            Group
            <select value={f.group} onChange={(e) => commit({ ...f, q, group: e.target.value as GroupBy })} className="mt-1 block h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm" data-testid="group-by">
              <option value="none">None</option>
              <option value="category">Category</option>
              <option value="conference">Conference</option>
            </select>
          </label>
          <label className="text-xs font-medium text-ink-2">
            Sort
            <select value={f.sort} onChange={(e) => commit({ ...f, q, sort: e.target.value as SortBy })} className="mt-1 block h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm">
              <option value="matchup">Matchup (A–Z)</option>
              <option value="category">Category</option>
              <option value="designation">Designation</option>
            </select>
          </label>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-3">No time-of-day sort: kickoff times are not part of the model.</p>
      </aside>

      <section aria-labelledby="results-heading" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <div>
            <h2 id="results-heading" className="text-sm font-semibold" aria-live="polite" data-testid="result-count">
              Showing <span className="tnum">{filtered.length}</span> of <span className="tnum">{games.length}</span> games
            </h2>
            <p className="tnum mt-0.5 text-xs text-ink-3">
              {filteredCounts.Conference} conference · {filteredCounts["P4 nonconference"]} P4 nonconference · {filteredCounts.G6} G6
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            {isFiltered(live) && (
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => { setQ(""); commit({ ...DEFAULT_FILTERS, group: f.group, sort: f.sort }); }} data-testid="reset-filters">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset filters
              </button>
            )}
            <CopyLinkButton />
            <DownloadButton label="CSV" filename={`games-${year}-week-${week}${isFiltered(live) ? "-filtered" : ""}.csv`} mime="text/csv" build={() => gamesCsv(groups.flatMap((g) => g.games))} testId="week-csv" />
            <PrintButton />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No games match these filters"
            action={
              <button type="button" className={buttonClass("primary")} onClick={() => { setQ(""); commit(DEFAULT_FILTERS); }}>
                Reset filters
              </button>
            }
          >
            {year} Week {week} has {games.length} modeled games, but none match {describe() || "the current filters"}.
          </EmptyState>
        ) : (
          <div className="space-y-6">
            {groups.map((grp) => (
              <div key={grp.key}>
                {f.group !== "none" && (
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    {grp.label} <span className="tnum text-xs font-normal text-ink-3">{grp.games.length}</span>
                  </h3>
                )}
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {grp.games.map((g) => (
                    <MatchupCard key={g.id} game={g} season={year} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-ink-2">{label}</legend>
      <div className="flex flex-col gap-1.5">{children}</div>
    </fieldset>
  );
}

function Chip({ on, onClick, children, compact, testId }: { on: boolean; onClick: () => void; children: ReactNode; compact?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border text-left text-[13px] font-medium transition-colors",
        compact ? "px-2 py-1" : "w-full px-2.5 py-1.5",
        on ? "border-ink bg-ink/5 text-ink ring-1 ring-ink" : "border-line bg-surface text-ink-2 hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 rounded-lg border border-line bg-surface p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("rounded-md py-1 text-[13px] font-medium", value === v ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const QUICK: { key: string; label: string; types: GameType[] }[] = [
  { key: "all", label: "All games", types: [] },
  { key: "conf", label: "Conference", types: ["Conference"] },
  { key: "nonconf", label: "Non-conference", types: ["P4 nonconference", "G6"] },
  { key: "p4nc", label: "P4 non-con only", types: ["P4 nonconference"] },
];

/** One-click category presets; "Non-conference" = P4 non-conference + G6. */
function QuickView({ types, onChange }: { types: GameType[]; onChange: (t: GameType[]) => void }) {
  const same = (a: GameType[], b: GameType[]) => a.length === b.length && a.every((x) => b.includes(x));
  return (
    <div role="radiogroup" aria-label="Quick view" className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-0.5">
      {QUICK.map((q) => {
        const on = same(types, q.types) || (q.key === "all" && types.length === GAME_TYPES.length);
        return (
          <button
            key={q.key}
            type="button"
            role="radio"
            aria-checked={on}
            data-testid={`quick-${q.key}`}
            onClick={() => onChange(q.types)}
            className={cn("rounded-md px-2 py-1 text-[13px] font-medium", on ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2")}
          >
            {q.label}
          </button>
        );
      })}
    </div>
  );
}
