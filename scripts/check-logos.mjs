#!/usr/bin/env node
/** npm run logos:check — verify the synced logo manifest against data/logo-targets.json.
 *  Fails on: missing/corrupt files, one image shared by two schools, any missing P4 conference mark,
 *  or (with --strict) any school without a verified logo. Schools the source library does not carry
 *  are listed so they can be reviewed rather than silently guessed. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMagic } from './logo-matcher.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const targets = JSON.parse(readFileSync(path.join(root, 'data/logo-targets.json'), 'utf8'));
const manifestPath = path.join(root, 'src/data/generated/logo-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];
const missingTeams = [];

const seen = new Map();
for (const kind of ['teams', 'conferences']) {
  for (const [name, e] of Object.entries(manifest[kind] ?? {})) {
    const file = path.join(root, 'public', e.src);
    if (!existsSync(file)) { errors.push(`${kind} ${name}: file missing (${e.src}) — run npm run logos:sync`); continue; }
    if (!checkMagic(path.extname(file).toLowerCase(), readFileSync(file))) errors.push(`${kind} ${name}: not a valid image`);
    if (kind === 'teams') {
      if (seen.has(e.sourcePath)) errors.push(`${name} and ${seen.get(e.sourcePath)} share ${e.sourcePath}`);
      seen.set(e.sourcePath, name);
    }
  }
}
for (const t of targets.teams) if (!manifest.teams?.[t.name]) missingTeams.push(t.name);
for (const c of ['SEC', 'Big Ten', 'Big 12', 'ACC']) if (!manifest.conferences?.[c]) errors.push(`P4 conference logo missing: ${c}`);

const teamCount = targets.teams.length - missingTeams.length;
const confCount = targets.conferences.filter(c => manifest.conferences?.[c.name]).length;
console.log(`Schools: ${teamCount}/${targets.teams.length} verified · P4 conferences: ${['SEC','Big Ten','Big 12','ACC'].filter(c => manifest.conferences?.[c]).length}/4 · all conferences: ${confCount}/${targets.conferences.length}`);
if (missingTeams.length) console.warn(`No source image in the library for: ${missingTeams.join(', ')} (shown as a text abbreviation). Add an exact path to data/logo-overrides.json if one becomes available.`);
if (errors.length) console.error(errors.join('\n'));
if (errors.length || (strict && missingTeams.length)) process.exitCode = 1;
