"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, X } from "lucide-react";
import { POWER_BY_SLUG } from "@/lib/data/roster";
import { ConferenceChip, TeamBadge } from "./badges";
import { TeamCombobox } from "./team-combobox";

export function ComparePickers() {
  const sp = useSearchParams();
  const router = useRouter();
  const a = sp.get("a");
  const b = sp.get("b");
  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`/compare?${p.toString()}`);
  };

  return (
    <div className="no-print grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
      <Slot k="a" slug={a} other={b} set={set} />
      <button
        type="button"
        disabled={!a && !b}
        onClick={() => set({ a: b, b: a })}
        className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-2 disabled:opacity-40"
        aria-label="Swap teams"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>
      <Slot k="b" slug={b} other={a} set={set} />
    </div>
  );
}

function Slot({ k, slug, other, set }: { k: "a" | "b"; slug: string | null; other: string | null; set: (patch: Record<string, string | null>) => void }) {
  const t = slug ? POWER_BY_SLUG.get(slug) : undefined;
  return t ? (
    <div className="flex h-[66px] items-center gap-3 rounded-xl border border-line bg-surface px-3">
      <TeamBadge name={t.name} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Team {k.toUpperCase()}</div>
        <div className="truncate font-semibold">{t.name}</div>
      </div>
      <ConferenceChip conference={t.conference} />
      <button type="button" onClick={() => set({ [k]: null })} className="rounded-md p-1 text-ink-3 hover:bg-surface-2" aria-label={`Clear team ${k.toUpperCase()}`}>
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : (
    <TeamCombobox
      label={`Team ${k.toUpperCase()}`}
      testId={`compare-${k}`}
      exclude={other ? [POWER_BY_SLUG.get(other)?.name ?? ""] : []}
      onSelect={(team) => set({ [k]: team.slug })}
    />
  );
}
