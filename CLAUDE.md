# CLAUDE.md — College Gridiron Nirvana | Football Schedule Explorer

> **Project instruction for Claude Code.** Build a polished, fully functional, locally runnable web application using the **actual attached 2027–2031 college football scheduling model**. Do not merely design a mock-up or produce a plan. Implement the code, import the supplied data, run validations/tests, and demonstrate that navigation, filtering, and exports work. Proceed without further clarification unless a genuine blocker makes implementation impossible.

## 1. Objective and intended users

Build **College Gridiron Nirvana** (the definitive product name), an interactive, high-quality desktop-first/mobile-responsive college football schedule explorer. Fans and analysts should instantly be able to:

1. Search/select **any of 68 Power Four/Notre Dame teams** and **any season 2027–2031** to view all 12 games in playing order, with byes.
2. Select **any season and any game week (Week 0–13)** to view **every modeled game that week**, then narrow the list to a conference, team, game category, venue type, or search term.
3. Explore conference slates, traditional rivalries, nonconference balance, and the five-year home/away rotation.
4. Compare teams or seasons, inspect a game's provenance, and export or share filtered schedules.

The entire experience is a **counterfactual/hypothetical schedule** from the provided model; it is **not** an official NCAA/league schedule, live game feed, or actual scores/standings product. Never create fictitious results, start times, TV channels, odds, rankings, or extra fixtures. Make the modeled/official distinction unmistakable.


### Official application identity — mandatory

- **App name (exact spelling and capitalization): `College Gridiron Nirvana`.** This replaces all previous working titles. Do not display or retain any retired working title anywhere in application copy, demo content, branding or documentation.
- The wordmark in the global header and home/dashboard hero reads **College Gridiron Nirvana**. Use it in desktop/mobile navigation, browser tab title, default Open Graph metadata, manifest/app name and share text. Suggested short mobile title: **Gridiron Nirvana**, only when space is constrained.
- Suggested repository/package slug: `college-gridiron-nirvana`; use a valid npm package name and a descriptive product tagline such as **Five seasons. Every team. Every game.** Tagline is secondary to the required title.
- School and conference marks are the primary visual identities of the teams/conferences, while the **College Gridiron Nirvana** title is the product's separate wordmark. Do not suggest endorsement by the NCAA, conferences or universities.
- Include an automated check or codebase-wide search before release to ensure the old working title does not appear in rendered UI, metadata, source documentation, or tests.

## 2. Required input files — READ THESE FIRST

The starter kit has these relative paths:

| File | Role |
| --- | --- |
| `data/cfb_full_games.json` | **Primary canonical fixture feed**, exactly **2,210 unique games**; one record per game, not per team. Use this to populate all schedules and game listings. |
| `data/College_Football_P4_Scheduling_Model_2027-2031.xlsx` | **Reference workbook and model audit evidence**, with 15 sheets covering calendars, validations, rivalries, five-year pair rotation, G6 assignments, provenance, sources, and exceptions. |
| `data/cfb_validation_issues.json` | The original solver's validation issue list; expected `[]`. Treat as a supplementary check, not a replacement for runtime validation. |
| `data/g6_venue_overrides.json` | **Venue correction audit**: 68 changed G6 sites, including seven originally published locations overridden by the Power Four home-campus rule. Show original-versus-modeled venue transparently. |
| `scripts/validate-g6-hosting.mjs` | Standalone mandatory venue/business-rule validator; run before UI build and from the app's normal test pipeline. |
| `G6_HOME_RULE_UPDATE.md` | Concise change-order instructions for implementing the new P4-hosted G6 rule in an already-running Claude Code app. |
| `source/College_Football_Model_Source_2027-2031.zip` | Reproducible Python optimizer/workbook scripts, useful to understand or later regenerate the scenario. **Not required to run the viewer.** |
| `data/logo-targets.json` | Complete mapping of **134 unique schools**, aliases and conference-brand targets for local logo asset import. |
| `scripts/sync-logos.mjs` + `scripts/logo-matcher.mjs` | GitHub-library asset sync, exact-name disambiguation, local image download and manifest generator. |
| `src/components/LogoBadge.tsx` + CSS | Reusable team/conference image components. Adapt to the app layout and imports. |
| `LOGO_UPGRADE_FOR_CLAUDE.md` | Detailed design/integration steps and logo acceptance tests. Follow these too. |

