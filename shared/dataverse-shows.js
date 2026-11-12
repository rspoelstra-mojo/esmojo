import {dataversePilot} from './dataverse-pilot.js';
// Logical source namespace for Drive imports; never a SharePoint library.
export const DRIVE_RESEARCH_LIBRARY='8d4b3512-7f82-4d51-a98a-a0c67d629184';
export const RESEARCH_LIBRARY=dataversePilot.libraryId;
export const researchSlug=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function parseResearchKey(value){
 if(typeof value!=='string')return null;const key=value.trim();
 if(key.length>200||/[\x00-\x1f/\\<>]/.test(key))return null;
 const m=/^(.+)_([^_]+)_(\d{4})(\d{2})(\d{2})$/.exec(key);if(!m)return null;
 const date=`${m[3]}-${m[4]}-${m[5]}`;if(!Number.isFinite(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return null;
 return{sourceKey:key,artistToken:m[1],venueToken:m[2],date};
}
export function researchKeyForId(id){
 if(typeof id!=='string')return null;
 if(id===dataversePilot.concertId)return dataversePilot.sourceKey;
 if(id.startsWith('dataverse_'))return parseResearchKey(id.slice(10))?.sourceKey||null;
 const m=/^(.+)_([^_]+)_(\d{2})(\d{2})(\d{4})$/.exec(id);if(!m)return null;
 return parseResearchKey(`${researchSlug(m[1])}_${researchSlug(m[2])}_${m[5]}${m[4]}${m[3]}`)?.sourceKey||null;
}
export const isDataverseShowId=id=>typeof id==='string'&&(id===dataversePilot.concertId||id.startsWith('dataverse_')&&Boolean(researchKeyForId(id)));
export const researchKeyForConcert=row=>parseResearchKey(`${researchSlug(row.artist||row.name)}_${researchSlug(row.venue)}_${row.date?.replaceAll('-','')}`)?.sourceKey||null;
