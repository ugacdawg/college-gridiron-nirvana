#!/usr/bin/env node
/** Release check: the retired working title must not appear in UI, metadata, docs or tests. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RETIRED = new RegExp(['Gridiron', 'Atlas'].join('[\\s_-]*'), 'i');
const SKIP = new Set(['node_modules', '.next', '.git', 'test-results', 'playwright-report', 'logos', 'data', 'source']);
const EXT = /\.(tsx?|mjs|js|json|md|css|html|txt)$/;
const hits = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.test(name) && RETIRED.test(readFileSync(p, 'utf8'))) hits.push(path.relative(root, p));
  }
})(root);
if (hits.length) { console.error('Retired working title found in:\n  ' + hits.join('\n  ')); process.exitCode = 1; }
else console.log('Branding check: PASS — only "College Gridiron Nirvana" is used.');
