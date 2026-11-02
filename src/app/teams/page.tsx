import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamDirectory } from "@/components/team-directory";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Teams" };

export default function TeamsPage() {
  return (
    <div>
      <PageHeader eyebrow="68 programs · 67 Power Four members + Notre Dame" title="Teams">
        Pick any program to see its modeled week-by-week schedule. SEC 16 · Big Ten 18 · Big 12 16 · ACC 17 · Independent 1. Rebuilt Pac-12 programs are classified as non-Power (G6) in this scenario.
      </PageHeader>
      <Suspense>
        <TeamDirectory />
      </Suspense>
    </div>
  );
}
