import {createNativeShowState} from '../dataverse-shows/state.js';
import {createNativeCatalogue} from '../dataverse-shows/catalogue.js';
import {assertNativeAuthority} from '../dataverse-shows/authority.js';
import {mapShow} from '../show-migration-map.js';
import {artistPreparation} from '../artist-preparation.js';
import {reportConcertMatch,reportFilenameShow,reportVenueName} from '../../shared/report-filename.js';
import {MOJO_VENUES} from '../mojo-venues.js';
import {timetableClock} from '../../shared/show-timetable.js';
// Shows preparation/accounts retain their established native authority. Historical
// report-only context is read from typed Reports versions, never a Drive mirror.
export function createNativeReportDependencies({env=process.env,reader,intake=null,state=createNativeShowState({env}),catalogue=createNativeCatalogue({state}),now=()=>new Date()}={}){
 async function choices(){await assertNativeAuthority({env,repository:state.repo});const data=await catalogue.all(),existing=await reader.current(),byKey=new Map(existing.map(row=>[row.show.key,row.show]));for(const row of data.rows.filter(row=>row.date<timetableClock(now()).date||row.active))byKey.set(row.concertId,{...byKey.get(row.concertId),key:row.concertId,name:row.artist,venue:row.venue,date:row.date,city:row.city,sourceUrl:row.sourceUrl||null,origin:byKey.get(row.concertId)?.origin||'catalogue',...['middag','avond'].includes(row.native?.esmojo_uitvoeringscode)?{performance:row.native.esmojo_uitvoeringscode}:{},nativeShow:true,active:row.active,seriesId:row.generalConcertId});return[...byKey.values()];}
 async function resolve(file,processing){
  if(file.show)return file.show;const all=await choices();if(processing?.showKey){const exact=all.filter(show=>show.key===processing.showKey);if(exact.length!==1)throw Error('REPORT_CATALOG');return exact[0];}
  const day=timetableClock(now()).date,matched=reportConcertMatch(file.name,all,MOJO_VENUES,day);if(matched.state==='matched')return matched.show;if(matched.state==='ambiguous')throw Error('REPORT_CATALOG');const parsed=reportFilenameShow(file.name,MOJO_VENUES,day,all.map(show=>show.name));if(!parsed)throw Error('REPORT_CATALOG');return parsed;
 }
 async function context(show){
  await assertNativeAuthority({env,repository:state.repo});
  try{
   if(show.nativeShow!==true&&!(await catalogue.all()).rows.some(row=>row.concertId===show.key))throw Error('NOT_FOUND');const loaded=await state.load(show.key);await state.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);const fields=JSON.parse(loaded.source.documents['bezoekersdata.json']?.workflow_json||'{"visitors":{"fields":{}}}').visitors.fields,assigned=loaded.people.assignments.filter(row=>row.concertId===show.key&&row.role==='event-safety-manager');if(assigned.length>1)throw Error('REPORT_CONFLICT');const person=loaded.people.profiles.find(row=>row.id===assigned[0]?.userId),general={contacts:{productionManager:null,eventSafetyManager:person?[person.firstName,person.lastName].filter(Boolean).join(' '):null,tscProjectLead:null},tickets:{sales:fields.ticket_sales?.completed_at?fields.ticket_sales.content:null,origins:fields.visitor_origins?.completed_at?fields.visitor_origins.content:null,shows:loaded.source.shows}},timetable=loaded.source.timetables.find(row=>row.concertId===show.key)?.snapshot||null;
   const captured=intake?await intake.timetable(show.key):null;return{general,contextGeneral:artistPreparation(general,show).general,timetable:captured?.timetable||timetable};
  }catch(error){if(error.message!=='NOT_FOUND')throw error;}
  try{const previous=await reader.summary(show.key);return{general:null,contextGeneral:previous.context.general,timetable:previous.context.timetable};}catch(error){if(error.message!=='NOT_FOUND')throw error;}
  return{general:null,contextGeneral:{productionManager:null,eventSafetyManager:null,tscProjectLead:null,soldTickets:null,foreignPercentage:null},timetable:null};
 }
 function entry(show){const venue=MOJO_VENUES.find(row=>row.name===show.venue||reportVenueName(row)===show.venue);if(!venue)throw Error('REPORT_CATALOG');return{show:{...show,city:venue.city,seriesId:show.seriesId||null},sources:[]};}
 return{choices,resolve,context,entry};
}
