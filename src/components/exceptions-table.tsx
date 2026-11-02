"use client";

import { useState } from "react";
import { ArrowDownUp } from "lucide-react";
import type { ContractExceptionRow } from "@/lib/data/workbook-types";
import { isHttpUrl } from "@/lib/model";
import { ExternalLink } from "./ui";

type Key = "year" | "matchup" | "exceptionType";

export function ExceptionsTable({ rows }: { rows: ContractExceptionRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "year", dir: 1 });
  const types = [...new Set(rows.map((r) => r.exceptionType))].sort();
  const needle = q.toLowerCase();
  const shown = rows
    .filter((r) => (!type || r.exceptionType === type) && (!needle || Object.values(r).some((v) => String(v).toLowerCase().includes(needle))))
    .sort((a, b) => (a[sort.key] < b[sort.key] ? -1 : a[sort.key] > b[sort.key] ? 1 : 0) * sort.dir);

  return (
    <div>
      <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5">
        <label className="sr-only" htmlFor="ex-q">
          Filter exceptions
        </label>
        <input id="ex-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter text…" className="h-9 w-64 rounded-lg border border-line bg-surface px-3 text-sm" />
        <label className="sr-only" htmlFor="ex-type">
          Exception type
        </label>
        <select id="ex-type" value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <span className="tnum self-center text-xs text-ink-3" aria-live="polite">
          {shown.length} of {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-y border-line">
              <Head k="year" label="Year" sort={sort} setSort={setSort} />
              <Head k="matchup" label="Matchup / issue" sort={sort} setSort={setSort} />
              <Head k="exceptionType" label="Type" sort={sort} setSort={setSort} />
              <th scope="col" className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3">Commitment / issue</th>
              <th scope="col" className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3">Model treatment</th>
              <th scope="col" className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-b border-line align-top last:border-0">
                <td className="tnum px-3 py-2">{r.year}</td>
                <td className="px-3 py-2 font-medium">{r.matchup}</td>
                <td className="px-3 py-2 text-ink-2">{r.exceptionType}</td>
                <td className="px-3 py-2 text-ink-2">{r.existing}</td>
                <td className="px-3 py-2">
                  {r.treatment}
                  <div className="text-xs text-ink-3">{r.why}</div>
                </td>
                <td className="px-3 py-2 text-xs">{isHttpUrl(r.sourceUrl) ? <ExternalLink href={r.sourceUrl}>{new URL(r.sourceUrl).hostname}</ExternalLink> : r.sourceUrl || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type SortState = { key: Key; dir: 1 | -1 };

function Head({ k, label, sort, setSort }: { k: Key; label: string; sort: SortState; setSort: (f: (s: SortState) => SortState) => void }) {
  return (
    <th scope="col" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3">
      <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : 1 }))}>
        {label} <ArrowDownUp className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  );
}
