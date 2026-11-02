# Claude Code: Add official school and conference marks to the College Gridiron Nirvana app

## Product branding

The application is officially named **College Gridiron Nirvana**. Retain this exact title in the global header, browser title, SEO/share metadata, navigation, and any branded footer or print/export headers. Remove the former working title from the UI and documentation. The logo asset work must complement this new branding, not replace the product's title with the individual school marks.

## Objective

**Implement this change in the existing working application**, rather than rebuilding it or stopping after producing a proposal. Replace the generic black squares/rectangles for teams and conferences with their corresponding authentic marks from this source repository:

**https://github.com/Lou34964/FBS-Logo-Library/tree/main/CFB%20Logos**

Maintain all 2027–2031 matchups, game IDs, protected rivalries, weeks, opponents, and existing navigation/filters unchanged. The supplied fixture data already incorporates the separate **P4 home-campus G6 requirement**: every P4–G6 game except Notre Dame–Navy is on the Power school’s campus. Do not restore older road/neutral G6 venues. This logo task itself is a **visual branding/data-asset enhancement**, not a request to change any further matchups or venues.

## Assets, scope and source of truth

1. The supplied `data/cfb_full_games.json` contains **134 distinct schools** appearing as opponents: 68 Power Four / Notre Dame programs and 66 G6 schools. **Every distinct school that appears on a game card must have its correct logo**, not merely the 68 P4/ND teams.
2. Include conference logos for the **SEC, Big Ten, Big 12 and ACC**, including the conferences directory, filters, conference headers, and matchup metadata where relevant. Bonus: handle logos of other FBS conferences if the app has explicit, properly sourced conference metadata. Do not guess G6 memberships from the school name; the source game JSON does not provide that field.
3. The included `data/logo-targets.json` enumerates the exact 134 schools, conference membership for the 68 Power participants, safe team aliases, and 10 conference-brand targets. Treat this mapping as canonical for lookups. Never infer names from image array positions or from the `Conference` field on individual nonconference games.
4. The FBS Logo Library is a **third-party collection of school/conference marks**. It is a source for the authentic images, **not proof of trademark usage rights** or school endorsement. Do not reproduce its art by AI, recolor it, insert unofficial imitations, or claim the application is NCAA-endorsed. Logos remain trademarks of the relevant institutions and conferences; review permissions if deploying commercially or publicly.

## Implementation steps

1. **Inspect the codebase** and identify the black-placeholder components used for teams/conferences. Check: team selector, search results, team header, team cards, weekly game board, game detail page, rivalries, conference views, comparison views, analytics, mobile views, and printable/export layouts. Use one centralized image component and one manifest, never ad hoc hardcoded URLs in individual screens.
2. Obtain the original source assets. A ready-to-use Node script is supplied at `scripts/sync-logos.mjs`. From the project root run:
   - `node scripts/sync-logos.mjs --strict`
   - If GitHub API access is blocked/rate limited, clone/download the supplied repository and run `node scripts/sync-logos.mjs --local=/path/to/FBS-Logo-Library --strict`.
   - This reads the repository's asset tree, matches names conservatively, validates image bytes, saves local PNG/SVG/WebP files in `public/logos/`, and writes `src/data/generated/logo-manifest.json` and `data/logo-coverage-report.json`.
   - An unresolved/ambiguous image should be investigated and explicitly corrected in `data/logo-overrides.json` using **the exact path returned by the source repository**. Rerun until **all 134 teams and four primary conference logos** have been verified; ideally all 10 conference targets. Do not silently assign the wrong logo.
   - **Important:** the shipped kit contains import scripts, mappings and UI components but not copyrighted logo image binaries. Acquire them from the linked source in your development environment.
