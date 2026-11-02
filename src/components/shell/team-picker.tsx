"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { teamHref } from "@/lib/routes";
import { Kbd } from "../ui";
import { TeamCombobox } from "../team-combobox";

/** Command-palette style team picker: ⌘K / Ctrl+K or "/" opens it from anywhere. */
export function TeamPicker({ season }: { season: number }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-3 hover:bg-surface-2 hover:text-ink sm:w-56"
        aria-haspopup="dialog"
        data-testid="open-team-picker"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Find a team…</span>
        <span className="sr-only sm:hidden">Find a team</span>
        <span className="ml-auto hidden sm:inline">
          <Kbd>⌘K</Kbd>
        </span>
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        aria-label="Find a team"
        className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        {open && (
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-sm font-semibold">Find a team · {season} season</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-3 hover:bg-surface-2" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <TeamCombobox
              label="Team"
              hideLabel
              inline
              autoFocus
              testId="team-picker-input"
              onSelect={(t) => {
                setOpen(false);
                router.push(teamHref(t.slug, season));
              }}
            />
            <p className="mt-3 text-xs text-ink-3">68 programs: 67 Power Four conference members plus independent Notre Dame. Abbreviations like UGA, OSU, TAMU work.</p>
          </div>
        )}
      </dialog>
    </>
  );
}