If you are running from a location other than this starter kit, search the working directory for those exact file basenames and reconcile paths. **Do not replace the supplied fixture data with invented/sample games, live APIs, or scraped future schedules.**

Before implementing UI, inspect the actual workbook sheet names/columns, extract summary metadata, and verify the JSON structure/counts. Source ZIP contains `README.txt`, `cfb_model.py`, `solve_matchups.py`, `greedy_slots.py`, and `build_cfb_workbook.py`. Source regeneration requires Python plus NumPy, SciPy, NetworkX, and `artifact_tool`; the production app must **not** need Python or those libraries.

### Canonical JSON game schema

`data/cfb_full_games.json` is a **JSON array**. Records currently have these exact, case-sensitive keys:

```json
{
  "Year": 2027,
  "Home": "Alabama",
  "Away": "Florida",
  "Type": "Conference",
  "Conference": "SEC",
  "Venue": "Alabama campus",
  "Site type": "Campus",
  "Status": "Published",
  "Source URL": "https://www.secsports.com/...",
  "Requested week": null,
  "Game ID": "2027-0001",
  "Week": 6,
  "Date": "2027-10-09",
  "Week label": "Week 6"
}
```

* `Type` is one of `Conference`, `P4 nonconference`, `G6`.
* `Site type` is `Campus` or `Neutral`.
* `Status` contains `Published`, `Protected`, `Modeled rotation`, `Model generated`, `Modeled regional`, and **`Venue override`**. `Venue override` means the opponent pairing was originally published but its home/neutral site was deliberately changed in this hypothetical scenario. It is **NOT** an officially approved new venue. Keep the raw value and derive a clearer user-facing description.
* `Conference` means **the conference associated with the game/category**, not necessarily the home team's conference. Derive both schools' conference affiliation from the workbook/source roster; don't mislabel a nonconference matchup.
* `Home` / `Away` are **administrative home/away designations**. For neutral-site matchups show **Neutral**, the stadium/location and both teams, rather than misrepresenting a real campus home game.
* `Requested week` is often `null`; `Week` and `Date` are actual slots **in this generated model**. `Date` is generally a representative Saturday and is not necessarily an officially announced playing date.
* `Source URL` may be blank or contain explanatory prose rather than a URL. Make it clickable **only when it is a valid `https://` or `http://` URL**, and use proper external-link behavior.
* `Game ID` is unique and stable within this scenario. Use it for routes and React keys.

Define a typed normalized entity (camelCase keys, parsed season/week, away/home conferences, venue classification, display status) in `src/lib/model.ts`; preserve a reference to the original input for audit. Make the normalized data the **single source of truth**: all team views, weekly views, analytics, charts, and exported files must derive from it, not be separately hardcoded.

### Workbook sheets (actual names)

1. `01 | Overview` — scenario summary
2. `02 | Weekly Games` — 2,210 fixture rows and Game IDs
3. `03 | Team Calendar` — each team/season, Week 0–13 with `BYE`
4. `04 | Team Games` — per-team game rows, opponent, H/A/N, category, venue and provenance
5. `05 | Conference H-A` — all within-conference pairings and directional coverage over five years
6. `06 | Annual Validation` — team-season counts, P4 vs G6, conference requirement, byes, PASS
7. `07 | Rivalry Locks` — protected annual conference and cross-conference rivalry fixtures
8. `08 | P4 Balance` — conference-to-conference nonconference counts per year
9. `09 | Team Crossplay` — team-by-opposing-conference exposure
10. `10 | P4 Repeat Audit` — repeated interconference opponents vs protected rivalries
11. `11 | G6 Assignments` — G6 team, geographic affinity, week, site, and source
12. `12 | Conference Sources` — official vs modeled conference commitments/coverage
13. `13 | Contract Exceptions` — known published-commitment conflicts and model treatments
14. `14 | Sources` — supporting source URLs and coverage notes
15. `15 | Assumptions` — caveats, rules, modeled dates, neutral-site exceptions

Read these sheets at build/import time with an appropriate Node-compatible Excel reader such as `exceljs`. Serialize the metadata needed at runtime into generated static JSON (e.g. `src/data/generated/`). Do not make browsers fetch or parse the XLSX on every visit. If a sheet is missing or changes format, fail the data-preparation step clearly; don't silently drop the audit trail. The workbook and primary JSON fixture feed should be cross-checked by Game ID and matchup/week/year.

