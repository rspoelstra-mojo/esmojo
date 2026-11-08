import {createHash} from 'node:crypto';
import {createReadableArtistDirectory,resolveReadableArtist,foldArtistViews,validArtistReference,readableArtistName} from '../shared/artist-names.js';
import {timetableClock,validTimetableDate} from '../shared/show-timetable.js';
import {createWebReportService} from './report-web.js';
import {artistPreparation} from './artist-preparation.js';
import {artistTopFive,validArtistId} from '../shared/artist-catalogue.js';
import {researchView} from '../src/lib/research-view.js';
import {createArtistViews,validArtistViewEvent} from './artist-views.js';
import {getMojoArtistPhoto} from './mojo-photo.js';
export function createArtistService({env=process.env,shows,views=createArtistViews({env}),photo=getMojoArtistPhoto,now=Date.now}={}){
 let value=null,checked=0;const pending=new Map();
 async function catalogue(actor,force=false){
  if(!force&&value&&now()-checked<30000)return value;
  if(pending.has(actor))return pending.get(actor);
  const task=Promise.resolve().then(()=>shows('artist-catalogue',{actor})).then(data=>{const fresh=createReadableArtistDirectory(data.artists,name=>createHash('sha256').update(name).digest('hex'));fresh.profileSupported=data.profileSupported===true;value=fresh;checked=now();return fresh;}).finally(()=>pending.delete(actor));pending.set(actor,task);return task;
 }
 async function artist(actor,id){if(!validArtistReference(id))throw Error('VALIDATION');let directory=await catalogue(actor),row=resolveReadableArtist(directory,id);if(!row){directory=await catalogue(actor,true);row=resolveReadableArtist(directory,id);}if(!row)throw Error('NOT_FOUND');return row;}
 const top=(directory,counts)=>artistTopFive(directory.artists,foldArtistViews(directory,counts));
 function input(body,click=false){if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!==(click?'artistId,eventId':body.includeProfile===true?'artistId,includeProfile':'artistId')||!(click?validArtistId(body.artistId):validArtistReference(body.artistId))||click&&!validArtistViewEvent(body.eventId))throw Error('VALIDATION');return body;}
 return{
  async menu(actor){return{artists:(await catalogue(actor)).artists};},
  async ranking(actor){const [directory,counts]=await Promise.all([catalogue(actor),views.counts()]);return{mostViewed:top(directory,counts)};},
  async show(actor,body){
   if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!==(body.performance===undefined?'artistId,date,venue':'artistId,date,performance,venue')||body.performance!==undefined&&!['middag','avond'].includes(body.performance)||!validArtistReference(body.artistId)||!validTimetableDate(body.date)||body.date>=timetableClock(now()).date||typeof body.venue!=='string'||!body.venue||body.venue.length>200)throw Error('VALIDATION');
   const row=await artist(actor,body.artistId),directory=await catalogue(actor),artistIds=[row.id,...[...directory.aliases].filter(([,target])=>target===row.id).map(([id])=>id)];
   const source=await shows('artist-show',{actor,artistIds,date:body.date,venue:body.venue,...(body.performance?{performance:body.performance}:{})});
   if(body.performance&&source?.show?.performance!==body.performance||source?.show?.date!==body.date||source.show.venue!==body.venue||readableArtistName(source.show.name)!==row.name)throw Error('REPORT_UNAVAILABLE');
   const general={name:row.name,venue:body.venue,date:body.date,...(body.performance?{performance:body.performance}:{})};
   const preparation=artistPreparation(source.preparation,general);
   if(!source.report)return{show:general,timetable:source.timetable||null,kpis:null,reportId:null,preparation};
   if(body.performance&&source.report.show?.performance!==body.performance||source.report.show?.date!==body.date||source.report.show?.venue!==body.venue||readableArtistName(source.report.show?.name)!==row.name)throw Error('REPORT_UNAVAILABLE');
   const data=await createWebReportService({store:async()=>source.report,photo:async()=>null})(actor,{concertId:source.report.show.key});
   return{show:general,timetable:data.report.timetable,kpis:data.report.kpis,reportId:data.show.key,preparation};
  },
  async detail(actor,body){input(body);const row=await artist(actor,body.artistId),directory=await catalogue(actor);const detail={artist:{...row,id:validArtistId(body.artistId)?body.artistId:row.id},requestedReference:body.artistId,canonicalArtistId:row.id,canonicalArtistSlug:directory.routes.get(row.id)};
   if(!body.includeProfile||!directory.profileSupported)return detail;
   const artistIds=[row.id,...[...directory.aliases].filter(([,target])=>target===row.id).map(([id])=>id)];
   const profile=await shows('artist-profile',{actor,artistIds});
   const image=profile.photo||(await photo(row.name))?.imageUrl||null;
   const audience=Array.from({length:4},(_,index)=>{
    const entry=profile.audience?.[index+1];
    return entry?.summary?.trim()||researchView(entry).summaryText||null;
   });
   const audienceStoredAt=audience.map((text,index)=>{const date=profile.audience?.[index+1]?.storedAt;return text&&typeof date==='string'&&Number.isFinite(Date.parse(date))?date:null;});
   return {...detail,profile:{concerts:profile.concerts,photo:image,biography:profile.biography||null,latestDate:profile.latestDate,audience,audienceStoredAt}};},
  async record(actor,body){input(body,true);await artist(actor,body.artistId);const result=await views.record(body.artistId,body.eventId);try{return{...result,mostViewed:top(await catalogue(actor),await views.counts())};}catch{return result;}},
 };
}
