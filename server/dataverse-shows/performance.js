import {createDataverseShows} from '../dataverse-shows.js';
import {nativeConnection} from './connection.js';
import {createNativeShowsService} from './service.js';
import {performance} from 'node:perf_hooks';
import {createTaskStore} from '../background-tasks/store.js';
import {createProfiles} from '../account-profiles.js';
import {hasModule,isAdministrator} from '../../shared/account-modules.js';
import {createNativeShowState} from './state.js';
import {createNativeCatalogue} from './catalogue.js';
import {assertNativeAuthority} from './authority.js';
import {createShowsStore} from '../shows-store.js';
import {createDataverseResearch} from '../dataverse-research.js';
import {digest} from '../show-migration-writer.js';
// Exact-main/OIDC only. Writes only a verified encrypted derived read projection;
// no business data, account rights, migration cursors or source files are changed.
export function createShowsPerformance({env=process.env,store=createTaskStore({env}),profiles=createProfiles({env}),state=createNativeShowState({env}),shows=null,research=createDataverseResearch({env}),clock=()=>performance.now(),now=Date.now,authority=()=>assertNativeAuthority({env,repository:state.repo})}={}){
 const catalogue=createNativeCatalogue({state});shows=createDataverseShows({shows:shows||createShowsStore({env,nativeService:createNativeShowsService({env,state,diagnostic:true})}),research});
 return async input=>{
  if(!input||Array.isArray(input)||!['prepare','measure'].includes(input.operation)||!Number.isInteger(input.step)||input.step<0||Object.keys(input).some(key=>!['operation','step','catalogue'].includes(key)))throw Error('VALIDATION');
  await authority();
  const approval=await store.get('shows-migration-v1');if(approval?.state.status!=='complete'||approval.state.expiresAt<=now())throw Error('TASK_EXPIRED');
  const actor=approval.state.actor,start=clock(),profile=await profiles('self',actor),authorizationMs=Math.round(clock()-start);
  if(profile.id!==actor||!profile.activated||profile.disabled||!isAdministrator(profile)||!hasModule(profile,'shows'))throw Error('FORBIDDEN');
  const rows=await catalogue.primaryShows(),hash=digest(rows);
  if(input.step===0){if(input.catalogue!==undefined)throw Error('VALIDATION');let geo=null;if(env.VERCEL_ENV==='production')try{const connection=nativeConnection(env),context=await connection.connect(),response=await connection.call("RetrieveCurrentOrganization(AccessType=Microsoft.Dynamics.CRM.EndpointAccessType'Default')",context.headers),data=response.ok?await connection.json(response):null;const value=data?.Detail?.Geo;if(typeof value==='string'&&/^[A-Z0-9_-]{2,20}$/.test(value))geo=value;}catch{/* Optional diagnostic, never a guessed region. */}
   return{ok:true,total:rows.length,catalogue:hash,region:/^[a-z]{3}[0-9]$/.test(env.VERCEL_REGION||'')?env.VERCEL_REGION:null,dataverseGeo:geo};}
  if(input.catalogue!==hash)throw Error('SOURCE_CHANGED');const selected=rows[input.step-1];if(!selected)throw Error('VALIDATION');
  if(input.operation==='prepare'){
   const loaded=await state.load(selected.key);await state.refreshOpening(loaded);return{ok:true,prepared:1};
  }
  const begun=clock();const [bundle,results]=await Promise.all([shows('show-open',{concertId:selected.key,actor,__actor:profile}),research.load(selected.key)]);research.merge(bundle.profile,results);
  if(!bundle.profile||!bundle.tickets||!bundle.risks||!bundle.barrier||!bundle.floor)throw Error('VERIFY');
  return{ok:true,verified:1,timings:{authorizationMs,openingMs:Math.round(clock()-begun),authorizedOpeningMs:Math.round(clock()-begun)+authorizationMs}};
 };
}
