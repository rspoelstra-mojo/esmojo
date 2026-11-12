import {MOJO_VENUES} from './mojo-venues.js';
import {dataversePilot} from '../shared/dataverse-pilot.js';
import {parseResearchKey,researchKeyForId,researchKeyForConcert,researchSlug,isDataverseShowId} from '../shared/dataverse-shows.js';

export function researchShow(key,concerts=[]){
 const parts=parseResearchKey(key);if(!parts)return null;
 const matches=concerts.filter(row=>researchKeyForConcert(row)===parts.sourceKey);
 const identities=new Map(matches.map(row=>[JSON.stringify([row.artist,row.venue,row.city,row.date]),row]));
 if(identities.size>1)throw Error('DATAVERSE_AMBIGUOUS');
 const official=[...identities.values()][0];
 const venue=MOJO_VENUES.find(v=>[v.name,v.id,...v.aliases].some(alias=>researchSlug(alias)===researchSlug(parts.venueToken)));
 // Een compacte bronnaam niet zelf in woorden/punctuatie opdelen of AI-proza als identiteit gebruiken.
 const name=official?.artist||(parts.sourceKey===dataversePilot.sourceKey?dataversePilot.artist:parts.artistToken[0].toUpperCase()+parts.artistToken.slice(1));
 return{key:parts.sourceKey===dataversePilot.sourceKey?dataversePilot.concertId:'dataverse_'+parts.sourceKey,name,dates:[parts.date],venue:official?.venue||venue?.name||parts.venueToken,city:official?.city||venue?.city||'',sourceKey:parts.sourceKey,...(official?.sourceUrl?{sourceUrl:official.sourceUrl}:{})};
}

export function createDataverseShows({shows,research,now=Date.now}={}){
 let cached=null,pending=null;const initialized=new Map();
 async function catalogue(force=false){
  if(!research.configured?.())return[];
  if(!force&&cached&&cached.until>now())return cached.rows;
  if(pending)return pending;
  pending=(async()=>{
   const keys=await research.sourceKeys(),signature=[...keys].sort().join('\n');if(!keys.length){cached={rows:[],signature,until:now()+15000,identitiesUntil:now()+900000};return[];}
   if(cached?.signature===signature&&cached.identitiesUntil>now()){cached.until=now()+15000;return cached.rows;}
   const identities={concerts:[]};
   for(let offset=0;offset<keys.length;offset+=500){const batch=await shows('research-identities',{sourceKeys:keys.slice(offset,offset+500)}).catch(()=>({concerts:[]}));identities.concerts.push(...(batch.concerts||[]));}
   const rows=keys.map(key=>researchShow(key,identities.concerts||[])).filter(Boolean);
   cached={rows,signature,until:now()+15000,identitiesUntil:now()+900000};return rows;
  })().finally(()=>{pending=null;});return pending;
 }
 async function resolve(id){
  const key=researchKeyForId(id);if(!key||!research.configured?.())return null;
  let row=(await catalogue()).find(row=>row.sourceKey===key);
  if(!row&&isDataverseShowId(id))row=(await catalogue(true)).find(row=>row.sourceKey===key);
  if(!row&&isDataverseShowId(id))throw Error('NOT_FOUND');return row||null;
 }
 const wrapped=async(operation,payload={})=>{
  if(operation==='list'){
   const [legacy,imported]=await Promise.all([shows('list').catch(error=>{if(error.message==='FORBIDDEN'||!research.configured?.())throw error;return{concerts:[],checkedAt:null};}),catalogue(true)]);
   return{...legacy,dataverseShows:imported,checkedAt:legacy.checkedAt||(imported.length?new Date(now()).toISOString():null)};
  }
  if(!payload.concertId)return shows(operation,payload);
  const row=await resolve(payload.concertId);
  if(!row)return shows(operation,payload);
  if(operation==='home-metadata')return{show:row};
  let task=initialized.get(row.sourceKey);
  if(!task){
   task=shows('dataverse-ensure',{show:row}).catch(error=>{initialized.delete(row.sourceKey);throw error;});
   initialized.set(row.sourceKey,task);if(initialized.size>1000)initialized.delete(initialized.keys().next().value);
  }
  const target=await task;
  const result=await shows(operation,{...payload,concertId:target.concertId});
  return operation==='report-reserve'&&result.state==='reserved'?{...result,selectedConcertId:payload.concertId}:result;
 };
 wrapped.activeStorage=shows.activeStorage;return wrapped;
}
