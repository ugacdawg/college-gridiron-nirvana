#!/usr/bin/env node
/** Download + map *actual source files* from Lou34964/FBS-Logo-Library to the scenario's 134 schools.
 * Node 20+, no third-party dependencies. Either use GitHub API, or --local=/path/to/repo.
 * Does not imply school/league authorization or a redistributable license.
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAssetInfo, matchTarget, checkMagic } from './logo-matcher.mjs';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const targets=JSON.parse(await readFile(path.join(project,'data/logo-targets.json'),'utf8'));
const opts=process.argv.slice(2);
const strict=opts.includes('--strict');
const localArg=opts.find(x=>x.startsWith('--local='));
const localRoot=localArg?path.resolve(localArg.slice(8)):null;
const reviewPath=path.join(project,'data/logo-overrides.json');
let overrides={teams:{},conferences:{}};
try {overrides=JSON.parse(await readFile(reviewPath,'utf8'));} catch (e) {if(e.code!=='ENOENT') throw e;}
const owner='Lou34964',repo='FBS-Logo-Library',branch='main';
const localPath=path.join(project,'public/logos');
const manifestPath=path.join(project,'src/data/generated/logo-manifest.json');
const reportPath=path.join(project,'data/logo-coverage-report.json');
const headers={'User-Agent':'CollegeGridironNirvana-logo-setup','Accept':'application/vnd.github+json'};

async function treeOnDisk(folder,relative='') {
  const entries=[];
  for(const dir of await readdir(folder,{withFileTypes:true})) {
    if(dir.name.startsWith('.')) continue;
    const rel=relative?relative+'/'+dir.name:dir.name;
    if(dir.isDirectory()) entries.push(...await treeOnDisk(path.join(folder,dir.name),rel));
    if(dir.isFile()) entries.push({path:rel,fullPath:path.join(folder,dir.name)});
  }
  return entries;
}
async function treeFromGitHub() {
  const endpoint=`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res=await fetch(endpoint,{headers,signal:AbortSignal.timeout(30000)});
  if(!res.ok) throw new Error(`GitHub tree listing returned HTTP ${res.status}; try --local=/path/to/cloned/repo`);
  const body=await res.json();
  if(body.truncated) throw new Error('GitHub tree is truncated; clone repository and use --local');
  return body.tree.filter(x=>x.type==='blob').map(x=>({path:x.path}));
}
let fileList=localRoot?await treeOnDisk(localRoot):await treeFromGitHub();
// Only use the "CFB Logos" library directory, preventing README images and other unrelated files.
fileList=fileList.filter(f=>f.path.replaceAll('\\','/').split('/').some(p=>p.toLowerCase()==='cfb logos') ||
   (localRoot && path.basename(localRoot).toLowerCase()==='cfb logos'));
const infos=fileList.map(f=>{const i=listAssetInfo(f.path);return i?{...i,...f}:null}).filter(Boolean);
if(!infos.length) throw new Error('No usable files found under "CFB Logos". Inspect source repo layout.');
await mkdir(localPath,{recursive:true});
await mkdir(path.dirname(manifestPath),{recursive:true});

async function downloadAsset(asset) {
  if(asset.fullPath) return readFile(asset.fullPath);
  const enc=asset.path.split('/').map(encodeURIComponent).join('/');
  const url=`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${enc}`;
  const response=await fetch(url,{headers:{'User-Agent':'CollegeGridironNirvana-logo-setup'},signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

let report={source:targets.source.repository,generatedAt:new Date().toISOString(),scannedAssets:infos.length,
  targetTeams:targets.teams.length,targetConferences:targets.conferences.length,
  teams:{matched:[],missing:[],ambiguous:[],errors:[]},conferences:{matched:[],missing:[],ambiguous:[],errors:[]}};
const out={source:targets.source.repository,generatedAt:report.generatedAt,teams:{},conferences:{}};
const used=new Map();
async function processKind(kind,items,all) {
 for(const item of items) {
  const override=(overrides[kind]??{})[item.name];
  let resolution;
  if(override && override.startsWith('file:')) {
    // User-supplied local image (for schools the library does not carry), path relative to project root.
    const rel=override.slice(5);
    resolution={status:'matched',asset:{path:override,fullPath:path.join(project,rel),extension:path.extname(rel).toLowerCase()},score:999,candidates:[]};
  } else if(override) {
    const asset=infos.find(x=>x.path===override);
    resolution=asset?{status:'matched',asset,score:999,candidates:[]}:{status:'missing',candidates:[],hint:`Override path absent: ${override}`};
  } else resolution=matchTarget(item,infos,all,kind==='teams'?'team':'conference');
  if(resolution.status!=='matched') {
    report[kind][resolution.status].push({name:item.name,...resolution}); continue;
  }
  const asset=resolution.asset;
  // Never assign one image to two different schools without explicit manual permission.
  if(kind==='teams' && used.has(asset.path)) {
    report[kind].ambiguous.push({name:item.name,hint:`Same file proposed for ${used.get(asset.path)}`,candidates:resolution.candidates});continue;
  }
  try {
    const bytes=await downloadAsset(asset);
    if(bytes.length<100 || !checkMagic(asset.extension,bytes)) throw new Error('Image integrity or SVG safety check failed');
    const destination=`${item.slug}${asset.extension}`;
    await writeFile(path.join(localPath,destination),bytes);
    out[kind][item.name]={src:'/logos/'+destination,slug:item.slug,sourcePath:asset.path};
    report[kind].matched.push({name:item.name,sourcePath:asset.path});
    if(kind==='teams') used.set(asset.path,item.name);
  } catch(e) {report[kind].errors.push({name:item.name,error:String(e.message??e),sourcePath:asset.path});}
 }
}
await processKind('teams',targets.teams,targets.teams);
await processKind('conferences',targets.conferences,targets.conferences);
await writeFile(manifestPath,JSON.stringify(out,null,2)+'\n');
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
for(const kind of ['teams','conferences']) {
 const r=report[kind]; console.log(kind+': '+r.matched.length+' matched; '+r.missing.length+' missing; '+r.ambiguous.length+' ambiguous; '+r.errors.length+' errors');
}
console.log('Manifest:',manifestPath,'\nReview report:',reportPath);
if(strict) {
  const essentialConfs=new Set(['SEC','Big Ten','Big 12','ACC']);
  const missingEssential=targets.conferences.filter(t=>essentialConfs.has(t.name) && !out.conferences[t.name]);
  if(report.teams.matched.length!==targets.teams.length || missingEssential.length) {
    console.error('Strict logo coverage FAILED: school coverage or required four P4 conference marks incomplete.', missingEssential.map(x=>x.name));
    process.exitCode=1;
  }
}
