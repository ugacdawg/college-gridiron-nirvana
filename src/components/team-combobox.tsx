"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { POWER_TEAMS, type PowerTeam } from "@/lib/data/roster";
import { searchTeams } from "@/lib/selectors/search";
import { ConferenceChip, TeamBadge } from "./badges";
import { cn } from "./ui";

/** Accessible combobox (ARIA 1.2 pattern) for picking one of the 68 Power/Notre Dame programs. */
export function TeamCombobox({
  label,
  onSelect,
  placeholder = "Search teams — e.g. UGA, OSU, Notre Dame",
  autoFocus,
  exclude = [],
  className,
  hideLabel,
  inline,
  testId,
}: {
  label: string;
  onSelect: (team: PowerTeam) => void;
  placeholder?: string;
  autoFocus?: boolean;
  exclude?: string[];
  className?: string;
  hideLabel?: boolean;
  /** Render list inline (for dialogs) instead of as a floating popover */
  inline?: boolean;
  testId?: string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(!!inline);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(
    () => searchTeams(q, POWER_TEAMS.filter((t) => !exclude.includes(t.name))).slice(0, inline ? 12 : 8),
    [q, exclude, inline],
  );
  const listId = `${id}-list`;
  const show = (open || inline) && hits.length > 0;

  const choose = (t: PowerTeam) => {
    onSelect(t);
    setQ("");
    setActive(0);
    if (!inline) setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (show && hits[active]) {
        e.preventDefault();
        choose(hits[active].team);
      }
    } else if (e.key === "Escape" && !inline) {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`${id}-input`} className={cn("mb-1 block text-xs font-medium text-ink-2", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          ref={inputRef}
          id={`${id}-input`}
          data-testid={testId}
          type="text"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show && hits[active] ? `${id}-opt-${hits[active].team.slug}` : undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => !inline && setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={`${label} results`}
        hidden={!show}
        className={cn(
          "max-h-80 overflow-auto rounded-lg border border-line bg-surface p-1",
          inline ? "mt-2" : "absolute z-50 mt-1 w-full min-w-[260px] shadow-lg shadow-black/10",
        )}
      >
        {hits.map((h, i) => (
          <li
            key={h.team.slug}
            id={`${id}-opt-${h.team.slug}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(h.team)}
            onMouseEnter={() => setActive(i)}
            className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5", i === active && "bg-surface-2")}
          >
            <TeamBadge name={h.team.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{h.team.name}</span>
              <span className="block truncate text-xs text-ink-3">
                {h.team.nickname}
                {h.reason && h.reason !== "name" ? ` · matched ${h.reason}` : ""}
              </span>
            </span>
            <ConferenceChip conference={h.team.conference} />
          </li>
        ))}
      </ul>
      {q && hits.length === 0 && (
        <p className="mt-2 text-xs text-ink-3" role="status">
          No Power Four / Notre Dame program matches “{q}”. G6 programs appear only as opponents.
        </p>
      )}
    </div>
  );
}