3. Use or adapt `src/components/LogoBadge.tsx` and `src/components/logo-badge.css`. Its exports are `<TeamLogo name="Georgia" size="md" />` and `<ConferenceLogo name="SEC" size="sm" />`. It looks up images via the local manifest, renders them at consistent sizes with `object-fit: contain` and transparent padding, and has a text fallback if a file fails. Adjust imports to match the existing Next.js project; use standard `<img>` or configure `next/image` for local files. Ensure all images have meaningful alt text.
4. **Replace** the generic black placeholder rectangles with these image-containing badges. Logo placement:
   - Team selector/search list: 28–36px alongside team name and conference label.
   - Team profile/header: ~72–96px primary school logo.
   - Weekly game rows: both team logos, ~32–42px each, same baseline; clearly preserve away/home orientation and neutral-site labels.
   - Game detail and comparison: 56–72px for both schools.
   - Conference directory/headers/filters: the official conference mark next to conference name; legible on dark and light themes.
   - Rivalry pages, related/opponent links, analytics tables, and any team chips: reuse the same component.
   - G6 games: **both teams** get logos, including Navy. Never show an empty black square for G6 opponents.
5. Use a **quiet, adaptive tile/backplate**, not a pure-black block. Preserve each logo's aspect ratio and color. Apply `object-fit: contain`, adequate internal padding, and consistent bounding boxes. Avoid clipping tall or wide marks and avoid color filters that change official school branding. If a dark logo disappears in dark mode, use a subtle pale/neutral logo tile, not an inversion/recolor of the image; support an appropriate alternate authentic light-on-dark variant only if the repo has one.
6. Performance: serve locally, lazy-load logo images in long lists, avoid layout shifts using known intrinsic width/height or fixed containers, and do not require an external logo CDN to be online for the app to display.
7. Accessibility: alt text must include the school or conference name; hide purely decorative duplicate logos from assistive tech when the same name is adjacent. All missing assets must degrade to a legible abbreviation rather than a blank square.

## Naming / collision safety (critical)

The logos and model names may differ. The generated manifest must use **exact model names** as keys, including the following cases:

- `Miami` (University of Miami, FL) **versus** `Miami (OH)` (RedHawks)
- `USC` (Southern California) **versus** `South Carolina`
- `Georgia` **versus** `Georgia Tech` / `Georgia State` / `Georgia Southern`
- `Texas` **versus** `Texas A&M` / `Texas State` / `Texas Tech`
- `Ohio State` **versus** `Ohio`
- `Ole Miss` **versus** `Mississippi State`
- `North Carolina` **versus** `NC State`
- `UCF`, `BYU`, `SMU`, `TCU`, `UCLA`, `LSU`, `UMass`, `Pitt`, `FIU`, `UAB`, `UTEP`, `UTSA` and `Notre Dame`

The mapping script errs on the side of leaving ambiguous names unmatched and reporting them. **Review the source logos visually** before release, particularly where file naming is nonstandard. Do not invent a transparent logo or substitute another university's mark.

## Validation and definition of done

- `node --test scripts/test-logo-matcher.mjs` succeeds, including tests for commonly confused school names.
- Logo-coverage report confirms a verified source image for **134/134 distinct schools** and at least **4/4 primary P4 conference logos**; report other conference logos separately.
- Open team page for Georgia, 2027; every fixture has a logo on both sides including Georgia Tech and its G6 opponent. Repeat for Notre Dame/Navy, Miami versus Miami (OH), USC versus South Carolina, Ohio versus Ohio State, and games featuring G6 schools.
- Check 2027 Week 0 and 2028 Week 13: every game row displays both logos correctly and the screens remain responsive on phone widths.
- Switch light/dark themes. No logos are cropped, inverted, distorted, or invisible; image/network errors render a clear abbreviation rather than a blank black box.
- Check all views with teams/conferences, not just the main schedule.
- Rerun existing app data checks and `npm run lint`, `npm run build`, tests/e2e. No model fixture data changes are allowed.
- Add `npm run logos:sync` and `npm run logos:check` to package scripts and document the update/replacement process in the README. If the repository lacks a reuse license, don't commit redistributed art publicly without appropriate permissions.

**Proceed and implement these changes in the project. Do not ask for additional design decisions and do not stop at a description or mockup. Report the final logo coverage counts and any specific items requiring manual verification.**
