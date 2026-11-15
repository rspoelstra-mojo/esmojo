import {viewResource,parseViewResource} from './view-resource.js';
import {createNativeShowsRepository} from '../dataverse-shows/repository.js';
import {createConcertCatalogue} from '../concert-catalogue.js';
import {validArtistId} from '../../shared/artist-catalogue.js';
import {validArtistViewEvent,ARTIST_VIEW_SECONDS} from './legacy-views.js';
import {createReadableArtistDirectory,resolveReadableArtist} from '../../shared/artist-names.js';
import {migrationDifferences,digest} from '../show-migration-writer.js';
import {technicalKey,technicalRecord,writeTechnical,securityTable} from './records.js';
const kind='artist-view-v1';
export function createNativeArtistViews({env=process.env,repo=createNativeShowsRepository({env}),catalogue=createConcertCatalogue({env}),now=Date.now}={}){
 const modelFor=(id,eventId,at)=>technicalRecord(kind,eventId,{resourcecode:viewResource({artistId:id,eventId,at}),externcommando:digest({artistId:id,eventId,at}),teller:1,vastgelegdop:new Date(Math.ceil(at/1000)*1000).toISOString(),venstereinde:new Date(Math.ceil((at+ARTIST_VIEW_SECONDS*1000)/1000)*1000).toISOString()});
 function parseEvent(row){const event=parseViewResource(row.esmojo_resourcecode),model=modelFor(event.artistId,event.eventId,event.at);if(migrationDifferences(model,row,model.fields).length)throw Error('ARTIST_VIEWS_UNAVAILABLE');return event;}
 async function record(id,eventId,{at=now(),importing=false}={}){
  if(!validArtistId(id)||!validArtistViewEvent(eventId)||!Number.isFinite(at)||at>now()+1000||at<=now()-ARTIST_VIEW_SECONDS*1000)throw Error('VALIDATION');
  const master=await catalogue.all(),directory=createReadableArtistDirectory(master.artists.map(row=>({id:row.artistId,name:row.name})),digest);if(!resolveReadableArtist(directory,id))throw Error('NOT_FOUND');const old=await repo.byKey(securityTable,technicalKey(kind,eventId));
  if(old){const event=parseEvent(old);if(event.artistId!==id||importing&&event.at!==at)throw Error('VALIDATION');if(event.at+ARTIST_VIEW_SECONDS*1000>now())return{recorded:false};}
  const model=modelFor(id,eventId,at);
  try{await writeTechnical(repo,[[model,old]]);}catch(error){const actual=await repo.byKey(securityTable,model.key);if(!actual)throw error;const event=parseEvent(actual);if(event.artistId!==id||importing&&event.at!==at)throw error;return{recorded:false};}return{recorded:true};
 }
 async function events(){const rows=await repo.query(securityTable,{filter:"esmojo_doelsoort eq '"+kind+"'"}),events=[];for(const row of rows){const event=parseEvent(row);if(event.at+ARTIST_VIEW_SECONDS*1000>now())events.push(event);}return events.sort((a,b)=>a.eventId.localeCompare(b.eventId));}
 async function counts(){const counts=new Map();for(const {artistId}of await events())counts.set(artistId,(counts.get(artistId)||0)+1);return[...counts].map(([id,views])=>({id,views}));}
 return{record,events,counts,provider:'dataverse'};
}
