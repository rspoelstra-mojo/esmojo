export const validArtistId=value=>typeof value==='string'&&/^a_[a-f0-9]{64}$/.test(value);
export function normalizeArtistName(value){
 if(typeof value!=='string'||!value.trim()||value.length>160||/[\x00-\x1f\x7f]/.test(value))throw Error('ARTIST_CATALOGUE');
 return value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('nl-NL');
}
export const compareArtistNames=(a,b)=>a.name.localeCompare(b.name,'nl',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id);
// Caller supplies the platform's SHA-256 implementation; no aliases/fuzzy matches.
export function buildArtistCatalogue(names,hash){
 if(!Array.isArray(names)||names.length>100000)throw Error('ARTIST_CATALOGUE');
 const rows=new Map();for(const name of names){const identity=normalizeArtistName(name),id='a_'+hash(identity);if(!validArtistId(id))throw Error('ARTIST_CATALOGUE');if(!rows.has(id))rows.set(id,{id,name:name.normalize('NFKC').trim().replace(/\s+/g,' ')});}
 return [...rows.values()].sort(compareArtistNames);
}
export function cleanArtistMenu(input){
 if(!Array.isArray(input)||input.length>10000)throw Error('ARTIST_CATALOGUE');const seen=new Set();
 return input.map(row=>{if(!row||!validArtistId(row.id)||seen.has(row.id))throw Error('ARTIST_CATALOGUE');normalizeArtistName(row.name);seen.add(row.id);return{id:row.id,name:row.name};}).sort(compareArtistNames);
}
export function artistTopFive(artists,counts){
 const values=new Map();if(!Array.isArray(counts)||counts.length>10000)throw Error('ARTIST_VIEWS');
 for(const row of counts){if(!row||!validArtistId(row.id)||values.has(row.id)||!Number.isSafeInteger(row.views)||row.views<1)throw Error('ARTIST_VIEWS');values.set(row.id,row.views);}
 return artists.filter(row=>values.has(row.id)).map(row=>({...row,views:values.get(row.id)})).sort((a,b)=>b.views-a.views||compareArtistNames(a,b)).slice(0,5);
}