## 3. Model business rules — DO NOT ALTER IN A READ-ONLY APP

This scenario uses **2027, 2028, 2029, 2030 and 2031** with **68 participants: 67 P4 conference programs plus independent Notre Dame**. Four conferences: SEC 16, Big Ten 18, Big 12 16, ACC 17. The 68th participant is Notre Dame.

* Each participant plays **exactly 12 games every season: 11 Power Four/Notre Dame-equivalent games + exactly 1 non-Power FBS (G6) game; no FCS games**.
* SEC / Big Ten / Big 12: **9 conference games each** every season.
* ACC: 16 programs play nine conference games, **one program plays eight** each season because the ACC has 17 teams. Modeled exceptions: **2027 Clemson, 2028 Stanford, 2029 SMU, 2030 California, 2031 Boston College**. Only the 2027 designation is sourced as published; later years are scenario assumptions.
* Notre Dame is **independent** and has **zero official conference games**. All 11 games against the P4 pool are recorded as `P4 nonconference`, even when the opponent is in the ACC. Notre Dame historically has an ACC football arrangement; show the relationship if appropriate, but never incorrectly relabel such games as conference games.
* **Notre Dame–Navy is protected every year and uses Notre Dame's one and only G6 slot**. Notre Dame's other 11 P4 matchups are schedule-flexible in future scenario updates; do not treat previously published Notre Dame contracts as permanent locks apart from Navy. The imported baseline already complies. Verify it.
* **MANDATORY G6 HOME-CAMPUS RULE:** Every G6 game for any of the **67 actual SEC, Big Ten, Big 12, or ACC schools** must be played **on that Power Four school's home campus**. For every `Type === 'G6'` fixture except Notre Dame–Navy: `Home` must be the P4 school, `Away` must be the G6 opponent, `Site type` must equal `Campus`, and `Venue` must equal `<P4 school> campus`. **No P4 road games at G6 schools and no P4–G6 neutral-site games.** The *only* permitted exception is **Notre Dame versus Navy**, which may be at Notre Dame, Navy, or a properly sourced neutral venue; the 2027–2031 fixture data currently alternates Notre Dame campus (2027/2029/2031) and Navy campus (2028/2030). Do not impose a Notre Dame home requirement.
* This home-campus rule overrides conflicting legacy published venues. The corrected schedule replaces **68** original G6 location/orientation records (including **seven** published-commitment site changes), **without changing opponents, game IDs, weeks, dates, counts, or 11+1 structure**. Review `data/g6_venue_overrides.json` for original venue, new campus site, source, and whether a contract amendment would be necessary. Render those seven as *modeled venue overrides*, never as officially published locations.
* Rebuilt Pac-12 programs in the provided scenario are classified as **non-Power FBS / G6** for this particular model; do **not** silently recategorize them based on an external site's current league terminology.
* Five-year within-conference goal: each member plays each other member with each team **administratively** home at least once during 2027–2031 (529 unordered intra-conference pairings). For traditional neutral-site rivalries administrative home/away does **not** mean two real campus visits; explain this prominently in H/A views.
* Traditional rivalry games, including Georgia–Georgia Tech, Florida–Florida State, Clemson–South Carolina, Kentucky–Louisville, Iowa–Iowa State and Pitt–West Virginia, are annual in the dataset. Consult `07 | Rivalry Locks` and the source scripts for the complete protected set. Notre Dame–Navy is also a special annual rivalry but is G6, so show it even if not included in the workbook's P4 Rivalry Locks sheet.
* Georgia–Florida is at **Tampa in 2027** per the modeled decision to preserve the published 2027 commitment, then Jacksonville from 2028. Oklahoma–Texas is a neutral-site rivalry at the Cotton Bowl. Surface the venue exceptions.
* Notre Dame–USC is on hiatus in 2027–2029, and is scheduled in 2030–2031. **Never falsely show it as annual across all five years.**
* Fourteen displayed weekly slots: **Week 0 through Week 13 inclusive**, two byes for each P4/Notre Dame team. Dates are modeled Saturdays; do not invent kickoff times.
* For G6 schools, the source covers **only their games against P4/Notre Dame programs**, not their entire football seasons. A G6 opponent search can show its appearances *within this model* but cannot claim to be its full 12-game schedule.
* Published commitments ingested into the model are **not exhaustively complete** for every athletic department through 2031. The app must carry that caveat in the methodology/assumptions section.

