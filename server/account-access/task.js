import {createAccessStore,accessFlags,accessContract,validAccountId} from './store.js';
import {createAccessProfiles} from './profiles.js';
import {createRawProfiles} from '../account-profiles.js';
import {canonical,digest} from '../show-migration-writer.js';
const drainMs=11*60000;
export const accessTaskType='account-access-v1';
const normalize=rows=>{
 if(!Array.isArray(rows)||!rows.length||rows.length>1000)throw Error('ACCESS_CORRUPT');
 const values=rows.map(accessFlags).sort((a,b)=>a.id.localeCompare(b.id));
 if(new Set(values.map(row=>row.id)).size!==values.length)throw Error('ACCESS_CORRUPT');return values;
};
// The generic task engine supplies fresh admin/module checks, durable encrypted
// checkpoints, 48h delegation, global execution lock and per-task CAS lease.
export function createAccessTask({env=process.env,store=createAccessStore({env}),raw=createRawProfiles({env}),now=Date.now}={}){
 const result=(cursor,status='ready',delayMs=0)=>({cursor:JSON.stringify(cursor),status,delayMs,public:{label:cursor.phase==='complete'?'Accountstatus en modulerechten gebruiken Dataverse.':cursor.phase==='drain'?'Bestaande accountverzoeken veilig laten afronden.':cursor.phase==='copy'?'Accountstatus en modulerechten controleren en voorbereiden.':'Snelle toegangscontrole voorbereiden.',total:cursor.total||0,progress:{phase:cursor.phase,current:cursor.checked||0,verifiedRecords:cursor.checked||0}}});
 async function sourcePolicy(actor,mode){const value=await raw('access-policy',actor,{...(mode?{mode}:{}),actorNativeAllowed:true});if(!['legacy','freeze','dataverse'].includes(value?.mode)||mode&&value.mode!==mode)throw Error('ACCESS_UNCONFIRMED');return value.mode;}
 const definition={title:'Snelle toegangscontrole',module:'shows',version:1,idempotent:true,
  async step({cursor,actor,runId}){
   let state=cursor?JSON.parse(cursor):{phase:'preflight',epoch:runId};if(state.epoch!==runId)throw Error('ACCESS_CORRUPT');
   let policy=await store.policy();
   // Restart after confirmed activation only verifies; it never recopies Drive.
   if(policy.mode==='dataverse'){
    if(await sourcePolicy(actor)!=='dataverse')throw Error('ACCESS_UNCONFIRMED');
    const entries=await store.repo.query('esmojo_integratiestatus',{filter:"esmojo_integratiecode eq '"+accessContract+"' and esmojo_scopecode eq 'account'"}),profiles=createAccessProfiles({env,raw,store,now});
    for(const row of entries){const id=row.esmojo_bronidentiteit?.slice('account-access/v1/'.length),access=await store.get(id);if(access?.value.pending){if(now()<access.value.pending.until)return result({...state,phase:'reconcile'},'waiting',Math.min(60000,access.value.pending.until-now()));await profiles('access-reconcile',actor,{id});}}
    return result({...state,phase:'complete'},'complete');
   }
   if(state.phase==='preflight'){
    await store.repo.meta('esmojo_integratiestatus');const source=await sourcePolicy(actor);
    if(source==='dataverse'&&policy.mode!=='freeze')throw Error('ACCESS_UNCONFIRMED');
    const previous=await store.get(null);
    const provenFreeze=policy.mode==='freeze'&&policy.sourceFrozen===true&&source!=='legacy'&&Number.isFinite(policy.drainUntil);
    const provisional=provenFreeze?policy.drainUntil:now()+drainMs;
    await store.save(null,previous,{mode:'freeze',epoch:runId,drainUntil:provisional,sourceFrozen:provenFreeze});
    // The drain starts AFTER a confirmed source freeze. A failed first attempt
    // must never reuse an elapsed Node-only timer when the source stayed open.
    if(source!=='dataverse')await sourcePolicy(actor,'freeze');
    const drainUntil=provenFreeze?provisional:now()+drainMs;
    await store.save(null,await store.get(null),{mode:'freeze',epoch:runId,drainUntil,sourceFrozen:true});
    state={...state,phase:'drain',drainUntil};
   }else if(state.phase==='drain'){
    if(policy.mode!=='freeze'||policy.epoch!==runId)throw Error('ACCESS_UNCONFIRMED');
    const source=await sourcePolicy(actor);if(!['freeze','dataverse'].includes(source))throw Error('ACCESS_UNCONFIRMED');
    if(now()<state.drainUntil)return result(state,'waiting',Math.min(60000,state.drainUntil-now()));
    const sourceRows=normalize(await raw('access-snapshot',actor,{actorNativeAllowed:true}));
    state={...state,phase:'copy',hash:digest(sourceRows),total:sourceRows.length,checked:0};
   }else if(['copy','verify','activate'].includes(state.phase)){
    if(policy.mode!=='freeze'||policy.epoch!==runId||!['freeze','dataverse'].includes(await sourcePolicy(actor)))throw Error('ACCESS_UNCONFIRMED');
    const rows=normalize(await raw('access-snapshot',actor,{actorNativeAllowed:true}));if(digest(rows)!==state.hash)throw Error('SOURCE_CHANGED');
    if(state.phase==='copy'){
     for(const flags of rows.slice(state.checked,state.checked+8)){const previous=await store.get(flags.id);if(!previous||previous.value.pending||canonical(accessFlags(previous.value))!==canonical(flags))await store.save(flags.id,previous,{...flags,pending:null});}
     state.checked=Math.min(rows.length,state.checked+8);if(state.checked===rows.length){state.phase='verify';state.checked=0;}
    }else if(state.phase==='verify'){
     for(const flags of rows.slice(state.checked,state.checked+8)){const actual=await store.get(flags.id);if(!actual||actual.value.pending||canonical(accessFlags(actual.value))!==canonical(flags))throw Error('ACCESS_UNCONFIRMED');}
     state.checked=Math.min(rows.length,state.checked+8);
     if(state.checked===rows.length){
      // Tombstone leftovers from an interrupted preparation. Otherwise a source
      // account removed before retry could retain an unintended native grant.
      const actual=await store.repo.query('esmojo_integratiestatus',{filter:"esmojo_integratiecode eq '"+accessContract+"' and esmojo_scopecode eq 'account'"}),ids=new Set(rows.map(row=>row.id));
      for(const record of actual){const id=record.esmojo_bronidentiteit?.slice('account-access/v1/'.length);if(!validAccountId(id))throw Error('ACCESS_CORRUPT');if(!ids.has(id)){const previous=await store.get(id);await store.save(id,previous,{id,activated:false,disabled:true,modules:[],pending:null});}}
      state.phase='activate';
     }
    }else{
     await sourcePolicy(actor,'dataverse'); // Old deployments now fail closed.
     const guarded=normalize(await raw('access-snapshot',actor,{actorNativeAllowed:true}));if(digest(guarded)!==state.hash)throw Error('SOURCE_CHANGED');
     await store.save(null,await store.get(null),{mode:'dataverse',epoch:runId,verified:true,sourceGuard:true,activatedAt:now(),snapshotHash:state.hash});
     if((await store.policy()).mode!=='dataverse')throw Error('ACCESS_UNCONFIRMED');state.phase='complete';
    }
   }else throw Error('ACCESS_CORRUPT');
   return result(state,state.phase==='complete'?'complete':'ready');
  },
  failure(error){const transient=['SETUP_THROTTLED','SETUP_TEMPORARY','DATAVERSE_SHOWS_CONFLICT','TASK_STALE'].includes(error.message);return{code:/^[A-Z_]{1,60}$/.test(error.message)?error.message:'ACCESS_UNCONFIRMED',error:'De toegangscontrole wacht op controle. Bestaande brongegevens zijn behouden; er wordt geen toegang verruimd.',retryable:transient,uncertain:!transient};}
 };return definition;
}
