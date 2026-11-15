import {MOJO_VENUES,canonicalVenueName} from '../server/mojo-venues.js';
// De Productie-index bevat alleen canoniek geïmporteerde Gashouder-reeksen.
// Houd alle reeksdatums voor dezelfde deadlinebasis; active bepaalt zichtbaarheid.
export function homeCatalogue(state,actor,assignments=[],{includeHistory=false}={}){
 if(state?.version!==1||state.managedBy!=='ESMOJO/MOJO-v1'||!Array.isArray(state.concerts)||!Array.isArray(state.active)||!Number.isFinite(Date.parse(state.checkedAt)))throw Error('DASHBOARD_UNAVAILABLE');
 const active=new Set(state.active),groups=new Map(),byId=new Map(state.concerts.map(row=>[row.concertId,row]));
 for(const row of state.concerts){
  if(!MOJO_VENUES.some(venue=>venue.name===canonicalVenueName(row.venue)&&venue.city===row.city))continue;
  const primary=byId.get(row.generalConcertId);if(!primary||canonicalVenueName(primary.venue)!==canonicalVenueName(row.venue)||primary.city!==row.city||primary.generalConcertId!==primary.concertId||row.generalFolderId!==primary.folderId||primary.generalFolderId!==primary.folderId)throw Error('DASHBOARD_UNAVAILABLE');
  if(!groups.has(primary.concertId))groups.set(primary.concertId,{primary,rows:[]});groups.get(primary.concertId).rows.push(row);
 }
 return [...groups.values()].filter(group=>includeHistory||group.rows.some(row=>active.has(row.concertId))).map(({primary,rows})=>({
  key:primary.concertId,name:primary.artist,venueId:MOJO_VENUES.find(venue=>venue.name===canonicalVenueName(primary.venue)).id,venue:canonicalVenueName(primary.venue),city:primary.city,dates:[...new Set(rows.map(row=>row.date))].sort(),
  activeDates:[...new Set(rows.filter(row=>active.has(row.concertId)).map(row=>row.date))].sort(),
  times:Object.fromEntries(rows.filter(row=>typeof row.time==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time)).map(row=>[row.date,row.time])),
  sourceUrl:primary.sourceUrl,assigned:rows.some(row=>assignments.some(link=>link.concertId===row.concertId&&link.userId===actor&&link.role==='event-safety-manager')),
  concerts:rows.filter(row=>includeHistory||active.has(row.concertId)).map(row=>({key:row.concertId,date:row.date,time:typeof row.time==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time)?row.time:null,assigned:assignments.some(link=>link.concertId===row.concertId&&link.userId===actor&&link.role==='event-safety-manager')})),
 }));
}
