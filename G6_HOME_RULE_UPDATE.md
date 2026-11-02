# College Gridiron Nirvana — mandatory G6 home-campus policy

**Instruction for Claude Code:** Apply this requirement to the existing application without altering the opponents, season/week assignments, game identifiers, or 12-game rule.

## Rule

Each of the **67 SEC, Big Ten, Big 12 and ACC schools** plays **exactly one G6 opponent per season, at home on its own campus**. It is never an away game or neutral-site game. This applies to any G6 opponent, including Pac-12 teams classified as non-Power for this scheduling scenario. **Only Notre Dame–Navy is exempt:** Notre Dame still plays Navy every year as its only G6 game and plays 11 other Power games. Navy may host Notre Dame or play on Notre Dame's campus, consistent with the scheduled rivalry; the current fixture alternates 2027/2029/2031 at Notre Dame and 2028/2030 at Navy.

## What changed in the supplied data

The attached `data/cfb_full_games.json` and Excel workbook have been updated already. **68** G6 game-site records required correction: **61** model-generated cases plus **seven** previously published venue assignments. The seven conflicts are labeled `Status: Venue override`, not `Published`, because no claim is made that the original contracts were officially renegotiated. Original and changed records are in `data/g6_venue_overrides.json`. The workbook's **Contract Exceptions** and **Assumptions** tabs also document this policy.

No games have been added or removed. Matchups, seasons, model dates, weeks, and unique game IDs are unchanged. The model still contains **2,210 games** across 2027–2031.

## App behavior

1. For a P4 school's G6 matchup, show `HOME` and its own campus as the venue, with correct school logos. Show an obvious marker such as **Venue overridden** and access to original-source details for the seven affected published commitments.
2. Notre Dame–Navy is the only allowed G6 away/neutral exception; display the actual fixture venue rather than applying the generic home badge.
3. In the methodology, explain the G6 host policy, Notre Dame exception and historical-contract adjustments. In analytics, show **67/67 P4 G6 home games per year** and the audit exceptions.
4. During import and tests, run `node scripts/validate-g6-hosting.mjs`, and make `npm run data:prepare` and test/build fail if a P4–G6 away/neutral game reappears. Never silently reimport the older published venues and override the corrected fixtures.
5. Reconcile the workbook, app views, weekly games, team schedules, venue filters and CSV/ICS/print exports against the *new* JSON. When a game is `Venue override`, do not describe its venue as an official venue announcement.

**Definition of done:** 335 of 335 non-Notre-Dame P4–G6 matchups are on the P4 campus, 0 violations across five seasons, Notre Dame–Navy appears exactly once each year, and the seven published conflicting sites are transparently marked as modeled overrides.
