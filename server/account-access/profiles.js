import {randomUUID} from 'node:crypto';
import {createAccessStore,accessFlags,validAccountId} from './store.js';
import {canonical,digest} from '../show-migration-writer.js';
import {isAdministrator,validateAccountModules} from '../../shared/account-modules.js';
const mutations=['create','update','disable','delete','activate','bootstrap'];
const same=(a,b)=>canonical(accessFlags(a))===canonical(accessFlags(b));
export function createAccessProfiles({env=process.env,raw,store=createAccessStore({env}),now=Date.now}={}){
 async function current(id,{inactive=false,observed}={}){const state=observed===undefined?await store.get(id):observed;if(!state||state.value.pending||state.value.disabled||!inactive&&!state.value.activated)throw Error('FORBIDDEN');return state;}
 async function full(actor,payload,flags){const profile=await raw('self',actor,{...payload,actorNativeAllowed:true});if(profile.id!==actor)throw Error('ACCESS_CORRUPT');return{...profile,...accessFlags(flags)};}
 const profiles=async(operation,actor,payload={})=>{
  if(!validAccountId(actor))throw Error('VALIDATION');
  const observed=await store.authorization?.(actor),policy=observed?.policy||await store.policy();
  if(policy.mode!=='dataverse'){
   if(policy.mode==='freeze'&&mutations.includes(operation))throw Error('ACCESS_FROZEN');
   if(policy.mode==='freeze'){
    const profile=await raw('self',actor,{actorNativeAllowed:true});
    if(profile.id!==actor||profile.disabled||operation!=='self'&&!profile.activated)throw Error('FORBIDDEN');
    if(operation==='self')return profile;
    return raw(operation,actor,{...payload,actorNativeAllowed:true});
   }
   return raw(operation,actor,payload);
  }
  const own=await current(actor,{inactive:['self','activate'].includes(operation),observed:observed?.account});
  if(operation==='self'){
   if(payload.authorizationOnly===true)return accessFlags(own.value);
   return full(actor,payload,own.value);
  }
  const actorProfile=await full(actor,{},own.value);
  if(operation==='photo')return{...await raw(operation,actor,{...payload,actorNativeAllowed:true}),...accessFlags(own.value)};
  if(!isAdministrator(actorProfile)&&operation!=='activate')throw Error('FORBIDDEN');
  if(operation==='list'){
   const list=await raw('list',actor,{actorNativeAllowed:true});if(!Array.isArray(list)||list.length>1000)throw Error('ACCESS_CORRUPT');
   // Keep bounded I/O. Missing/pending access is visibly disabled, never granted.
   const output=[];for(let i=0;i<list.length;i+=8){output.push(...await Promise.all(list.slice(i,i+8).map(async profile=>{const access=await store.get(profile.id);return{...profile,...(access&&!access.value.pending?accessFlags(access.value):{id:profile.id,activated:false,disabled:true,modules:[]})};})));}return output;
  }
  if(operation==='access-reconcile'){
   if(Object.keys(payload).join(',')!=='id'||!validAccountId(payload.id))throw Error('VALIDATION');
   const target=await store.get(payload.id);if(!target?.value.pending)return{ok:true};
   const pending=target.value.pending;if(now()<pending.until)throw Error('ACCESS_PENDING');
   const actual=await raw('access-state',actor,{id:payload.id,actorNativeAllowed:true});
   const observed=actual||{id:payload.id,activated:false,disabled:true,modules:[]};
   const candidate=[pending.desired,pending.previous].find(value=>same(observed,value));
   if(!candidate)throw Error('ACCESS_UNCONFIRMED');
   await store.save(payload.id,target,{...candidate,pending:null});return{ok:true};
  }
  if(!mutations.includes(operation)||operation==='bootstrap')throw Error('FORBIDDEN');
  const id=operation==='create'?payload.profile?.id:operation==='activate'?actor:payload.id;
  if(!validAccountId(id))throw Error('VALIDATION');let previous=await store.get(id);
  if(previous?.value.pending)throw Error('ACCESS_PENDING');if(operation!=='create'&&!previous)throw Error('CONFLICT');if(operation==='create'&&previous&&!previous.value.disabled)throw Error('CONFLICT');
  const before=previous?accessFlags(previous.value):{id,activated:false,disabled:true,modules:[]};let desired={...before};
  if(operation==='create')desired={id,activated:false,disabled:false,modules:validateAccountModules(payload.profile?.modules||[])};
  if(operation==='activate')desired.activated=true;
  if(operation==='disable')desired.disabled=true;
  if(operation==='delete')desired={id,activated:false,disabled:true,modules:[]};
  if(operation==='update'&&Object.hasOwn(payload.profile||{},'modules'))desired.modules=validateAccountModules(payload.profile.modules);
  // The fixed superadministrator's effective access is explicit in the native
  // record; show-open never needs to read or cache a role to grant a module.
  if(operation==='update'&&payload.profile?.role==='superbeheerder')desired.modules=['shows','artists','reports'];
  const pending={id:randomUUID(),hash:digest({operation,actor,payload}),until:now()+15*60000,previous:before,desired};
  const fence=await store.save(id,previous,{...before,pending});
  try{
   const result=await raw(operation,actor,{...payload,actorNativeAllowed:true,nativeAccessState:desired});
   const observed=await raw('access-state',actor,{id,actorNativeAllowed:true});
   if(!same(observed||{id,activated:false,disabled:true,modules:[]},desired))throw Error('ACCESS_UNCONFIRMED');
   await store.save(id,fence,{...desired,pending:null});return result;
  }catch(error){
   // Known rejections did not mutate the source. Timeouts/unknown writes keep
   // the fence until a later administrator performs an exact read-back match.
   if(['FORBIDDEN','VALIDATION','CONFLICT','ACCESS_FROZEN'].includes(error.message))await store.save(id,fence,{...before,pending:null});
   throw error;
  }
 };
 profiles.accessStore=store;return profiles;
}
