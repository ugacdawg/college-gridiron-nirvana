import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type Raw = { Year: number; Week: number; Home: string; Away: string; "Game ID": string };
const games = JSON.parse(readFileSync("data/cfb_full_games.json", "utf8")) as Raw[];

test("1. pick Georgia 2027 from the team picker", async ({ page }) => {
  await page.goto("/?season=2027");
  await page.getByTestId("open-team-picker").click();
  await page.getByTestId("team-picker-input").fill("UGA");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/teams\/georgia\?season=2027/);
  await expect(page.getByTestId("team-title")).toHaveText("Georgia");
  await expect(page.getByTestId("schedule-row")).toHaveCount(12);
  await expect(page.getByTestId("sum-g6")).toHaveText("1");
  await expect(page.getByLabel(/Week \d+: bye/)).toHaveCount(2);
  await expect(page.getByTestId("protected-rivalry").filter({ hasText: "Georgia Tech" })).toHaveCount(1);
  const fla = page.getByTestId("schedule-row").filter({ hasText: "Florida" }).filter({ hasText: "Tampa" });
  await expect(fla).toHaveCount(1);
  await expect(fla.getByLabel("Neutral site")).toBeVisible();
});

test("2. Notre Dame: 11 P4 + Navy every season; USC only 2030–31", async ({ page }) => {
  for (const y of [2027, 2028, 2029, 2030, 2031]) {
    await page.goto(`/teams/notre-dame?season=${y}`);
    const rows = page.getByTestId("schedule-row");
    await expect(rows).toHaveCount(12);
    await expect(page.getByTestId("sum-p4nd")).toHaveText("11");
    await expect(rows.filter({ hasText: "Navy" })).toHaveCount(1);
    await expect(rows.filter({ has: page.getByRole("link", { name: "USC", exact: true }) })).toHaveCount(y >= 2030 ? 1 : 0);
  }
});

test("3. 2027 Week 0 lists every game once; conference filter and reset", async ({ page }) => {
  const expected = games.filter((g) => g.Year === 2027 && g.Week === 0).map((g) => g["Game ID"]).sort();
  await page.goto("/weeks/2027/0");
  const cards = page.getByTestId("matchup-card");
  await expect(cards).toHaveCount(expected.length);
  const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-game-id")).sort());
  expect(ids).toEqual(expected);
  await page.getByTestId("conf-SEC").click();
  await expect(page).toHaveURL(/conf=SEC/);
  const secCount = await cards.count();
  expect(secCount).toBeLessThan(expected.length);
  await expect(page.getByTestId("result-count")).toContainText(`Showing ${secCount} of ${expected.length}`);
  await page.getByTestId("reset-filters").click();
  await expect(cards).toHaveCount(expected.length);
  await expect(page).not.toHaveURL(/conf=/);
});

test("4. 2028 Week 13 → next opens 2029 Week 0", async ({ page }) => {
  await page.goto("/weeks/2028/13");
  await page.getByTestId("week-next").click();
  await expect(page).toHaveURL(/\/weeks\/2029\/0$/);
  await expect(page.getByTestId("week-title")).toHaveText("2029 · Week 0");
});

test("5. Ohio State vs Michigan: same game in both schedules, once on the board", async ({ page }) => {
  await page.goto("/compare?a=ohio-state&b=michigan&season=2027");
  const card = page.getByTestId("h2h").getByTestId("matchup-card").filter({ hasText: "2027" }).first();
  const id = await card.getAttribute("data-game-id");
  expect(id).toBeTruthy();
  const g = games.find((x) => x["Game ID"] === id)!;
  for (const slug of ["ohio-state", "michigan"]) {
    await page.goto(`/teams/${slug}?season=2027`);
    await expect(page.locator(`a[href="/games/${id}"]`).first()).toBeAttached();
  }
  await page.goto(`/weeks/2027/${g.Week}`);
  await expect(page.locator(`[data-game-id="${id}"]`)).toHaveCount(1);
});

test("6. conference matrix does not call neutral sites campus homes", async ({ page }) => {
  await page.goto("/conferences/sec?season=2027&a=florida&b=georgia");
  const detail = page.getByTestId("pair-detail");
  await expect(detail).toContainText("PASS");
  await expect(detail).toContainText("Campus visits actually played: Florida 0, Georgia 0");
  await expect(detail.getByText("(administrative only)")).toHaveCount(5);
  await expect(detail).toContainText("Raymond James Stadium, Tampa, FL");
});

