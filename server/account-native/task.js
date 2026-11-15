import {createNativeAccountStore} from './store.js';
import {createRawProfiles} from '../account-profiles.js';
import {normalizeSnapshot,snapshotHash,accountNativeType} from './model.js';
import {accessFlags} from '../account-access/store.js';
import {canonical} from '../show-migration-writer.js';
const drainMs=11*60000;
export function createNativeAccountTask({env=process.env,store=createNativeAccountStore({env}),raw=createRawProfiles({env}),now=Date.now}={}){
 const source=(operation,actor,payload={})=>raw(operation,actor,{...payload,actorNativeAllowed:true,nativeProfileContract:accountNativeType});
 async function sourcePolicy(actor,mode){const result=await source('native-profile-policy',actor,mode?{mode}:{});if(result?.protocol!==1||!['legacy','freeze','dataverse'].includes(result.mode)||mode&&result.mode!==mode)throw Error('ACCOUNT_SOURCE_PROTOCOL');return result.mode;}
 async function snapshot(actor){const data=normalizeSnapshot(await source('native-profile-snapshot',actor));for(const p of data.profiles){const acl=await store.access.get(p.id);if(!acl||acl.value.pending)throw Error('ACCOUNT_UNCONFIRMED');Object.assign(p,accessFlags(acl.value));}return data;}
 const result=(state,status='ready',delayMs=0)=>({cursor:JSON.stringify(state),status,delayMs,public:{label:state.phase==='complete'?'Accountprofielen, rollen, foto’s en instellingen gebruiken Dataverse.':state.phase==='drain'?'Bestaande accountwijzigingen veilig laten afronden.':'Resterende accountgegevens gecontroleerd overzetten.',total:state.total||0,progress:{phase:state.phase,current:state.checked||0,verifiedRecords:state.checked||0,verifiedFiles:state.files||0}}});
 return{title:'Volledige accountopslag',module:'shows',version:1,idempotent:true,async step({cursor,actor,runId}){
  let state=cursor?JSON.parse(cursor):{phase:'preflight',epoch:runId};if(state.epoch!==runId)throw Error('ACCOUNT_CORRUPT');let root=await store.get(null),policy=root?.value;
  if(policy?.mode==='dataverse'){if(!policy.verified||!policy.sourceGuard)throw Error('ACCOUNT_UNCONFIRMED');const all=await store.list({photos:true,settings:policy.settings});return result({...state,phase:'complete',total:all.length,checked:all.length,files:all.filter(p=>p.photo).length},'complete');}
  if(state.phase==='preflight'){
   if((await store.access.policy()).mode!=='dataverse')throw Error('ACCOUNT_ACCESS_REQUIRED');
   const mode=await sourcePolicy(actor),data=await snapshot(actor);if(mode==='dataverse'){if(!policy?.prepared||!policy.verified)throw Error('ACCOUNT_UNCONFIRMED');const actual=await store.list({photos:true,settings:policy.settings});if(canonical(actual)!==canonical(data.profiles))throw Error('ACCOUNT_UNCONFIRMED');await store.save(null,root,{...policy,epoch:runId});return result({...state,phase:'activate',hash:snapshotHash(data),total:actual.length,checked:actual.length,files:actual.filter(p=>p.photo).length});}
   const knownFreeze=policy?.mode==='freeze'&&policy.sourceFrozen&&mode==='freeze';const drainUntil=knownFreeze?policy.drainUntil:now()+drainMs;
   await store.save(null,root,{mode:'freeze',epoch:runId,drainUntil,sourceFrozen:knownFreeze,settings:data.settings});
   await sourcePolicy(actor,'freeze');root=await store.get(null);await store.save(null,root,{...root.value,sourceFrozen:true,drainUntil:knownFreeze?drainUntil:now()+drainMs});state={...state,phase:'drain',drainUntil:(await store.policy()).drainUntil};
  }else if(state.phase==='drain'){
   if(policy?.mode!=='freeze'||policy.epoch!==runId||await sourcePolicy(actor)!=='freeze')throw Error('ACCOUNT_UNCONFIRMED');
   if(now()<state.drainUntil)return result(state,'waiting',Math.min(60000,state.drainUntil-now()));
   const data=await snapshot(actor);if(canonical(data.settings)!==canonical(policy.settings))throw Error('SOURCE_CHANGED');state={...state,phase:'copy',hash:snapshotHash(data),total:data.profiles.length,checked:0,files:0};
  }else if(['copy','verify','activate'].includes(state.phase)){
   if(policy?.mode!=='freeze'||policy.epoch!==runId||!['freeze','dataverse'].includes(await sourcePolicy(actor)))throw Error('ACCOUNT_UNCONFIRMED');const data=await snapshot(actor);if(snapshotHash(data)!==state.hash)throw Error('SOURCE_CHANGED');
   if(state.phase==='copy'){
    for(const p of data.profiles.slice(state.checked,state.checked+2)){root=await store.get(null);await store.write(p,root,{copy:true});}
    state.checked=Math.min(data.profiles.length,state.checked+2);if(state.checked===data.profiles.length){state.phase='verify';state.checked=0;}
   }else if(state.phase==='verify'){
    const actual=await store.list({photos:true,settings:policy.settings});if(canonical(actual)!==canonical(data.profiles))throw Error('ACCOUNT_UNCONFIRMED');
    await store.save(null,await store.get(null),{...(await store.policy()),prepared:true,verified:true});state={...state,phase:'activate',checked:actual.length,files:actual.filter(p=>p.photo).length};
   }else{
    await sourcePolicy(actor,'dataverse');const confirmed=await snapshot(actor);if(snapshotHash(confirmed)!==state.hash)throw Error('SOURCE_CHANGED');root=await store.get(null);
    await store.save(null,root,{...root.value,mode:'dataverse',verified:true,sourceGuard:true,activatedAt:now(),snapshotHash:state.hash});
    const live=await store.list({photos:true,settings:(await store.policy()).settings});if(canonical(live)!==canonical(data.profiles))throw Error('ACCOUNT_UNCONFIRMED');state.phase='complete';
   }
  }else throw Error('ACCOUNT_CORRUPT');return result(state,state.phase==='complete'?'complete':'ready');
 },failure(error){const retryable=['DATAVERSE_SHOWS_CONFLICT','SETUP_THROTTLED','SETUP_TEMPORARY','TASK_STALE'].includes(error.message);return{code:/^[A-Z_]{1,60}$/.test(error.message)?error.message:'ACCOUNT_UNCONFIRMED',error:'De accountmigratie wacht op controle. Originelen zijn behouden; er wordt geen toegang verruimd.',retryable,uncertain:!retryable};}};
}