* **Model v2.0 amendments (2026-10-15, user-approved).** The baseline is now **v2.0** (`data/model-version.json`); v1.0 is archived in `data/archive/v1.0/`. Additional rules: each team's two byes are separated by **at least 4 games** (no back-to-back byes); **no P4 non-conference pair in consecutive seasons**, except protected rivalries and the published multi-year series listed in `data/model-version.json`; **Clemson–Notre Dame is annual** (2030 game added, Clemson at Notre Dame). All other rules and counts below are unchanged.

**Annual expected game count**: 301 conference + 73 P4 nonconference + 68 G6 = **442 unique games**. Across five seasons: 1,505 conference + 365 P4 nonconference + 340 G6 = **2,210**. The number of game rows is **not** 68 × 12 per year: Power-vs-Power games count once per fixture, despite appearing in two team schedules.

## 4. Recommended implementation stack

Build a real project; use sensible defaults, not speculative infrastructure:

* **Next.js (App Router) + React + TypeScript, strict mode**.
* **Tailwind CSS** with a restrained, premium college-football/analytics visual language; use **shadcn/ui** or accessible headless primitives and **Lucide** icons.
* **Recharts** only where a chart makes a comparison clearer; avoid gratuitous infographics.
* Pre-generated local typed JSON or build-time imports; **no database or API keys required** to view this fixed five-year scenario. Serverless/static deployment should be possible.
* `npm` scripts: `dev`, `build`, `lint`, `test`, `data:prepare`, `logos:sync`, `logos:check` and (ideally) `test:e2e`.
* **Vitest** for data selectors and invariant tests; **Playwright** for critical end-to-end flows when feasible.

Use clean, modular code (`src/lib/data/`, `src/lib/selectors/`, `src/components/`, `src/app/`, `scripts/`), no giant single-file demo. Do not embed 2,210 games inline in React components or invent a remote REST API. Support browser back/forward and durable query-string/deep links. Prefer local filtering/indexes for responsive search and selection.

## 5. Information architecture and functional acceptance criteria

### A. Home / Dashboard (`/`)

