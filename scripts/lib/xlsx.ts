/**
 * Minimal, dependency-light XLSX reader for the scheduling workbook.
 *
 * The supplied workbook is produced by a generator that writes namespace-prefixed
 * SpreadsheetML (`<x:worksheet>`) and absolute relationship targets (`/xl/...`),
 * which mainstream readers such as exceljs reject. This reader handles exactly
 * the OOXML subset needed: sheet names, shared/inline/str strings, numbers,
 * booleans, and formulas with cached values.
 */
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export type CellValue = string | number | boolean | null;
export interface Sheet {
  name: string;
  /** rows[r][c], 0-based; sparse cells filled with null */
  rows: CellValue[][];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: false,
  isArray: (name) => ["sheet", "Relationship", "row", "c", "si", "r"].includes(name),
});

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function resolveTarget(target: string, baseDir: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = (baseDir + "/" + target).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textOf(node: any): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in node) return String(node["#text"]);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function richText(si: any): string {
  if (si == null) return "";
  if (si.t !== undefined) return textOf(si.t);
  if (Array.isArray(si.r)) return si.r.map((r: { t: unknown }) => textOf(r.t)).join("");
  return "";
}

export async function readWorkbook(buf: Buffer | Uint8Array): Promise<Map<string, Sheet>> {
  const zip = await JSZip.loadAsync(buf);
  const read = async (path: string): Promise<string> => {
    const f = zip.file(path);
    if (!f) throw new Error(`XLSX part missing: ${path}`);
    return stripBom(await f.async("string"));
  };

  const rootRels = parser.parse(await read("_rels/.rels"));
  const officeDoc = rootRels.Relationships.Relationship.find((r: Record<string, string>) =>
    r["@Type"].endsWith("/officeDocument"),
  );
  if (!officeDoc) throw new Error("XLSX has no officeDocument relationship");
  const wbPath = resolveTarget(officeDoc["@Target"], "");
  const wbDir = wbPath.split("/").slice(0, -1).join("/");
  const relsPath = `${wbDir}/_rels/${wbPath.split("/").pop()}.rels`;

  const wbXml = parser.parse(await read(wbPath));
  const wbRels = parser.parse(await read(relsPath));
  const relTargets = new Map<string, { type: string; target: string }>();
  for (const r of wbRels.Relationships.Relationship) {
    relTargets.set(r["@Id"], { type: r["@Type"], target: resolveTarget(r["@Target"], wbDir) });
  }

  let shared: string[] = [];
  const sstRel = [...relTargets.values()].find((r) => r.type.endsWith("/sharedStrings"));
  if (sstRel && zip.file(sstRel.target)) {
    const sst = parser.parse(await read(sstRel.target));
    shared = (sst.sst?.si ?? []).map(richText);
  }

  const out = new Map<string, Sheet>();
  for (const s of wbXml.workbook.sheets.sheet) {
    const rid = s["@id"];
    const rel = relTargets.get(rid);
    if (!rel) throw new Error(`Sheet ${s["@name"]} has no relationship ${rid}`);
    const ws = parser.parse(await read(rel.target));
    const rows: CellValue[][] = [];
    for (const row of ws.worksheet.sheetData?.row ?? []) {
      const r = Number(row["@r"]) - 1;
      const cells: CellValue[] = rows[r] ?? [];
      for (const c of row.c ?? []) {
        const ci = colIndex(c["@r"]);
        const t = c["@t"];
        let v: CellValue = null;
        if (t === "s") v = shared[Number(textOf(c.v))] ?? "";
        else if (t === "inlineStr") v = richText(c.is);
        else if (t === "str") v = c.v === undefined ? "" : textOf(c.v);
        else if (t === "b") v = textOf(c.v) === "1";
        else if (c.v !== undefined) {
          const raw = textOf(c.v);
          v = raw === "" ? null : Number(raw);
        }
        cells[ci] = v;
      }
      for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = null;
      rows[r] = cells;
    }
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    out.set(s["@name"], { name: s["@name"], rows });
  }
  return out;
}

/** Convert a header-row sheet to objects keyed by header; throws if headers mismatch. */
export function tableOf(sheet: Sheet, expectedHeaders: string[]): Record<string, CellValue>[] {
  const header = (sheet.rows[0] ?? []).map((h) => (h == null ? "" : String(h)));
  const missing = expectedHeaders.filter((h) => !header.includes(h));
  if (missing.length) {
    throw new Error(
      `Workbook sheet "${sheet.name}" changed format; missing column(s): ${missing.join(", ")}. Found: ${header.join(", ")}`,
    );
  }
  return sheet.rows
    .slice(1)
    .filter((r) => r.some((c) => c !== null && c !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? null])));
}
