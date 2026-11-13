import {mapShow} from '../show-migration-map.js';
import {recordKey,digest} from '../show-migration-writer.js';
import {normalizeArtistName} from '../../shared/artist-catalogue.js';
import {parseTicketSales,validSaleCount} from '../../shared/ticket-data.js';
import {operationalComplete} from '../../src/lib/show-planning.js';
import {executeShowRules} from './rules.js';
// Other modules retain their incident/report sources, but Shows preparation
// always comes from the native authority; an unavailable native read fails closed.
export function createRelatedShows({state,catalogue,now=()=>new Date()}={}){
 return async(operation,payload,legacy)=>{
  if(operation.startsWith('biography-')){
   const data=await catalogue.all(),ids=new Set(data.artists.map(row=>row.esmojo_bronartiestid));
   if(operation==='biography-save')return ids.has(payload.series?.artistId)?catalogue.request(operation,payload):legacy();
   if(operation==='biography-initial-save')return ids.has(payload.artistId)?catalogue.request(operation,payload):legacy();
   if(operation==='biography-initial-batch'){
    if(!Array.isArray(payload.entries)||payload.entries.length<1||payload.entries.length>25)throw Error('VALIDATION');
    const own=payload.entries.filter(row=>ids.has(row.artistId)),other=payload.entries.filter(row=>!ids.has(row.artistId));let saved=0,unchanged=0;
    for(const [rows,run]of [[own,p=>catalogue.request(operation,p)],[other,legacy]])if(rows.length){const result=await run({entries:rows});saved+=result.saved;unchanged+=result.unchanged;}return{saved,unchanged};
   }
   const old=await legacy(),native=await catalogue.request(operation,payload);
   if(operation==='biography-candidates')return{concerts:[...old.concerts,...native.concerts],saved:{...old.saved,...native.saved}};
   if(operation==='biography-initial-list'){const rows=new Map((old.artists||[]).filter(row=>!ids.has(row.id)).map(row=>[row.id,row]));for(const row of native.artists)rows.set(row.id,row);return{artists:[...rows.values()]};}
   throw Error('VALIDATION');
  }
  if(!['artist-catalogue','artist-profile','artist-show','incident-read'].includes(operation))return legacy();
  const data=await catalogue.all(),idFor=name=>'a_'+digest(normalizeArtistName(name)),matches=name=>payload.artistIds?.includes(idFor(name)),cache=new Map();
  const load=async id=>{if(!cache.has(id))cache.set(id,(async()=>{const loaded=await state.load(id);await state.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);return loaded;})());return cache.get(id);};
  let result;
  try{result=await legacy();}catch(error){if(error.message!=='NOT_FOUND'||!['artist-show','artist-profile'].includes(operation)||!data.rows.some(row=>matches(row.artist)))throw error;result=operation==='artist-show'?{show:{name:data.rows.find(row=>matches(row.artist)).artist,venue:payload.venue,date:payload.date,...(payload.performance?{performance:payload.performance}:{})},report:null,timetable:null,preparation:null}:{concerts:[],audience:{},photo:null,biography:null,latestDate:null};}
  if(operation==='artist-catalogue'){
   const artists=new Map((result.artists||[]).map(row=>[row.id,row]));for(const artist of data.artists)if(!artists.has(artist.esmojo_bronartiestid))artists.set(artist.esmojo_bronartiestid,{id:artist.esmojo_bronartiestid,name:artist.esmojo_naam});return{...result,artists:[...artists.values()]};
  }
  if(operation==='artist-profile'){
   const rows=data.rows.filter(row=>matches(row.artist)),groups=new Map((result.concerts||[]).map(row=>[row.venue+'|'+row.dates.join(','),row]));
   for(const primary of new Set(rows.map(row=>row.generalConcertId))){const group=rows.filter(row=>row.generalConcertId===primary),concert={venue:group[0].venue,dates:[...new Set(group.map(row=>row.date))].sort()};if(![...groups.values()].some(existing=>existing.venue===concert.venue&&concert.dates.every(date=>existing.dates.includes(date))))groups.set(primary,concert);}
   result.concerts=[...groups.values()].sort((a,b)=>b.dates.at(-1).localeCompare(a.dates.at(-1)));
   const artist=data.artists.find(row=>payload.artistIds.includes(row.esmojo_bronartiestid));if(artist?.esmojo_fotobronurl)result.photo=artist.esmojo_fotobronurl;if(artist?.esmojo_biografie)result.biography={text:artist.esmojo_biografie,sourceUrl:artist.esmojo_biografiebron||null,capturedAt:artist.esmojo_biografieopgehaaldop};
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(now()),latest=rows.filter(row=>row.date<=today).sort((a,b)=>b.date.localeCompare(a.date))[0];
   if(latest&&(!result.latestDate||latest.date>=result.latestDate)){
    const loaded=await load(latest.concertId),analyses=loaded.source.documents['showprofiel.json']?.analyses||{},same=result.profileConcertId===latest.generalConcertId,audience={};
    for(let number=1;number<=4;number++){const saved=analyses[number],summary=saved?.status==='completed'?saved.summary:null;audience[number]={...(same?result.audience?.[number]:{}),summary,storedAt:summary?saved.updatedAt:same?result.audience?.[number]?.storedAt||null:null};}
    Object.assign(result,{profileConcertId:latest.generalConcertId,latestDate:latest.date,audience});
   }return result;
  }
  if(operation==='artist-show'){
   const candidates=data.rows.filter(row=>matches(row.artist)&&row.date===payload.date&&row.venue===payload.venue);if(candidates.length>1)throw Error('CONFLICT');if(!candidates.length)return result;
   const loaded=await load(candidates[0].concertId),source=loaded.source,production=source.documents['productionele-risicos.json']||{},fields=JSON.parse(source.documents['bezoekersdata.json']?.workflow_json||'{"visitors":{"fields":{}}}').visitors.fields;
   const assigned=loaded.people.assignments.find(row=>row.concertId===candidates[0].concertId&&row.role==='event-safety-manager'),person=loaded.people.profiles.find(row=>row.id===assigned?.userId);
   result.preparation={concertId:source.concertId,hasProfile:Boolean(source.documents['showprofiel.json']||source.documents['productionele-risicos.json']),contacts:{productionManager:null,eventSafetyManager:person?[person.firstName,person.lastName].filter(Boolean).join(' '):null,tscProjectLead:null},tickets:{sales:fields.ticket_sales?.completed_at?fields.ticket_sales.content:null,origins:fields.visitor_origins?.completed_at?fields.visitor_origins.content:null,shows:source.shows},production:{entrance:null,barrierType:production.barrier?.barrierType||null,floor:production.floorPressure||null,choices:production.choices||{}},risks:executeShowRules(source,'risk-view',{concertId:candidates[0].concertId}).result};return result;
  }
  for(const item of result.rows||[]){const native=data.rows.find(row=>row.concertId===item.concertId);if(!native)continue;
   const loaded=await load(native.concertId),source=loaded.source,request={concertId:native.concertId},profile=executeShowRules(source,'profile-read',request).result,risks=executeShowRules(source,'risk-view',request).result,final=source.documents['analyseafronding.json']?.categories||{},ticket=JSON.parse(source.documents['bezoekersdata.json']?.workflow_json||'{"visitors":{"fields":{}}}').visitors.fields.ticket_sales,sales=ticket?.completed_at?ticket.content:null,selected=parseTicketSales(sales)?.filter(row=>row.date===item.date),soldTickets=selected?.length?selected.reduce((sum,row)=>sum+Number(row.count),0):validSaleCount(sales)&&source.shows.length===1?Number(sales):null;
   Object.assign(item,{soldTickets,visitorUnits:soldTickets===null?null:soldTickets*39,visitors:soldTickets===null?null:soldTickets*39/40,visitorBasis:'ticket-minus-2.5',visitorsFinal:Boolean(profile.finalization.categories.visitors.completedAt),artistFinal:Boolean(profile.finalization.categories.artist.completedAt),visitorsRating:final.visitors?.score||null,artistRating:final.artist?.score||null,operationalLevels:operationalComplete({risks})?risks.risks.map(risk=>risks.operational.assessments[risk.id].riskLevel):null});delete item.activeConcertId;
  }
  result.jobs=(result.rows||[]).filter(row=>row.visitors>0&&row.securityComplete&&row.medicalComplete&&row.sourceReady&&!row.kpis).map(row=>row.concertId);return result;
 };
}
