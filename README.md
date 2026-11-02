# College Gridiron Nirvana

**Five seasons. Every team. Every game.**

An interactive explorer for a **hypothetical, model-generated** 2027–2031 college football schedule covering 68 programs (67 Power Four conference members + independent Notre Dame). It is **not** an official NCAA or conference schedule: no scores, kickoff times, TV, odds or rankings exist in the data, and none are invented.

## Quick start

```bash
npm install
npm run data:prepare   # validate inputs, write src/data/generated/*.json
npm run logos:sync     # download school/conference marks into public/logos (needs internet)
npm run dev            # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run data:prepare` | Reads `data/cfb_full_games.json`, the workbook, `data/g6_venue_overrides.json`, `data/logo-targets.json`, `data/model-version.json` and the source ZIP roster; runs 48 invariant/reconciliation checks (including `scripts/validate-g6-hosting.mjs`); writes typed static JSON. Exits 1 on any failure. |
| `npm run workbook:build` | Regenerates the audit workbook (16 sheets) for the current model version. |
| `npm run logos:sync` | Runs the kit importer against the [FBS Logo Library](https://github.com/Lou34964/FBS-Logo-Library/tree/main/CFB%20Logos); writes `public/logos/`, `src/data/generated/logo-manifest.json` and `data/logo-coverage-report.json`. Exact-path corrections live in `data/logo-overrides.json`. Use `-- --local=/path/to/FBS-Logo-Library` if GitHub is unreachable. |
| `npm run logos:check` | Verifies every manifest image exists and is valid, no image is shared by two schools, and SEC/Big Ten/Big 12/ACC marks are present. Lists schools without a source image; `-- --strict` fails on them. Overrides accept an exact library path or `file:<project-relative path>` for a supplied image. |
| `npm run dev` / `build` / `start` | Next.js 16 (App Router). `build` runs `data:prepare` first. |
| `npm test` | G6 hosting validator, logo-matcher tests, retired-title branding check, then Vitest (85 tests on the real data). |
| `npm run test:e2e` | Playwright workflows against `next start` (run `npm run build` first; `npx playwright install chromium` once). |
| `npm run lint` / `typecheck` | ESLint (flat config) / `tsc --noEmit`. |

## Routes

`/` dashboard · `/teams` directory · `/teams/[slug]?season=YYYY[&view=five-year][&vs=slug]` · `/weeks/[year]/[week]?type=&conf=&team=&venue=&prov=&q=&group=&sort=` · `/games/[id]` · `/conferences` and `/conferences/[slug]?season=&a=&b=` · `/rivalries` and `/rivalries/[slug]` · `/compare?a=&b=&season=` · `/analytics?view=&scope=` · `/methodology` · `/g6/[slug]` (P4-model appearances only).

All selection state lives in the URL, so links are shareable and back/forward works. Week prev/next crosses seasons (2028 Week 13 → 2029 Week 0) and stops at the 2027/2031 edges.

## Architecture

```
data/                     supplied inputs (unchanged)
source/                   supplied Python model ZIP (not needed at runtime)
scripts/prepare-data.ts   data pipeline; scripts/lib/xlsx.ts = small XLSX reader*
src/lib/model.ts          RawGame → normalized Game (camelCase, both schools' conferences,
                          neutral handling, status → display provenance, validated source URL, raw ref)
src/lib/data/             roster (CONF + ND + G6, slugs, aliases), dataset indexes
                          (byYear, byYearWeek, byYearTeam, byPair, conferenceByTeam, g6Appearances)
src/lib/selectors/        team, week (filters ⇄ query string), conference, rivalries, analytics, search
src/lib/validation/       invariants shared by data:prepare, tests and /methodology
src/lib/export/           CSV, RFC 5545 ICS (all-day, date-only events)
src/components/, src/app/ UI (Tailwind v4, Lucide, Recharts)
```

\* The supplied workbook uses namespace-prefixed SpreadsheetML and absolute part paths that exceljs cannot open, so the pipeline uses a ~150-line jszip + fast-xml-parser reader. Formula cells are read from their cached values.

The normalized game array is the single source of truth. Every view, chart and export is derived from it; workbook sheets are used for audit metadata and cross-checks (e.g. `02 | Weekly Games` vs JSON, `05 | Conference H-A`, `07 | Rivalry Locks`, `08 | P4 Balance`).

## Data refresh

1. Optionally regenerate with the Python sources (`NumPy`, `SciPy`, `NetworkX`, `artifact_tool`).
2. Replace `data/cfb_full_games.json` and `data/College_Football_P4_Scheduling_Model_2027-2031.xlsx` (same basenames; the script also searches the tree for them).
3. `npm run data:prepare && npm test && npm run build`.

## Model versions

The app shows one model: **Baseline v2.0** (released 2026-10-15; see `data/model-version.json`). Compared with v1.0, the original starter-kit data, v2.0 adds three rules:
- byes at least 4 games apart;
- no P4 non-conference opponent in consecutive seasons, except protected rivalries and the published multi-year series listed in `data/model-version.json`;
- Clemson–Notre Dame every season, with a 2030 game added.

143 games changed week and 4 model-generated non-conference games were re-paired. No published game was removed. `/methodology#version` and workbook sheet `16 | Version History` list every change.

- **v1.0** is archived, unused by the app, in `data/archive/v1.0/` (games JSON, workbook and G6 venue audit).
- **v2.0** was produced from v1.0 with `python scripts/scenarios/no_repeat_nonconf.py --keep-nd-published --require "Clemson|Notre Dame|2030"` (Python with NumPy and SciPy). The workbook was then regenerated with `npm run workbook:build` (exceljs). Sheets 01–11 are recomputed from the fixtures; sheets 12–15 are carried forward with the v2.0 rules added.
- `npm run data:prepare` enforces the version's rules (`bye-spacing`, `no-repeat-nc`, `required-games`) along with every original invariant, and writes the v1.0 → v2.0 diff to `src/data/generated/version.json`.

To cut a future version: run the solver against the current data, write its output to `data/cfb_full_games.json`, archive the old files under `data/archive/vX/`, update `data/model-version.json`, then run `npm run workbook:build && npm run data:prepare && npm test`.

## G6 home-campus rule

All 335 G6 games for the 67 conference members (2027–2031) are home games on the Power Four campus; only Notre Dame–Navy is exempt (Notre Dame 2027/2029/2031, Navy 2028/2030). The supplied data already applies this: 68 G6 site records changed, seven of them previously published, now labeled `Venue override`. Their original sites are shown on game pages, `/analytics?view=g6home` and `/methodology#g6-venues`. Data preparation and tests fail if a P4 road or neutral G6 game reappears.

## Logos

School and conference marks come from a third-party collection and remain trademarks of their institutions. The images in `public/logos/` are gitignored and fetched with `npm run logos:sync`; check rights before any public or commercial deployment. Coverage is 134/134 schools and 10/10 conferences. The library has no file for **Delaware** or **Missouri State** (both Conference USA), so those two use user-supplied images in `assets/logos-local/`, referenced from `data/logo-overrides.json` as `file:` paths (the Missouri State image was trimmed of blank margins only). Any other school can be overridden the same way.

## Caveats

- Dates are modeled Saturdays (ISO calendar days, rendered without timezone conversion). "Published" means a matchup/site came from a cited source. It doesn't mean the modeled week or date is official.
- Neutral-site games (Florida–Georgia: Tampa 2027, Jacksonville 2028–31; Oklahoma–Texas: Cotton Bowl, and others) show **N**. The administrative home is shown only as an accounting label.
- G6 pages show only games against the 68 participants. They are not full seasons. The rebuilt Pac-12 is G6 in this model.
- Ingested future contracts are not an exhaustive audit of every athletic department.
- Rivalry nicknames are display labels.
- Favorites are stored only in the browser (localStorage).

## Deploy

Any Next.js-compatible host works, including Vercel (`vercel deploy`) or `npm run build && npm start` on Node 20+. The app needs no database, API keys or network services.
