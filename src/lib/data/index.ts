/**
 * Runtime data entry point. Imports the generated, validated static JSON written by
 * `npm run data:prepare` — the browser never parses the XLSX.
 */
import rawGames from "@/data/generated/games.json";
import workbookJson from "@/data/generated/workbook.json";
import reportJson from "@/data/generated/validation-report.json";
import overridesJson from "@/data/generated/g6-venue-overrides.json";
import versionJson from "@/data/generated/version.json";
import type { RawGame } from "../model";
import { buildDataset, type Dataset } from "./dataset";
import type { G6VenueOverride, ValidationReport, VersionInfo, WorkbookData } from "./workbook-types";

export const dataset: Dataset = buildDataset(rawGames as RawGame[]);
export const workbook = workbookJson as unknown as WorkbookData;
export const validationReport = reportJson as unknown as ValidationReport;
export const g6Overrides = overridesJson as G6VenueOverride[];
/** Current model version, its extra rules, and how it differs from the previous version. */
export const versionInfo = versionJson as unknown as VersionInfo;
export const g6OverrideById = new Map(g6Overrides.map((o) => [o["Game ID"], o]));

export { ywKey, ytKey } from "./dataset";
export type { Dataset } from "./dataset";
