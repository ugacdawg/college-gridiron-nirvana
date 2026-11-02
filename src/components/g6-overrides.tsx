import Link from "next/link";
import type { G6VenueOverride } from "@/lib/data/workbook-types";
import { isHttpUrl } from "@/lib/model";
import { gameHref } from "@/lib/routes";
import { TeamBadge } from "./badges";
import { cn, ExternalLink } from "./ui";

/** Original (pre-rule) G6 site vs the modeled P4-campus site, side by side. */
export function G6OverridesTable({ rows, caption }: { rows: G6VenueOverride[]; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
            <th scope="col" className="px-3 py-2 font-semibold">Game</th>
            <th scope="col" className="px-3 py-2 font-semibold">Original site</th>
            <th scope="col" className="px-3 py-2 font-semibold">Original status / source</th>
            <th scope="col" className="px-3 py-2 font-semibold">Modeled site (P4 campus)</th>
            <th scope="col" className="px-3 py-2 font-semibold">New status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o["Game ID"]} className={cn("border-b border-line align-top last:border-0", o.Prior.Status === "Published" && "bg-accent-soft/40")}>
              <td className="px-3 py-2">
                <Link href={gameHref(o["Game ID"])} className="flex items-center gap-2 font-medium hover:text-accent hover:underline">
                  <TeamBadge name={o["Power Team"]} size="xs" />
                  <span>
                    {o["G6 Opponent"]} at {o["Power Team"]}
                    <span className="tnum block text-xs font-normal text-ink-3">
                      {o.Year} · Wk {o.Week} · {o["Game ID"]}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 text-ink-2">
                {o.Prior.Away} {o.Prior["Site type"] === "Neutral" ? "vs" : "at"} {o.Prior.Home}
                <span className="block text-xs text-ink-3">
                  {o.Prior.Venue} ({o.Prior["Site type"]})
                </span>
              </td>
              <td className="px-3 py-2 text-xs">
                <span className={cn("font-semibold", o.Prior.Status === "Published" ? "text-accent" : "text-ink-2")}>{o.Prior.Status}</span>
                <span className="block">{isHttpUrl(o.Prior["Source URL"]) ? <ExternalLink href={o.Prior["Source URL"]}>{new URL(o.Prior["Source URL"]).hostname}</ExternalLink> : <span className="text-ink-3">{o.Prior["Source URL"] || "—"}</span>}</span>
              </td>
              <td className="px-3 py-2">
                {o.New.Away} at {o.New.Home}
                <span className="block text-xs text-ink-3">{o.New.Venue}</span>
              </td>
              <td className="px-3 py-2 text-xs font-semibold">{o.New.Status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