test("7. CSV and ICS exports", async ({ page }) => {
  await page.goto("/teams/georgia?season=2027");
  const [csvDl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
  const csv = readFileSync((await csvDl.path())!, "utf8");
  expect(csv.trimEnd().split("\r\n")).toHaveLength(13);
  const [icsDl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-ics").click()]);
  const ics = readFileSync((await icsDl.path())!, "utf8");
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(12);
  expect(ics.match(/DTSTART;VALUE=DATE:\d{8}\r\n/g)).toHaveLength(12);
  expect(ics).not.toMatch(/DTSTART:\d{8}T\d{6}/);
  expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
});

test("8. filtered list → game → opponent → back preserves filters", async ({ page }) => {
  await page.goto("/weeks/2027/9?conf=SEC&type=conf");
  await expect(page.getByTestId("result-count")).toBeVisible();
  const card = page.locator('[data-game-id]').filter({ hasText: "Georgia" }).filter({ hasText: "Florida" });
  await card.getByRole("link", { name: /^Details/ }).click();
  await expect(page).toHaveURL(/\/games\//);
  await expect(page.getByText("Neutral-site game")).toBeVisible();
  await page.getByRole("link", { name: "Florida schedule" }).click();
  await expect(page).toHaveURL(/\/teams\/florida\?season=2027/);
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/weeks\/2027\/9\?conf=SEC&type=conf/);
  await expect(page.getByTestId("conf-SEC")).toHaveAttribute("aria-pressed", "true");
});

test("mobile team page has no horizontal page overflow @mobile", async ({ page }) => {
  await page.goto("/teams/georgia?season=2027");
  await expect(page.getByTestId("schedule-row-mobile")).toHaveCount(12);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("branding: College Gridiron Nirvana in header, hero and tab title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/College Gridiron Nirvana/);
  await expect(page.getByTestId("app-title")).toHaveText("College Gridiron Nirvana");
  await expect(page.getByRole("link", { name: "College Gridiron Nirvana home" })).toBeVisible();
});

test("2a. P4 schools host their G6 game; published conflicts marked Venue override", async ({ page }) => {
  for (const [slug, y, name] of [["florida", 2027, "Florida"], ["washington", 2027, "Washington"], ["oregon", 2028, "Oregon"], ["ole-miss", 2029, "Ole Miss"], ["byu", 2028, "BYU"]] as const) {
    await page.goto(`/teams/${slug}?season=${y}`);
    const row = page.getByTestId("schedule-row").filter({ has: page.locator("[title=\"G6\"]") });
    await expect(row).toHaveCount(1);
    await expect(row.getByLabel("Home")).toBeVisible();
    await expect(row).toContainText(`${name} campus`);
  }
  await page.goto("/games/2027-1538");
  await expect(page.getByText("Venue overridden — modeled, not an official venue change")).toBeVisible();
  await expect(page.getByText("Washington State campus")).toBeVisible();
});

test("logos load for both teams on every Georgia 2027 game", async ({ page }) => {
  await page.goto("/teams/georgia?season=2027");
  const imgs = page.getByTestId("schedule-row").locator("img");
  await expect(imgs).toHaveCount(12);
  await page.waitForLoadState("networkidle");
  const broken = await imgs.evaluateAll((els) => els.filter((e) => !(e as HTMLImageElement).complete || (e as HTMLImageElement).naturalWidth === 0).length);
  expect(broken).toBe(0);
});

test("week board quick view: non-conference only", async ({ page }) => {
  const expected = games.filter((g) => g.Year === 2027 && g.Week === 1 && (g as unknown as { Type: string }).Type !== "Conference").length;
  await page.goto("/weeks/2027/1");
  await page.getByTestId("quick-nonconf").click();
  await expect(page).toHaveURL(/type=p4nc%2Cg6|type=p4nc,g6/);
  await expect(page.getByTestId("matchup-card")).toHaveCount(expected);
  await expect(page.getByTestId("matchup-card").filter({ has: page.locator('[title="Conference"]') })).toHaveCount(0);
  await page.getByTestId("quick-all").click();
  await expect(page).not.toHaveURL(/type=/);
});

test("team non-conference tab lists every non-conference game across 2027–2031", async ({ page }) => {
  await page.goto("/teams/notre-dame?season=2027");
  await page.getByTestId("tab-nonconf").click();
  await expect(page).toHaveURL(/view=nonconf/);
  await expect(page.getByTestId("schedule-row")).toHaveCount(60); // 5 × (11 P4 + Navy)
  await page.getByTestId("nc-p4").click();
  await expect(page).toHaveURL(/nc=p4/);
  await expect(page.getByTestId("schedule-row")).toHaveCount(55);
  await expect(page.getByTestId("schedule-row").filter({ hasText: "Navy" })).toHaveCount(0);
});

test("game changed in v2.0 explains the change", async ({ page }) => {
  const v = JSON.parse(readFileSync("src/data/generated/version.json", "utf8")) as { diff: { newGameIds: string[] } };
  await page.goto(`/games/${v.diff.newGameIds[0]}`);
  await expect(page.getByText("Changed in model v2.0")).toBeVisible();
  await page.goto("/methodology#version");
  await expect(page.getByText("Version history: Baseline v2.0")).toBeVisible();
});
