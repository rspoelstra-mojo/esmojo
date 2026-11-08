import {cleanArtistMenu,normalizeArtistName,validArtistId,compareArtistNames} from './artist-catalogue.js';
const tourText=value=>/\b(?:world[\s-]*tour|tour(?:nee)?|wereldtournee)(?=\b|\d)/iu.test(value);
const liveYearText=value=>/^live\s+['’‘]?(?:\d{4}|\d{2})$/iu.test(value);
const performanceText=value=>tourText(value)||liveYearText(value)||/^(?:live|dj[ -]?set|live[ -]?set|solo show|extra show|sold out|uitverkocht)$/iu.test(value.trim());
const confirmedName=value=>/^bouke(?:\s*&\s*the\s+elvismatters(?:\s+band)?|\s+with\s+symphonic\s+orchestra)?$/iu.test(value)?'Bouke':/^(?:Yousuke Yukimatsu|¥ØU\$UK€\s+¥UK1MAT\$U(?:\s*\(Yousuke Yukimatsu\))?)$/iu.test(value)?'Yousuke Yukimatsu':/^new\s+wave(?:\s*(?:[-–—]\s*)?all[\s-]+stars)?$/iu.test(value)?'New Wave':/^u2$/iu.test(value)?'U2':/^oasis$/iu.test(value)?'Oasis':/^numidia(?:\s+[-–—]\s+muziekfeest van het jaar)?$/iu.test(value)?'Numidia':null;
function undecorate(value){const stripped=value.replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D★☆✦✧]+|[\s\p{Extended_Pictographic}\uFE0F\u200D★☆✦✧]+$/gu,'').trim();return stripped||value;}
export function readableArtistName(value){
 normalizeArtistName(value);let name=value.normalize('NFKC').trim().replace(/\s+/g,' ').replace(/^#{1,6}\s+/u,'');
 name=undecorate(name).replace(/^#{1,6}\s+/u,'');
 // Explicit, user-confirmed readable names. Never transliterate arbitrary brands.
 if(confirmedName(name))return confirmedName(name);
 for(let n=0;n<32;n++){
  const previous=name,parenthetical=/^(.+?)\s*\(([^()]+)\)$/u.exec(name);
  if(parenthetical){const [,primary,alternative]=parenthetical;if(performanceText(alternative))name=primary.trim();else{
   const symbols=[...primary].filter(char=>/[\p{Sc}\p{So}]/u.test(char)).length;
   if(symbols>=3&&symbols/primary.replace(/\s/g,'').length>.2&&/^[\p{L}\p{M}][\p{L}\p{M}.'’ -]+$/u.test(alternative)&&alternative.trim().split(/\s+/).length>=2)name=alternative.trim();
  }}
  const suffix=/^(.+?)(?:\s*:\s*|\s+[-–—]\s+)(.+)$/u.exec(name);
  if(suffix&&performanceText(suffix[2]))name=suffix[1].trim();
  // A terminal LIVE + year is an event label; bare 'Live' may be an artist name.
  name=name.replace(/\s+live\s+['’‘]?(?:\d{4}|\d{2})$/iu,'').trim();
  name=undecorate(name).replace(/^#{1,6}\s+/u,'');if(confirmedName(name))return confirmedName(name);if(name===previous)break;
 }
 normalizeArtistName(name);return name;
}
// Cached IDs stay valid until the authoritative directory supplies canonical IDs.
export function cleanReadableArtistMenu(input){
 const names=new Set(),rows=[];for(const row of cleanArtistMenu(input)){const name=readableArtistName(row.name),key=normalizeArtistName(name);if(names.has(key))continue;names.add(key);rows.push({id:row.id,name});}return rows.sort(compareArtistNames);
}
// Raw source names/IDs are unchanged. Their derived aliases retain old links and
// let old/new Redis-event IDs contribute to the same readable artist.
export function createReadableArtistDirectory(input,hash){
 const artists=new Map(),aliases=new Map(),legacySlugs=new Map();
 for(const row of cleanArtistMenu(input)){const name=readableArtistName(row.name),id='a_'+hash(normalizeArtistName(name));if(!validArtistId(id))throw Error('ARTIST_CATALOGUE');if(!artists.has(id))artists.set(id,{id,name});if(row.id!==id)aliases.set(row.id,id);
  const legacy=normalizeArtistSlug(row.name).replace(/[^\p{L}\p{N}]/gu,'');if(validArtistSlug(legacy)){if(!legacySlugs.has(legacy))legacySlugs.set(legacy,new Set());legacySlugs.get(legacy).add(id);}
 }
 for(const [id,target]of aliases)if(artists.has(id)&&id!==target)throw Error('ARTIST_CATALOGUE');
 const result={artists:[...artists.values()].sort(compareArtistNames),aliases,legacySlugs};result.routes=artistRouteMap(result.artists);result.slugs=new Map([...result.routes].map(([id,slug])=>[slug,id]));if(result.slugs.size!==result.artists.length)throw Error('ARTIST_CATALOGUE');return result;
}
export function resolveReadableArtist(directory,reference){
 let canonical;
 if(validArtistId(reference))canonical=directory.aliases.get(reference)||reference;
 else if(validArtistSlug(reference)){
  const slug=normalizeArtistSlug(reference);canonical=directory.slugs.get(slug);
  // Keep unambiguous pre-cleanup name URLs; current canonical routes take priority.
  if(!canonical){const previous=directory.legacySlugs?.get(slug);if(previous?.size===1)canonical=[...previous][0];}
  if(!canonical){const legacy=/^(.+)-([a-f0-9]{8,64})$/.exec(slug);if(legacy){const targets=new Set();for(const [id,target]of [...directory.aliases,...directory.artists.map(row=>[row.id,row.id])]){const row=directory.artists.find(row=>row.id===target);if(id.slice(2).startsWith(legacy[2])&&(slugBase(row.name)||'artiest')===legacy[1])targets.add(target);}if(targets.size===1)canonical=[...targets][0];}}
 }
 return directory.artists.find(row=>row.id===canonical)||null;
}
export function foldArtistViews(directory,counts){
 if(!Array.isArray(counts)||counts.length>10000)throw Error('ARTIST_VIEWS');const seen=new Set(),known=new Set(directory.artists.map(row=>row.id)),values=new Map();
 for(const row of counts){if(!row||!validArtistId(row.id)||seen.has(row.id)||!Number.isSafeInteger(row.views)||row.views<1)throw Error('ARTIST_VIEWS');seen.add(row.id);const id=directory.aliases.get(row.id)||row.id;if(!known.has(id))continue;const total=(values.get(id)||0)+row.views;if(!Number.isSafeInteger(total))throw Error('ARTIST_VIEWS');values.set(id,total);}
 return [...values].map(([id,views])=>({id,views}));
}
export const validArtistSlug=value=>typeof value==='string'&&value.length<=240&&/^[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:-[a-f0-9]{8,64})?$/iu.test(value);
export const validArtistReference=value=>validArtistId(value)||validArtistSlug(value);
export const normalizeArtistSlug=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('nl-NL');
const slugBase=name=>normalizeArtistSlug(readableArtistName(name)).replace(/[^\p{L}\p{N}]/gu,'');
export function artistRouteMap(input){
 const rows=new Map(),groups=new Map(),routes=new Map();
 for(const row of input){if(!row||!validArtistId(row.id))throw Error('ARTIST_CATALOGUE');const name=readableArtistName(row.name),identity=normalizeArtistName(name),base=slugBase(name),prior=rows.get(row.id);if(prior&&prior.identity!==identity)throw Error('ARTIST_CATALOGUE');rows.set(row.id,{id:row.id,name,identity,base});}
 for(const row of rows.values()){const key=row.base||'artiest';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 for(const [base,group]of groups){const distinct=new Set(group.map(row=>row.identity)).size;
  for(const row of group){if(row.base&&(distinct===1||['U2','New Wave','Yousuke Yukimatsu'].includes(row.name))){routes.set(row.id,base);continue;}
   let length=8;while(length<64&&group.some(other=>other.identity!==row.identity&&other.id.slice(2,2+length)===row.id.slice(2,2+length)))length+=4;
   routes.set(row.id,base+'-'+row.id.slice(2,2+length));
  }
 }
 return routes;
}
