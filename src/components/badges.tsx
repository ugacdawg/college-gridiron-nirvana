import { BadgeCheck, Lock, Shuffle, MapPin, Building2, MoveRight } from "lucide-react";
import { STATUS_INFO, TYPE_SHORT, type Game, type GameType, type RawStatus } from "@/lib/model";
import { ConferenceLogo, TeamLogo } from "./logo";
import { cn } from "./ui";

const CONF_SHORT: Record<string, string> = {
  SEC: "SEC",
  "Big Ten": "Big Ten",
  "Big 12": "Big 12",
  ACC: "ACC",
  Independent: "Ind.",
};

export function ConferenceChip({ conference, className, long, logo }: { conference: string; className?: string; long?: boolean; logo?: boolean }) {
  const isPower = conference in CONF_SHORT;
  const label = long ? (conference === "Independent" ? "Independent" : conference) : (CONF_SHORT[conference] ?? conference);
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[11px] font-semibold leading-none tracking-wide",
        isPower ? "border-line-strong bg-surface-2 text-ink-2" : "border-dashed border-g6/50 bg-transparent text-g6",
        className,
      )}
      title={isPower ? conference : `${conference} (non-Power FBS / G6 in this model)`}
    >
      {logo && conference !== "Independent" && <ConferenceLogo name={conference} size="xs" className="-ml-1 h-4 w-4 rounded-sm" />}
      {!isPower && <span className="sr-only">G6 league </span>}
      {label}
    </span>
  );
}

const CAT_STYLE: Record<GameType, string> = {
  Conference: "bg-conf-soft text-conf border-conf/25",
  "P4 nonconference": "bg-p4nc-soft text-p4nc border-p4nc/25",
  G6: "bg-g6-soft text-g6 border-g6/30",
};
const CAT_MARK: Record<GameType, string> = { Conference: "●", "P4 nonconference": "◆", G6: "▲" };

export function CategoryBadge({ type, className }: { type: GameType; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-[11px] font-semibold leading-none", CAT_STYLE[type], className)} title={type}>
      <span aria-hidden="true" className="text-[8px]">
        {CAT_MARK[type]}
      </span>
      {TYPE_SHORT[type]}
    </span>
  );
}

export function categoryAccent(type: GameType): string {
  return type === "Conference" ? "bg-conf" : type === "P4 nonconference" ? "bg-p4nc" : "bg-g6";
}

export function ProvenanceBadge({ status, className, full }: { status: RawStatus; className?: string; full?: boolean }) {
  const info = STATUS_INFO[status];
  const Icon = info.provenance === "published" ? BadgeCheck : info.provenance === "protected" ? Lock : info.provenance === "override" ? MoveRight : Shuffle;
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] font-medium leading-none",
        info.provenance === "published" && "bg-ok-soft text-ok",
        info.provenance === "protected" && "bg-accent-soft text-accent",
        info.provenance === "override" && "border border-accent bg-accent-soft text-accent",
        info.provenance === "modeled" && "border border-dashed border-line-strong text-ink-3",
        className,
      )}
      title={`${info.label} — ${info.description}`}
    >
      <Icon aria-hidden="true" className="h-3 w-3" strokeWidth={2.25} />
      {full ? info.label : status === "Published" || status === "Protected" || status === "Venue override" ? info.short : status}
    </span>
  );
}

export function SiteBadge({ site, className }: { site: "H" | "A" | "N"; className?: string }) {
  const label = site === "H" ? "Home" : site === "A" ? "Away" : "Neutral site";
  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        "tnum inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
        site === "H" && "bg-ink text-bg",
        site === "A" && "border border-line-strong text-ink-2",
        site === "N" && "border border-dashed border-accent text-accent",
        className,
      )}
    >
      {site}
    </span>
  );
}

export function VenueChip({ game, className }: { game: Game; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 text-xs text-ink-3", className)}>
      {game.isNeutral ? <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" /> : <Building2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">
        {game.isNeutral && <span className="font-semibold text-accent">Neutral · </span>}
        {game.venue}
      </span>
    </span>
  );
}

/** School mark (local logo, legible abbreviation fallback). Kept as the app-wide team badge API. */
export function TeamBadge({ name, size = "md", className, decorative = true }: { name: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string; decorative?: boolean }) {
  return <TeamLogo name={name} size={size} className={className} decorative={decorative} />;
}
