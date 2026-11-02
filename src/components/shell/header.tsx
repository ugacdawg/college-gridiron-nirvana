"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SEASONS } from "@/lib/data/roster";
import { cn } from "../ui";
import { TeamPicker } from "./team-picker";
import { ThemeToggle } from "./theme-toggle";
import { useCurrentSeason } from "./use-season";

const NAV = [
  { href: "/teams", label: "Teams" },
  { href: "/weeks", label: "Weeks" },
  { href: "/conferences", label: "Conferences" },
  { href: "/rivalries", label: "Rivalries" },
  { href: "/compare", label: "Compare" },
  { href: "/analytics", label: "Analytics" },
  { href: "/methodology", label: "Methodology" },
];

export function Header() {
  const pathname = usePathname();
  const season = useCurrentSeason();
  const [open, setOpen] = useState(false);

  const navHref = (href: string) => (href === "/weeks" ? `/weeks/${season}/0` : `${href}?season=${season}`);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const links = NAV.map((n) => (
    <Link
      key={n.href}
      href={navHref(n.href)}
      onClick={() => setOpen(false)}
      aria-current={isActive(n.href) ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        isActive(n.href) ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {n.label}
    </Link>
  ));

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link href={`/?season=${season}`} className="flex shrink-0 items-center gap-2" aria-label="College Gridiron Nirvana home">
          <Logo />
          <span className="hidden font-display text-[15px] font-bold tracking-tight md:inline">College Gridiron Nirvana</span>
          <span className="hidden font-display text-[15px] font-bold tracking-tight sm:inline md:hidden">Gridiron Nirvana</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-0.5 xl:flex">
          {links}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SeasonSelect season={season} />
          <TeamPicker season={season} />
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Primary mobile" className="grid grid-cols-2 gap-1 border-t border-line px-4 py-3 sm:grid-cols-4 xl:hidden">
          {links}
        </nav>
      )}
    </header>
  );
}

function SeasonSelect({ season }: { season: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const onChange = (next: string) => {
    const m = pathname.match(/^\/weeks\/\d{4}(\/\d+)?/);
    if (m) {
      const q = sp.toString();
      router.push(`/weeks/${next}${m[1] ?? "/0"}${q ? `?${q}` : ""}`);
      return;
    }
    const p = new URLSearchParams(sp.toString());
    p.set("season", next);
    router.push(`${pathname}?${p.toString()}`);
  };
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Season</span>
      <select
        value={season}
        onChange={(e) => onChange(e.target.value)}
        className="tnum h-9 cursor-pointer appearance-none rounded-lg border border-line bg-surface pl-3 pr-7 text-sm font-semibold text-ink hover:bg-surface-2"
        data-testid="global-season"
      >
        {SEASONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-2.5 text-[10px] text-ink-3">
        ▼
      </span>
    </label>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--ink)" />
      {[8, 12, 16, 20, 24].map((x) => (
        <line key={x} x1={x} y1="7" x2={x} y2="25" stroke="var(--bg)" strokeOpacity={x === 16 ? 0.9 : 0.35} strokeWidth={x === 16 ? 1.6 : 1} />
      ))}
      <path d="M6 16 C 10 9, 22 9, 26 16 C 22 23, 10 23, 6 16 Z" fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}
