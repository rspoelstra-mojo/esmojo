import {createRedisPolicy,redisTaskType} from './policy.js';
import {createLegacyArtistViews,ARTIST_VIEW_SECONDS} from './legacy-views.js';
import {createNativeArtistViews} from './views.js';
import {createNativeMfaReplay} from './mfa.js';
import {createRedisCleanup} from './cleanup.js';
import {canonical,digest} from '../show-migration-writer.js';
const drainMs=11*60000;
export function createRedisRetirementTask({env=process.env,policy=createRedisPolicy({env}),source=createLegacyArtistViews({env}),views=createNativeArtistViews({env}),mfa=createNativeMfaReplay({env}),cleanup=createRedisCleanup({env}),now=Date.now}={}){
 const current=async()=> (await source.snapshot()).filter(row=>row.at+ARTIST_VIEW_SECONDS*1000>now());
 const result=(state,status='ready',delayMs=0)=>({cursor:JSON.stringify(state),status,delayMs,public:{label:state.phase==='complete'?'Artiestenkliks en MFA-replaybeveiliging gebruiken Dataverse.':state.phase==='drain'?'Bestaande verificaties en klikregistraties veilig laten afronden. Nieuwe MFA-verificaties zijn tijdelijk gepauzeerd; bestaande sessies blijven geldig.':'Redis-opslag gecontroleerd overzetten.',total:state.total||0,progress:{phase:state.phase,current:state.checked||0,verifiedRecords:state.verified||0}}});
 return{title:'Redis vervangen door Dataverse',module:'artists',requiredModules:['shows'],version:1,idempotent:true,async step({cursor,actor,runId}){
  let state=cursor?JSON.parse(cursor):{phase:'preflight',epoch:runId};if(state.epoch!==runId)throw Error('REDIS_AUTHORITY_INVALID');let observed=await policy.read();
  if(observed.value.mode==='dataverse'){await mfa.health();const events=await views.events();return result({...state,phase:'complete',total:events.length,checked:events.length,verified:events.length},'complete');}
  if(state.phase==='preflight'){
   await mfa.health();await current();const known=observed.value.mode==='freeze'&&observed.value.sourceFrozen===true&&await source.frozen(),drainUntil=known?observed.value.drainUntil:now()+drainMs;
   await policy.save(observed,{mode:'freeze',epoch:runId,drainUntil,sourceFrozen:false});await source.freeze();observed=await policy.read();await policy.save(observed,{...observed.value,sourceFrozen:true,drainUntil:known?drainUntil:now()+drainMs});state={...state,phase:'drain',drainUntil:(await policy.read()).value.drainUntil};
  }else{
   if(observed.value.mode!=='freeze'||observed.value.epoch!==runId||!observed.value.sourceFrozen||!await source.frozen())throw Error('REDIS_AUTHORITY_INVALID');
   if(state.phase==='drain'){if(now()<state.drainUntil)return result(state,'waiting',Math.min(60000,state.drainUntil-now()));const snapshot=await current();state={...state,phase:'copy',total:snapshot.length,after:null,checked:0};}
   else if(state.phase==='copy'){
    const snapshot=await current(),batch=snapshot.filter(row=>!state.after||row.eventId>state.after).slice(0,10);
    for(const event of batch)await views.record(event.artistId,event.eventId,{at:event.at,importing:true});state.checked+=batch.length;if(batch.length)state.after=batch.at(-1).eventId;if(batch.length<10)state.phase='verify';
   }else if(state.phase==='verify'||state.phase==='activate'){
    const before=await current(),native=await views.events(),after=await current(),asOf=now(),alive=rows=>rows.filter(row=>row.at+ARTIST_VIEW_SECONDS*1000>asOf);
    if(canonical(alive(before))!==canonical(alive(after))||canonical(alive(after))!==canonical(alive(native)))throw Error('REDIS_SOURCE_CONFLICT');
    if(state.phase==='verify'){state={...state,phase:'activate',hash:digest(alive(after)),total:alive(after).length,checked:alive(after).length,verified:alive(after).length};}
    else{await mfa.health();await policy.save(await policy.read(),{...observed.value,mode:'dataverse',verified:true,activatedAt:now(),eventHash:digest(alive(after)),events:alive(after).length,leaseDrainVerified:true});if((await policy.read()).value.mode!=='dataverse')throw Error('REDIS_AUTHORITY_UNCONFIRMED');const readback=await views.events(),readbackAt=now(),active=rows=>rows.filter(row=>row.at+ARTIST_VIEW_SECONDS*1000>readbackAt);if(canonical(active(readback))!==canonical(active(after)))throw Error('REDIS_SOURCE_CONFLICT');await cleanup();state.phase='complete';}
   }else throw Error('REDIS_AUTHORITY_INVALID');
  }return result(state,state.phase==='complete'?'complete':'ready');
 },failure(error){const retryable=['DATAVERSE_SHOWS_CONFLICT','SETUP_THROTTLED','SETUP_TEMPORARY','TASK_STALE'].includes(error.message);return{code:/^[A-Z_]{1,60}$/.test(error.message)?error.message:'REDIS_MIGRATION_UNCONFIRMED',error:'De Redis-migratie wacht op controle. Er is geen onbeveiligde terugval; bestaande sessies en Supabase Auth blijven behouden.',retryable,uncertain:!retryable};}};
}
