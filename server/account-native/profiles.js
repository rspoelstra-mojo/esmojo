import {createNativeAccountStore} from './store.js';
import {validAccountId,accessFlags} from '../account-access/store.js';
import {validatePhoto} from '../account-profiles.js';
import {checkedChange} from './model.js';
import {isAdministrator,isSuperAdministrator,validateAccountModules} from '../../shared/account-modules.js';
export function createNativeProfiles({env=process.env,store=createNativeAccountStore({env}),legacy}={}){
 return async(operation,actor,payload={})=>{
  if(operation==='self'&&payload.authorizationOnly===true&&(payload.reportRead===true||payload.moduleRead===true)&&env.VERCEL_ENV==='production'&&store.authorization)return accessFlags(await store.authorization(actor));
  const root=await store.get(null),policy=root?.value;
  if(!policy){if(env.VERCEL_ENV==='production')throw Error('ACCOUNT_CORRUPT');return legacy(operation,actor,payload);}
  const mutations=['create','update','disable','delete','activate','photo','bootstrap'];
  if(policy.mode==='freeze'){if(mutations.includes(operation))throw Error('ACCESS_FROZEN');if(!policy.prepared)return legacy(operation,actor,payload);}
  if(!['freeze','dataverse'].includes(policy.mode)||!policy.verified||policy.mode==='dataverse'&&!policy.sourceGuard||!validAccountId(policy.settings?.superAdminId))throw Error('ACCOUNT_CORRUPT');
  if(operation==='bootstrap-check')throw Error('CONFLICT');
  const own=await store.read(actor,{settings:policy.settings,photo:false});
  if(!own||own.disabled||!own.activated&&!['self','activate'].includes(operation))throw Error('FORBIDDEN');
  if(operation==='self'){if(payload.authorizationOnly===true)return accessFlags(own);const full=await store.read(actor,{settings:policy.settings,photo:true,requireEnabled:true});const copy=policy.settings.emailTestCopy;return{...full,...isSuperAdministrator(own)&&copy?.actor===actor?{emailTestCopyTo:copy.address}:{}};}
  if(operation==='photo'){
   if(Object.keys(payload).join(',')!=='photo'||!payload.photo)throw Error('VALIDATION');validatePhoto(payload.photo);return store.write({...own,photo:payload.photo},root);
  }
  if(operation==='activate'){const profile=await store.read(actor,{settings:policy.settings,photo:true});await store.write({...profile,activated:true},root);return{ok:true};}
  if(!isAdministrator(own))throw Error('FORBIDDEN');
  if(operation==='list')return store.list({settings:policy.settings});
  if(operation==='access-reconcile'){if(!await store.read(payload.id,{settings:policy.settings}))throw Error('CONFLICT');return{ok:true};}
  if(!['create','update','disable','delete'].includes(operation))throw Error('FORBIDDEN');
  const list=await store.list({settings:policy.settings});
  if(operation==='create'){
   const p=payload.profile;if(!validAccountId(p?.id)||typeof p.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)||p.role==='superbeheerder')throw Error('VALIDATION');
   if(list.some(row=>row.id===p.id||row.email.toLowerCase()===p.email.toLowerCase()))throw Error('CONFLICT');
   await store.write({...checkedChange(p),id:p.id,email:p.email.toLowerCase(),photo:p.photo||'',activated:false,disabled:false,modules:validateAccountModules(p.modules||[])},root);return{ok:true};
  }
  const target=await store.read(payload.id,{settings:policy.settings,photo:true});if(!target)throw Error('CONFLICT');const change=payload.profile;
  if(isSuperAdministrator(target)&&(!isSuperAdministrator(own)||actor!==target.id||operation!=='update'||change?.role!=='superbeheerder'))throw Error('CONFLICT');
  if(target.id===actor&&(operation!=='update'||!isAdministrator(change)))throw Error('CONFLICT');
  if(isAdministrator(target)&&!target.disabled&&(operation!=='update'||!isAdministrator(change))&&list.filter(row=>isAdministrator(row)&&!row.disabled).length<=1)throw Error('CONFLICT');
  if(operation==='update'){
   if(change?.role==='superbeheerder'&&target.id!==policy.settings.superAdminId)throw Error('FORBIDDEN');
   const p={...target,...checkedChange(change)};if(isSuperAdministrator(p))p.modules=['shows','artists','reports'];await store.write(p,root);
  }else await store.write({...target,disabled:true,...operation==='delete'?{activated:false,modules:[],photo:''}:{}},root,{deleted:operation==='delete'});
  return{ok:true};
 };
}
