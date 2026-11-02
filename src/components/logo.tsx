"use client";

/**
 * School and conference marks from the locally synced FBS Logo Library
 * (`npm run logos:sync` → public/logos + src/data/generated/logo-manifest.json).
 * Adapted from the starter kit's LogoBadge: one manifest, one component, no remote URLs.
 * Images are never cropped, recoloured or inverted; a legible abbreviation is shown only
 * if a file is genuinely unavailable.
 */
import { useState } from "react";
import manifestJson from "@/data/generated/logo-manifest.json";
import { G6_BY_NAME, POWER_BY_NAME } from "@/lib/data/roster";
import { cn } from "./ui";

type Entry = { src: string; slug: string; sourcePath: string };
const manifest = manifestJson as { teams: Record<string, Entry>; conferences: Record<string, Entry> };

/** Model league labels → manifest conference keys. */
const CONF_KEY: Record<string, string> = { CUSA: "Conference USA" };

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";
const SIZE: Record<LogoSize, { box: string; px: number; text: string }> = {
  xs: { box: "h-5 w-5 rounded p-px", px: 20, text: "text-[7px]" },
  sm: { box: "h-8 w-8 rounded-md p-0.5", px: 32, text: "text-[9px]" },
  md: { box: "h-10 w-10 rounded-lg p-1", px: 40, text: "text-[10px]" },
  lg: { box: "h-16 w-16 rounded-xl p-1.5", px: 64, text: "text-sm" },
  xl: { box: "h-24 w-24 rounded-2xl p-2", px: 96, text: "text-lg" },
};

export function hasTeamLogo(name: string) {
  return !!manifest.teams[name];
}

function abbr(name: string) {
  return POWER_BY_NAME.get(name)?.abbr ?? name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 4).toUpperCase();
}

function Mark({ src, label, fallback, size, decorative, className, g6 }: { src?: string; label: string; fallback: string; size: LogoSize; decorative?: boolean; className?: string; g6?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const s = SIZE[size];
  const show = !!src && failed !== src;
  return (
    <span
      className={cn(
        // Quiet pale backplate in both themes so dark marks stay visible without recolouring them.
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-black/5 bg-[#f4f2ed] dark:border-white/10 dark:bg-[#ecebe7]",
        s.box,
        !show && (g6 ? "border-dashed border-g6/50 bg-g6-soft dark:bg-g6-soft" : "bg-ink dark:bg-ink"),
        className,
      )}
      title={label}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={s.px} height={s.px} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={() => setFailed(src!)} />
      ) : (
        <span className={cn("font-display font-bold tracking-tight", s.text, g6 ? "text-g6" : "text-bg")}>{fallback}</span>
      )}
    </span>
  );
}

/** School logo. `decorative` (default) hides it from assistive tech when the name is shown alongside. */
export function TeamLogo({ name, size = "md", decorative = true, className }: { name: string; size?: LogoSize; decorative?: boolean; className?: string }) {
  return (
    <Mark
      src={manifest.teams[name]?.src}
      label={`${name} logo`}
      fallback={abbr(name)}
      size={size}
      decorative={decorative}
      className={className}
      g6={!POWER_BY_NAME.has(name) && G6_BY_NAME.has(name)}
    />
  );
}

export function ConferenceLogo({ name, size = "sm", decorative = true, className }: { name: string; size?: LogoSize; decorative?: boolean; className?: string }) {
  const key = CONF_KEY[name] ?? name;
  const short = name === "Independent" ? "IND" : name === "Big Ten" ? "B1G" : name === "Big 12" ? "B12" : abbr(name);
  return <Mark src={manifest.conferences[key]?.src} label={`${key} logo`} fallback={short} size={size} decorative={decorative} className={className} />;
}
