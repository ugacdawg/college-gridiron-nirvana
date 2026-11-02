/** Loads the ACTUAL supplied data and asserts every non-negotiable model invariant. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data/dataset";
import { POWER_TEAMS, SEASONS } from "@/lib/data/roster";
import type { G6VenueOverride, ModelVersion, WorkbookData } from "@/lib/data/workbook-types";
import type { RawGame } from "@/lib/model";
import { runInvariants } from "@/lib/validation/invariants";

const raw = JSON.parse(readFileSync("data/cfb_full_games.json", "utf8")) as RawGame[];
const wb = JSON.parse(readFileSync("src/data/generated/workbook.json", "utf8")) as WorkbookData;
const ds = buildDataset(raw);
const overrides = JSON.parse(readFileSync("data/g6_venue_overrides.json", "utf8")) as G6VenueOverride[];
const rules = (JSON.parse(readFileSync("data/model-version.json", "utf8")) as ModelVersion).rules;

describe("canonical fixture feed", () => {
  it("generated games.json is identical to the source feed", () => {
    const gen = JSON.parse(readFileSync("src/data/generated/games.json", "utf8"));
    expect(gen).toEqual(raw);
  });

  it("has 2,210 rows with 2,210 distinct Game IDs over 2027–2031", () => {
    expect(ds.games).toHaveLength(2210);
    expect(new Set(ds.games.map((g) => g.id)).size).toBe(2210);
    expect([...ds.byYear.keys()].sort()).toEqual([...SEASONS]);
  });

  it.each(SEASONS)("%i has 442 games: 301 conference, 73 P4 nonconference, 68 G6", (s) => {
    const gs = ds.byYear.get(s)!;
    expect(gs).toHaveLength(442);
    expect(gs.filter((g) => g.type === "Conference")).toHaveLength(301);
    expect(gs.filter((g) => g.type === "P4 nonconference")).toHaveLength(73);
    expect(gs.filter((g) => g.type === "G6")).toHaveLength(68);
  });

  it("has 68 Power participants", () => {
    expect(POWER_TEAMS).toHaveLength(68);
  });

  it("keeps the raw record reference for audit", () => {
    expect(ds.games[0].raw).toBe(raw[0]);
  });
});

describe("runInvariants", () => {
  const checks = runInvariants(ds, wb, overrides, rules);
  it.each(checks.map((c) => [c.id, c] as const))("%s passes", (_id, c) => {
    expect(c.pass, `${c.label}: expected ${c.expected}, got ${c.actual}\n${(c.detail ?? []).join("\n")}`).toBe(true);
  });

  it("detects a corrupted feed (double booking + wrong game count)", () => {
    const bad = raw.map((g) => ({ ...g }));
    const bama = bad.filter((g) => g.Year === 2027 && (g.Home === "Alabama" || g.Away === "Alabama"));
    bama[0].Week = bama[1].Week; // Alabama now plays twice in one week and has three byes
    const result = runInvariants(buildDataset(bad), wb, overrides, rules);
    expect(result.find((c) => c.id === "byes")!.pass).toBe(false);
    expect(result.find((c) => c.id === "double-bookings")!.pass).toBe(false);
  });

  it("fails if a P4–G6 road game reappears (old published venue re-imported)", () => {
    const bad = raw.map((g) => ({ ...g }));
    const g = bad.find((x) => x["Game ID"] === "2027-1538")!; // Washington vs Washington State
    [g.Home, g.Away, g.Venue] = ["Washington State", "Washington", "Washington State campus"];
    const result = runInvariants(buildDataset(bad), wb, overrides, rules);
    expect(result.find((c) => c.id === "g6-home")!.pass).toBe(false);
    expect(result.find((c) => c.id === "g6-overrides")!.pass).toBe(false);
  });

  it("fails when a v2.0 rule is broken (Clemson–Notre Dame 2030 removed)", () => {
    const bad = raw.filter((g) => !(g.Year === 2030 && [g.Home, g.Away].includes("Clemson") && [g.Home, g.Away].includes("Notre Dame")));
    const result = runInvariants(buildDataset(bad), wb, overrides, rules);
    expect(result.find((c) => c.id === "required-games")!.pass).toBe(false);
  });

  it("rejects schema drift", () => {
    const bad = [{ ...raw[0], Type: "FCS" }] as RawGame[];
    expect(() => buildDataset(bad)).toThrow(/unexpected Type/);
  });

  it("matches the original solver issue list (empty)", () => {
    expect(JSON.parse(readFileSync("data/cfb_validation_issues.json", "utf8"))).toEqual([]);
  });
});
