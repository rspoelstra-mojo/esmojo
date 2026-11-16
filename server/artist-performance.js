import {randomUUID} from 'node:crypto';
import {createArtistService} from './artist-service.js';
import {createIncidentMetricsService} from './incident-metrics.js';
import {createShowsStore} from './shows-store.js';
import {createNativeReportsService} from './dataverse-reports/service.js';
import {createReportsStateStore} from './dataverse-reports/operational.js';
import {createProfiles} from './account-profiles.js';
import {nativeConnection} from './dataverse-shows/connection.js';
import {canonical,digest} from './show-migration-writer.js';
import {hasModule} from '../shared/account-modules.js';
import {timetableClock} from '../shared/show-timetable.js';
const type='artist-opening-preparation-v1';
// Fixed current main/OIDC worker, derived maintenance only, never a new grant.
export function createArtistPerformance({env=process.env,reports=createNativeReportsService({env}),shows=createShowsStore({env}),artists=createArtistService({env,shows}),metrics=createIncidentMetricsService({shows}),profiles=createProfiles({env}),store=createReportsStateStore({env,connection:nativeConnection(env)}),now=Date.now}={}){
 const save=async(row,next)=>{try{return await store.save(row,next);}catch(error){const fresh=await store.get(type);if(canonical(fresh?.state)!==canonical(next))throw error;return fresh;}};
 return async operation=>{
  if(!['inventory','prepare','baseline','measure'].includes(operation))throw Error('VALIDATION');const administrator=await reports.authorize(null,{worker:true,admin:true});if(!hasModule(administrator,'artists'))throw Error('FORBIDDEN');const actor=administrator.id,menu=(await artists.menu(actor)).artists.sort((a,b)=>a.id.localeCompare(b.id)),hash=digest({version:artists.opening?.version,day:timetableClock(now()).date,source:await artists.opening?.maintenanceFingerprint(),ids:menu.map(row=>row.id)});let row=await store.get(type);
  const status=()=>({ok:true,total:menu.length,prepared:row?.state.cursor?.hash===hash?row.state.cursor.index:0,complete:row?.state.cursor?.hash===hash&&row.state.cursor.index===menu.length});
  if(operation==='inventory')return status();
  if(operation==='baseline'){const start=performance.now(),selected=menu[0];await Promise.all([artists.detail(actor,{artistId:selected.id,includeProfile:true}),artists.risk(actor,{artistId:selected.id},metrics)]);return{ok:true,baselineNativeMs:Math.round(performance.now()-start)};}
  if(operation==='prepare'){
   if(!row){const at=now();row=await store.create(type,'Artiesten · leesprojecties voorbereiden',{version:1,type,actor:'derived-artist-maintenance',epoch:randomUUID(),status:'ready',sequence:0,attempts:0,startedAt:at,updatedAt:at,expiresAt:at+24*3600000,nextAt:at,lease:null,cursor:{hash,index:0,samples:{},largest:0,history:0},public:{label:'Afgeleide artiestleesprojecties'}});}
   if(row.state.lease?.until>now())return{...status(),busy:true};const cursor=row.state.cursor?.hash===hash?structuredClone(row.state.cursor):{hash,index:0,samples:{},largest:0,history:0};if(cursor.index===menu.length)return status();const lease={id:randomUUID(),until:Math.ceil((now()+300000)/1000)*1000};row=await save(row,{...row.state,lease,cursor,sequence:row.state.sequence+1,updatedAt:now()});
   let data;try{data=await artists.openAuthorized(actor,{artistId:menu[cursor.index].id},metrics,administrator,{beforePublish:async()=>{const leaseRow=await store.get(type);if(leaseRow?.state.lease?.id!==lease.id||leaseRow.state.lease.until<=now())throw Error('SOURCE_CHANGED');const current=await reports.authorize(null,{worker:true,admin:true});if(!hasModule(current,'artists'))throw Error('FORBIDDEN');}});}catch(error){if(error.message!=='SOURCE_CHANGED')throw error;const current=await store.get(type);if(current?.state.lease?.id!==lease.id)throw Error('SOURCE_CHANGED');row=await save(current,{...current.state,lease:null,sequence:current.state.sequence+1,updatedAt:now()});return{...status(),busy:true,sourceChanged:true};}if(!data.profile||!Object.hasOwn(data,'risk'))throw Error('ARTIST_OPENING_INVALID');cursor.samples||={};const bytes=Buffer.byteLength(JSON.stringify(data)),history=(data.profile.concerts||[]).reduce((n,row)=>n+(row.dates?.length||0),0);if(bytes>(cursor.largest||0)){cursor.largest=bytes;cursor.samples.largest=cursor.index;}if(history>(cursor.history||0)){cursor.history=history;cursor.samples.history=cursor.index;}cursor.index++;
   const current=await store.get(type);if(current?.state.lease?.id!==lease.id||current.state.lease.until<=now())throw Error('SOURCE_CHANGED');row=await save(current,{...current.state,lease:null,cursor,sequence:current.state.sequence+1,updatedAt:now()});return status();
  }
  if(!status().complete)throw Error('ARTIST_OPENING_NOT_PREPARED');const times=[],indexes=[...new Set([0,Math.floor(menu.length/2),menu.length-1,...Object.values(row.state.cursor.samples||{})])];let largestBytes=0;
  for(let round=0;round<3;round++)for(const index of indexes){const start=performance.now(),profile=await profiles('self',actor,{authorizationOnly:true,moduleRead:true}),data=await artists.openAuthorized(actor,{artistId:menu[index].id},metrics,profile,{prepare:false});times.push(Math.round(performance.now()-start));largestBytes=Math.max(largestBytes,Buffer.byteLength(JSON.stringify(data)));}
  const coldEnv={...env},coldProfiles=createProfiles({env:coldEnv}),coldShows=createShowsStore({env:coldEnv}),coldArtists=createArtistService({env:coldEnv,shows:coldShows}),coldStart=performance.now(),coldProfile=await coldProfiles('self',actor,{authorizationOnly:true,moduleRead:true});await coldArtists.openAuthorized(actor,{artistId:menu[row.state.cursor.samples?.largest??indexes[0]].id},createIncidentMetricsService({shows:coldShows}),coldProfile,{prepare:false});const coldBackendMs=Math.round(performance.now()-coldStart);times.sort((a,b)=>a-b);
  return{ok:true,complete:true,samples:times.length,largestBytes,coldBackendMs,p50Ms:times[Math.floor(times.length/2)],maxMs:times.at(-1),backendBudgetMs:750,backendWithinBudget:Math.max(coldBackendMs,times.at(-1))<=750};
 };
}
