"use client";

import { teamScheduleCsv } from "@/lib/export/csv";
import { teamScheduleIcs } from "@/lib/export/ics";
import { slugify } from "@/lib/data/roster";
import type { Game } from "@/lib/model";
import { CopyLinkButton, DownloadButton, PrintButton } from "./export-bar";

export function TeamExports({ team, season, games, fileLabel }: { team: string; season: number; games: Game[]; fileLabel?: string }) {
  const base = `${slugify(team)}-${fileLabel ?? `${season}-modeled-schedule`}`;
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <CopyLinkButton />
      <DownloadButton label="CSV" filename={`${base}.csv`} mime="text/csv" build={() => teamScheduleCsv(team, games)} testId="export-csv" />
      <DownloadButton
        label="Calendar (.ics)"
        icon="calendar"
        filename={`${base}.ics`}
        mime="text/calendar"
        build={() => teamScheduleIcs(team, games, { origin: window.location.origin })}
        testId="export-ics"
      />
      <PrintButton />
    </div>
  );
}
