"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { parseSeason } from "@/lib/routes";

/** Season implied by the current URL: `/weeks/YYYY/..` path segment, else `?season=`, else 2027. */
export function useCurrentSeason(): number {
  const pathname = usePathname();
  const sp = useSearchParams();
  const m = pathname.match(/^\/weeks\/(\d{4})/);
  if (m) return parseSeason(m[1]);
  return parseSeason(sp.get("season"));
}
