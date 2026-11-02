import assert from 'node:assert/strict';
import test from 'node:test';
import {listAssetInfo,matchTarget,scoreCandidate} from './logo-matcher.mjs';
const ts=[{name:'Georgia',aliases:['Georgia','UGA','Georgia Bulldogs']},{name:'Georgia Tech',aliases:['Georgia Tech']},{name:'Georgia State',aliases:['Georgia State']},{name:'Miami',aliases:['Miami','Miami Florida','Miami Hurricanes']},{name:'Miami (OH)',aliases:['Miami (OH)','Miami Ohio','Miami Redhawks']},{name:'USC',aliases:['USC','Southern California']},{name:'South Carolina',aliases:['South Carolina']},{name:'Texas',aliases:['Texas','Texas Longhorns']},{name:'Texas State',aliases:['Texas State']},{name:'NC State',aliases:['NC State','North Carolina State']},{name:'North Carolina',aliases:['North Carolina','UNC']}];
const assets=['CFB Logos/Teams/Georgia Bulldogs.png','CFB Logos/Teams/Georgia Tech.png','CFB Logos/Teams/Georgia State.png','CFB Logos/Teams/Miami Hurricanes.png','CFB Logos/Teams/Miami Ohio Redhawks.png','CFB Logos/Teams/USC.png','CFB Logos/Teams/South Carolina.png','CFB Logos/Teams/Texas.png','CFB Logos/Teams/Texas State.png','CFB Logos/Teams/North Carolina.png','CFB Logos/Teams/NC State.png'];
const info=assets.map(listAssetInfo);
test('Exact matching avoids confusing schools with similar names',()=>{
 for(let i=0;i<ts.length;i++) {const m=matchTarget(ts[i],info,ts,'team');assert.equal(m.status,'matched',ts[i].name);assert.ok(m.asset.path.toLowerCase().includes(ts[i].name==='Miami (OH)'?'miami ohio':ts[i].name==='Miami'?'miami hurricanes':ts[i].name.toLowerCase()),ts[i].name+': '+m.asset.path);}
});
test('Conference images do not match a school',()=>{
 const c=listAssetInfo('CFB Logos/Conference Logos/Georgia.png');
 assert.equal(scoreCandidate(ts[0],c,ts,'team'),-Infinity);
});
test('Unresolvable names do not get incorrect guesses',()=>{
 const names=[{name:'Alabama',aliases:['Alabama']}];
 assert.equal(matchTarget(names[0],info,names).status,'missing');
});
