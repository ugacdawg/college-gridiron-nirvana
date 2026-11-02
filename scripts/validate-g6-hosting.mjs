// Node.js 18+. Standalone venue-policy test for College Gridiron Nirvana.
// Run from project root: node scripts/validate-g6-hosting.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const games = JSON.parse(fs.readFileSync(path.join(root, 'data/cfb_full_games.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(root, 'data/logo-targets.json'), 'utf8')).teams;
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'data/g6_venue_overrides.json'), 'utf8'));
const p4 = new Set(teams.filter(t => t.pool === 'Power' && t.name !== 'Notre Dame').map(t => t.name));
const failures = [];
const g6 = games.filter(g => g.Type === 'G6');
const nonNotreDame = g6.filter(g => g.Home !== 'Notre Dame' && g.Away !== 'Notre Dame');
const notreDame = g6.filter(g => g.Home === 'Notre Dame' || g.Away === 'Notre Dame');
for (const g of nonNotreDame) {
 const ok = p4.has(g.Home) && !p4.has(g.Away) && g['Site type'] === 'Campus' && g.Venue === `${g.Home} campus`;
 if (!ok) failures.push(`${g['Game ID']}: non-ND G6 fixture violates Power Four home-campus rule`);
}
for (const year of [2027,2028,2029,2030,2031]) {
 const y = nonNotreDame.filter(g => g.Year === year);
 if (y.length !== 67) failures.push(`${year}: expected 67 P4-campus G6 games, got ${y.length}`);
 const n = notreDame.filter(g => g.Year === year);
 if (n.length !== 1 || new Set([n[0]?.Home,n[0]?.Away]).size !== 2 || ![n[0]?.Home,n[0]?.Away].includes('Navy')) failures.push(`${year}: Notre Dame–Navy must be the only Notre Dame G6 matchup`);
}
if (nonNotreDame.length !== 335 || notreDame.length !== 5) failures.push('Five-year G6 game counts are not 335 + 5');
if (overrides.length !== 68) failures.push(`Expected 68 location overrides; found ${overrides.length}`);
const published = overrides.filter(r => r.Prior.Status === 'Published');
if (published.length !== 7) failures.push(`Expected 7 originally published site overrides; found ${published.length}`);
const gameById = new Map(games.map(g => [g['Game ID'],g]));
for (const r of overrides) {
 const g = gameById.get(r['Game ID']);
 if (!g || ['Home','Away','Venue','Site type','Status'].some(k => g[k] !== r.New[k])) failures.push(`${r['Game ID']}: override audit does not match updated fixture`);
}
if (failures.length) {console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${nonNotreDame.length}/335 Power Four G6 games at P4 campuses; ${notreDame.length}/5 Notre Dame–Navy exceptions; 68 venue corrections audited (7 published conflicts).`);