* Clear headline, model date range, a prominent **Scenario / Not Official** disclosure, season selector, global team search, and current-selected week control (default 2027 Week 0; **do not** derive a fictional "current week" from today's real calendar).
* Small factual KPIs for the selected season (442 games, 68 P4/ND programs, 301 conference games, 73 P4 nonconference, 68 G6 matchups). Show derived rather than hardcoded values where feasible.
* Immediately usable shortcuts to "Find a team", "Browse a week", "Rivalries", "Conference rotations" and "Compare teams".
* Optional notable rivalry tiles calculated from the data, with source/status and correct year/week. Never invent fixtures.

### B. Teams directory (`/teams`)

* Search as the user types, fuzzy-match program names/abbreviations where helpful (e.g. UGA → Georgia; OSU is ambiguous: Ohio State/Oklahoma State, show both).
* Filter by SEC / Big Ten / Big 12 / ACC / Independent; 68 total schools.
* Selecting a team opens `/teams/[teamSlug]?season=2027`, preserving the chosen season across navigation.
* Conference labels and unambiguous names; use authentic school and conference logos from the provided FBS Logo Library integration. A readable monogram is only the temporary error fallback, not the intended finished UI.

### C. Team schedule (`/teams/[teamSlug]?season=YYYY`)

* A 14-week **season strip** (Weeks 0–13), displaying each week as opponent or **BYE**. Desktop horizontal grid/timeline, mobile stacked or horizontally scrollable list with accessible labels.
* Main list of **12 games in chronological week order**: model date, week, opponent, opponent conference, H/A/**Neutral**, category, venue, provenance status. Visually distinguish conference / P4 nonconference / G6 using accessible labels, not color alone.
* Clicking a game opens `/games/[gameId]` (or accessible detail drawer) with game information, neutral venue notes, source citation, and modeled vs published disclaimer. Each opponent name links to that team's schedule **only if it is within the 68-school pool**; G6 details should explicitly say "P4-model appearance(s) only".
* Summary: 12 games, 11 P4 games, one G6, conference mandate (if applicable), home/away/neutral split, byes, P4 opponents by conference, protected rivalries. Note that home/away labels are administrative at neutral sites. **For all 67 P4 schools the G6 game MUST display as `Home` at its own campus**; Notre Dame–Navy may display home or away.
* Season switcher retaining the team; one-click next/previous season; link/copy URL; **download CSV**, **print-friendly schedule**, and **ICS calendar export**. ICS event descriptions must say *modeled date/time unknown*, and must **not** fabricate kickoff times; use all-day date-only events with escaping and stable identifiers.
* Optional five-year tab showing an opponent matrix / all five schedules. Expose a quick "Where does [team] play [opponent] across 2027–2031?" lookup.

### D. Weekly game board (`/weeks/[year]/[week]`)

* User can choose **any of five years and any of 14 weeks**, including Week 0 and Week 13. Prev/next buttons should cross week/year boundaries cleanly.
* List **every game scheduled in that exact week**, uniquely once. Show model Saturday date (no fake kickoff times); away at home vs neutral-site display, conferences of both teams, category, provenance.
* Filters: game category, conferences **either participant belongs to**, teams, venue type, and published/model-generated. Search home or away school. Show counts by category and total filtered results. Empty states explain current filters and provide clear reset.
* Enable grouping by conference/game category or ungrouped, and sorting by matchup name, category, or modeled designation. Avoid time-based sort because kickoff times are unknown.
* Each game card links to both relevant P4 team pages and the game details. Mobile experience must remain easy to scan.
* Download currently filtered games as CSV; print-friendly layout; copy a permalink retaining year/week/filters.

### E. Conferences (`/conferences` and `/conferences/[slug]?season=YYYY`)

* Directory plus conference-specific schedule dashboard. Show member programs, nine-game mandates (with ACC rotating exception), games by week, and balanced count of home/away for member programs.
* Conference games by week and team-season matrix; click through to team schedules.
* Five-year **home-and-away coverage matrix** using `05 | Conference H-A`: select two same-conference teams, show all their meeting seasons, administrative home, venue, and a sourced PASS/FAIL. Never present neutral-game administrative designation as actual campus visitation.
* 2027 ACC Clemson exception and later modeled exceptions must be labeled distinctly.

### F. Rivalry Explorer (`/rivalries`)

* Browse/search named traditional rivalries and all locks from `07 | Rivalry Locks`; include special **Notre Dame–Navy**, cross-conference annual series, and neutral-site rivalries.
* Rivalry detail: game dates/weeks/opponents/sites **for each year**, plus status/exception (for instance, USC–Notre Dame 2027–29 hiatus). Make preserved vs temporarily absent rivalry distinction explicit; derive actual games by searching the fixture dataset, not by assuming five games.
* Show Florida–Georgia Tampa 2027 / Jacksonville 2028–31, and Texas–Oklahoma Cotton Bowl as actual neutral-site stadium rows.

### G. Team & matchup comparisons (`/compare`)

* Select Team A / Team B and season(s); side-by-side 14-week schedule, record-free structural comparison: conference opponents, P4 nonconference opponents, G6 opponent, home/away/neutral, byes, number of unique opponents, interconference distribution.
* Head-to-head check: if they meet that season or across five years, list real schedule fixtures and sites. If they do **not**, clearly show "No modeled meeting".
* No invented "strength of schedule" rating unless the user uploads or configures an independently sourced metric; number of P4 opponents alone does not establish competitive strength.

### H. Analytics & audits (`/analytics`)

* Five-year selectable analytical views: game-type counts, 4-conference interconference distribution, conference-to-conference P4 meetings, per-team five-year crossplay, nonconference repeat frequency, regional G6 assignment mix, neutral games, byes.
* Incorporate `08 | P4 Balance`, `09 | Team Crossplay`, `10 | P4 Repeat Audit`, and `11 | G6 Assignments`, calculated from normalized fixtures and cross-checked to workbook totals. Add a **G6 Home-Site Compliance** card: each year 67/67 conference-member G6 games are on P4 campuses; Notre Dame–Navy is shown separately as an exempt rivalry. Show the seven historical published-venue conflicts in a drill-down.
* Include an approachable conference×conference matchup heatmap (including Notre Dame as Independent) and five-year home/away coverage dashboard. Provide drill-down into supporting games.
* Don't fabricate scores, team records, odds, travel distances, or advanced performance numbers.

### I. Methodology, provenance & exceptions (`/methodology`)

* Explain 68 participants, game counts, conference mandates, ACC exception, Week 0–13, two byes, Notre Dame/Navy policy, **mandatory P4-on-campus G6 scheduling with Notre Dame–Navy exception**, Pac-12 classification for this model, and the non-exhaustive future-contract audit.
* Surface source table `14 | Sources`, assumptions `15 | Assumptions`, and sortable/filterable `13 | Contract Exceptions` with source URLs, plus `data/g6_venue_overrides.json`. Present original published G6 sites side-by-side with their newly modeled P4-campus sites. Show source links on game details whenever valid.
* Clearly differentiate **published matchup/venue commitments** from **model-assigned weeks/dates**. The `Status: Published` field does NOT guarantee the model's full date/time is official.
* State that the project is a hypothetical scheduling exercise; neutral sites and administrative host accounting are not physical campus home games.

## 6. UX / visual quality bar

Produce a distinctive and credible **premium sports data** feel: precise typography, confident visual hierarchy, generous but efficient density, strong navigation, attractive compact matchup rows, legible conference chips, and subtle grid/field references without cliché grass textures. Use a restrained design system (e.g., charcoal/near-black, warm white, tasteful accent), support **light and dark modes**, and maintain accessible contrast.

Persistent app shell: brand, season selector, search/command-palette-like team picker, navigation to Teams / Weeks / Conferences / Rivalries / Compare / Analytics / Methodology. Route-aware selection state belongs in URL parameters where reasonable. Keyboard accessibility, focus indicators, reduced-motion support, responsive 360px+ screens, no layout jumps. Skeletons/empty states only for actual loading/empty states, not fabricated content. Do not depend on remote images or services for baseline functionality.

A few useful enhancements are welcome if time permits: favorites saved locally (clearly labeled personal preference), recently viewed schools, bookmarkable filtered weekly views, team-to-team meeting finder, and "next/previous" buttons for week and season. **Do not sacrifice core correctness** for optional effects.

## 6A. Mandatory team and conference logos (visual requirement)

**No generic black square/rectangle team or conference placeholders in the finished app.** The logo source selected by the user is [Lou34964/FBS-Logo-Library: CFB Logos](https://github.com/Lou34964/FBS-Logo-Library/tree/main/CFB%20Logos). The starter contains a purpose-built importer at `scripts/sync-logos.mjs`, a 134-team lookup file at `data/logo-targets.json`, the reusable `<TeamLogo />` and `<ConferenceLogo />` React components, and complete build instructions in `LOGO_UPGRADE_FOR_CLAUDE.md` (read and implement them).

Run `node scripts/sync-logos.mjs --strict` with internet access (or provide `--local=/path/to/cloned/FBS-Logo-Library`), review the coverage report, and resolve ambiguous or missing files using exact repository paths in `data/logo-overrides.json`. Copy verified marks to `public/logos`, use `src/data/generated/logo-manifest.json` for **every** display, and make the app work with local static images. Hard requirement: **134/134 schools** (including Navy and every G6 opponent) and **4/4 P4 conference logos**. The importer also seeks the other six FBS conference logos as optional enhancements.

Use logo tiles that permit the artwork to breathe (`object-fit: contain`, no cropping, stretching, color inversion, or black placeholders). Team logo sizes should scale with context: ~32px in weekly rows and selectors, ~64px on matchups and comparisons, ~96px on team headers. Conference marks appear on conference pages, directory cards, and filters. Use a subtle neutral tile behind low-contrast marks. Provide accessible alt text and legible short-name fallback if an image genuinely fails; fallback is **not** a substitute for completing asset coverage. Handle hard name collisions (`USC` vs `South Carolina`, `Miami` vs `Miami (OH)`, `Ohio` vs `Ohio State`, `Georgia` vs `Georgia Tech`, etc.) conservatively. Do not misidentify a university just to increase reported coverage.

The asset repository is a third-party collection; the logos are institutional trademarks. For public/commercial distribution check rights independently. The kit intentionally does **not** redistribute the logo binaries. Do not claim university, conference, or NCAA endorsement. Do not change any fixtures when adding logos.

## 7. Data pipeline, source-of-truth rules and precision

* Write a deterministic `npm run data:prepare` script that reads `data/cfb_full_games.json`, derives roster from the full model sources (rather than selecting every name as a P4 member), and imports audit/lookup metadata from the Excel workbook. The output should be typed, stable, and tracked or regenerable. Validate that required files exist and print helpful error messages.
* Identify **Power pool membership** from the four conference team lists plus Notre Dame, not by aggregating every `Home`/`Away` name: the JSON also contains G6 teams. Exact roster appears in `cfb_model.py` as `CONF` plus Notre Dame; cross-check with workbook.
* Use one canonical game array and derived indexes: `gamesByYear`, `gamesByYearWeek`, `gamesByYearTeam`, `gamesByPair`, `conferenceByTeam`. Include G6 team-only model appearances as a separate concept.
* Some names overlap or are confusing (e.g., **USC = University of Southern California**, **South Carolina** is different). Use clear slugs and mappings. Preserve game IDs with exact case/digits and never mistake league labels for opponents.
* Neutral-site rendering: `Site type === 'Neutral'` controls display even if `Home` contains a designated administrative host. In team schedules show `N` not `H/A`, with the actual stadium displayed separately.
* Date handling: ISO YYYY-MM-DD strings represent **calendar days**, not UTC midnight moments. Parse/render them without timezone-induced off-by-one dates. No kickoff times appear in source; do not supply them.
* `BYE` rows do not exist in primary JSON; derive the two absent weeks in 0..13 for each team/season.
* When source status/metadata disagree or a future-contract conflict exists, preserve the source record and show an audit warning; **never silently "fix" the fixture list**. The 68 G6 site changes are already applied in the canonical JSON and recorded in `data/g6_venue_overrides.json`; don't revert them by re-importing historic commitments. The seven originally published sites that conflict with the rule must be visibly marked `Venue override`.
* Workbooks may include human-readable `Source URL` strings that are not URLs. Validate before rendering anchor links.
* Include a simple data-refresh guide for swapping in a newly regenerated 2027–2031 workbook/JSON; rebuild indexes and rerun tests. Keep provenance visible and avoid claiming live synchronization.
* No actual interactive scenario editor or solver is required for v1. If you add a future "What-if schedule" feature, separate it from the immutable baseline and do not permit one-sided edits: game swaps must update **both participants**, constraints, weeks, and audits atomically or rerun the optimization solver.

## 8. Non-negotiable automated validations

Implement scripts/tests that load the **actual** data and assert all the following (fail loudly on error):

| Validation | Expected |
| --- | --- |
| Years | Exactly 2027–2031 |
| Unique game IDs | 2,210 distinct IDs and 2,210 rows |
| Unique games/year | **442** |
| Conference games/year | **301** |
| Nonconference P4 games/year | **73** |
| G6 games/year | **68** |
| Power-participant population | **68** (67 conference teams + Notre Dame) |
| Games per team/year | **12** |
| Power-pool opponents per team/year | **11** |
| G6 opponents per team/year | **1** |
| Conference games per team/year | **9** for SEC/Big Ten/Big 12; ACC 9 except one yearly 8; Notre Dame 0 |
| Week range | Integers **0 through 13** |
| Bye weeks per P4/ND team/year | **2** |
| Weekly double bookings | **0** across all participants, including any shared G6 opponent |
| FCS games | **0** |
| Notre Dame–Navy | **Exactly once in every year**, and no other Notre Dame G6 opponents |
| P4 vs G6 venue | **335/335** P4–G6 games (67 × 5) hosted on P4 **home campus**; `Home` is P4, `Away` is G6, `Site type` is `Campus`, `Venue` is `<P4> campus` |
| P4 road/neutral G6 games | **0** in every season, not counting Notre Dame–Navy exception |
| Notre Dame–Navy venue exception | Allowed to be home or away; baseline years **2027, 2029, 2031** at Notre Dame campus; **2028, 2030** at Navy campus |
| G6 venue changes audit | **68** changes recorded, including **7** sites of published commitments; reconcile `data/g6_venue_overrides.json` by Game ID |
| Home/away within-conference five-year coverage | **529 / 529** unordered conference pairings have both administrative home directions |
| Annual traditional protected rivalry matchups | Match model's `07 | Rivalry Locks` fixtures, with special handling for Notre Dame–Navy and Notre Dame–USC hiatus |
| Source-vs-display reconciliation | Every primary JSON game appears in exactly one weekly game board and in one or two participant team schedules as appropriate |
| Workbook vs JSON | Check `02 | Weekly Games` Game IDs, years, weeks, hosts, visitors against canonical JSON; fail or explain any mismatch |
| School logo coverage | **134/134** distinct names found in game data match verified local source images |
| P4 conference logo coverage | **4/4** SEC / Big Ten / Big 12 / ACC verified local marks |
| No mismatched/ambiguous image assignments | **0** incorrect logo mappings; human review for source-name collisions |

Also test user workflows:

1. Select **Georgia, 2027** → displays **12** games, one **G6**, two **BYEs**, Georgia Tech protected matchup and Florida neutral-site game in **Tampa**.
2. Select **Notre Dame** for **each of five seasons** → 12 games, exactly **11 P4 + Navy**, with Navy once per season; ND–USC appears **only 2030 and 2031**.
2a. Select **Florida 2027**, **Washington 2027**, **Oregon 2028**, **Ole Miss 2029**, **BYU 2028** → each G6 game is **on the selected P4 school's campus** even if an older published source lists a G6 road/neutral venue. Show the seven contract changes as `Venue override` with original source metadata.
3. Select **2027, Week 0** → displays all games with `Year=2027`, `Week=0`, no duplication; try conference filter and reset.
4. Select **2028, Week 13**, go next → correctly opens **2029, Week 0** (or explicitly state cross-season navigation behavior if you decide to stop at boundary).
5. Choose **Ohio State** and **Michigan** on Compare; confirm the same underlying matchup appears in each respective team schedule and only once in that week's league-wide list.
6. Inspect the five-year conference matrix; confirm neutral sites are not falsely called physical home campuses.
7. Export a schedule to CSV and ICS; validate CSV row count and well-formed date-only all-day ICS events.
8. Navigate from filtered game list → game detail → opponent team → browser back; preserve filters/season where the URL encodes them.

Use unit tests for pure selectors; integration/e2e tests for at least team selection, week switching, game details and filtering. Build and lint must succeed.

## 9. Implementation sequence — EXECUTE, do not stop after planning

1. Inspect project files and workbook tabs; verify input files/counts and document any genuine discrepancy.
2. Initialize Next.js project in this directory while retaining `CLAUDE.md` and `data/` + `source/` inputs. Use relative paths throughout; no external infrastructure.
3. Create strongly typed importer, normalization/roster tables, provenance metadata, indexes, and validation script. Run validations immediately, including `node scripts/validate-g6-hosting.mjs`. **Do not proceed with UI if any non-Notre-Dame P4–G6 game is away or neutral.**
3a. **Before finishing any screens, integrate authentic logos** from the supplied repo using `LOGO_UPGRADE_FOR_CLAUDE.md` and `scripts/sync-logos.mjs`. Use the exact local assets in every team/conference display. Resolve coverage to 134/134 schools plus 4/4 P4 conferences, and visually check difficult name matches.
4. Build consistent layout/design system plus shared controls: season dropdown, team search, week picker, game row, conference/category badges, provenance disclosure, venue chip, export helpers.
5. Deliver in this order: **team schedule**, **weekly game board**, team directory, dashboard, game detail, conference view, rivalry view, compare, analytics, methodology.
6. Add filters, deep linking, CSV/ICS exports, keyboard/a11y, mobile layouts, and comprehensive empty/edge cases.
7. Run `npm run data:prepare`, `npm run test`, `npm run lint`, `npm run build`, and e2e tests if available; resolve errors. If browser tools are available, open representative routes and inspect actual layouts before finishing.
8. Produce a succinct `README.md` covering `npm install`, `npm run dev`, regeneration/import, architecture, known caveats and how to deploy (Vercel or any Next.js-compatible host).
9. At completion, report what was implemented, the commands to run, whether test/build passed, source-data counts, and any explicitly incomplete nonessential features. **Never say the app is built until working code and validation exist.**

### Definitions of done

The user can run `npm install && npm run data:prepare && npm run logos:sync && npm run dev` (or a pre-synced local-asset build), pick **any Power Four/Notre Dame team and season**, inspect its full **week-by-week 12-game schedule including byes**, open **any year/week to see every scheduled game**, understand whether a fixture is published/protected/modeled, and access all other views without inaccurate or missing data. Deep links work, exports work, mobile is usable, accurate logos are displayed for every school and the four P4 conference marks, and the expected **2,210 unique fixtures** plus the **335 P4-campus G6 hosting checks** pass automated checks.

**Final guidance:** Treat supplied model data as the truth of this *hypothetical* scenario, and transparency about modeled commitments, venues, and dates as an essential product feature. Build the complete functioning app, not a slideshow or speculative redesign.
