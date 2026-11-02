import path from 'node:path';

const EXT = new Set(['.png','.webp','.svg','.jpg','.jpeg','.gif']);
const STOP = new Set(['logo','logos','primary','secondary','alternate','alt','team','teams','conference','conferences','university','college','icon','mark','brand','color','colour','full','black','white','dark','light','transparent','large','small','png','hd','fbs','football','ncaa','horizontal','vertical','main','crest']);

export function tokenize(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ')
    .replace(/[’'\.]/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
}
export function key(value) { return tokenize(value).filter(t=>!STOP.has(t)).join(' '); }

export function listAssetInfo(filename) {
  const ext=path.extname(filename).toLowerCase();
  if(!EXT.has(ext)) return null;
  const pp=filename.replaceAll('\\','/').split('/');
  const base=pp.at(-1).slice(0,-ext.length);
  const parent=pp.length>=2?pp.at(-2):'';
  const parts=pp.slice(0,-1).join(' ').toLowerCase();
  return {path:filename,extension:ext,basename:base,parent,baseKey:key(base),parentKey:key(parent),conferenceFolder:/\b(conferences?|leagues?)\b/i.test(parts)};
}

function variants(target) {
  return [...new Set(target.aliases.map(key).filter(Boolean))];
}
function isOtherTeamNameStarting(candidateKey, aliasKey, current, all) {
  // Reject weak "Georgia"→"Georgia Tech" / "Miami"→"Miami Ohio" etc.
  for (const t of all) {
    if(t.name===current.name) continue;
    for(const k of variants(t)) {
      if(k.length>aliasKey.length && (candidateKey===k || candidateKey.startsWith(k+' '))) return true;
    }
  }
  return false;
}
function preferredFormat(ext) {
  return {'.png':9,'.webp':8,'.svg':7,'.jpg':5,'.jpeg':5,'.gif':1}[ext]??0;
}
export function scoreCandidate(target, info, allTargets, kind='team') {
  if(!info) return -Infinity;
  const aliases=variants(target);
  // Ensure a file from a conference-logo folder can't masquerade as a team.
  if(kind==='team' && info.conferenceFolder) return -Infinity;
  const entries=[{v:info.baseKey,source:'base'},{v:info.parentKey,source:'parent'}].filter(x=>x.v);
  let best=-Infinity;
  for (const a of aliases) for(const e of entries) {
    const v=e.v;
    if(v===a) best=Math.max(best,e.source==='base'?130:113);
    else if (v.startsWith(a+' ') && a.length>=4) {
      if(kind==='team' && isOtherTeamNameStarting(v,a,target,allTargets)) continue;
      best=Math.max(best,e.source==='base'?75:62);
    }
  }
  if(!Number.isFinite(best)) return best;
  if(kind==='conference' && info.conferenceFolder) best+=12;
  if(kind==='conference' && !info.conferenceFolder) best-=3;
  // Prefer readable, transparent original logos over thumbnails/alternate treatments.
  const words=tokenize(info.basename);
  if(words.includes('thumbnail') || words.includes('thumb')) best-=12;
  if(words.includes('white') || words.includes('dark') || words.includes('mono')) best-=8;
  if(words.includes('primary')) best+=2;
  best+=preferredFormat(info.extension);
  return best;
}

export function matchTarget(target, infos, targets, kind='team') {
  const scores=infos.map(a=>({info:a,score:scoreCandidate(target,a,targets,kind)}))
    .filter(x=>x.score>=62).sort((a,b)=>b.score-a.score || a.info.path.localeCompare(b.info.path));
  if(!scores.length) return {status:'missing',candidates:[]};
  const top=scores[0];
  const equivalent=scores.filter(x=>x.score===top.score);
  // Two equally plausible source files need manual review; do not randomly choose.
  if(equivalent.length>1) return {status:'ambiguous',candidates:equivalent.slice(0,8).map(x=>({path:x.info.path,score:x.score}))};
  return {status:'matched',asset:top.info,score:top.score,candidates:scores.slice(0,5).map(x=>({path:x.info.path,score:x.score}))};
}

export function checkMagic(extension, buffer) {
  if(extension==='.png') return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(extension==='.jpg' || extension==='.jpeg') return buffer[0]===255 && buffer[1]===216;
  if(extension==='.webp') return buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP';
  if(extension==='.gif') return buffer.toString('ascii',0,3)==='GIF';
  if(extension==='.svg') {
    const s=buffer.toString('utf8');
    return /<svg\b/i.test(s) && !/<script\b|<foreignObject\b|\son\w+\s*=|javascript\s*:/i.test(s);
  }
  return false;
}
