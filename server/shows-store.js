import {createManagedShowsRouting,managedShowsRouting} from './dataverse-shows/routing.js';
import {createNativeShowState} from './dataverse-shows/state.js';
import {createNativeShowsService} from './dataverse-shows/service.js';
import {nativeShowsSelected,assertNativeAuthority} from './dataverse-shows/authority.js';
import {createNativeShowsRepository} from './dataverse-shows/repository.js';
import {isDataverseShowId} from '../shared/dataverse-shows.js';
import {createActiveRepository,createActiveShowService} from './active-show-store.js';
import {isDataversePilot,pilotShow} from '../shared/dataverse-pilot.js';
import { createHash, createHmac, randomBytes } from 'node:crypto';

export function createShowsStore({ env = process.env, request = fetch, active = true, repository = null, legacy = false, nativeService = null, authority = null } = {}) {
  const drive = async function shows(operation, payload = {}) {
    payload={...payload};delete payload.__actor;
    const url = env.GOOGLE_DRIVE_SCRIPT_URL, secret = env.GOOGLE_DRIVE_SHARED_SECRET;
    if (!url || !secret || secret.length < 32) throw new Error('SHOWS_CONFIG');
    const parsed = new URL(url);
    if (parsed.origin !== 'https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error('SHOWS_CONFIG');
    const body = JSON.stringify({ ...payload, operation }), timestamp = Date.now(), nonce = randomBytes(16).toString('hex');
    const digest = createHash('sha256').update(body).digest('hex');
    const signature = createHmac('sha256', secret).update(`shows\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
    const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'shows', timestamp, nonce, signature, body }), signal: AbortSignal.timeout((operation.startsWith('migration-v1-')||operation === 'sync'||operation==='home-rebuild') ? 240000 : (operation === 'home-dashboard' || operation === 'show-open' || operation.startsWith('biography-') || operation.startsWith('incident-') || operation.startsWith('active-') || operation.startsWith('report-') || operation.startsWith('risk-') || operation.startsWith('measure-') || /^(barrier-|floor-)/.test(operation)) ? 90000 : 25000) });
    if (!response.ok) throw new Error('SHOWS_UNAVAILABLE');
    const result = await response.json();
    if (!result.ok) throw new Error(['FORBIDDEN','DASHBOARD_UNAVAILABLE','TICKET_CONFLICT','VALIDATION','PROFILE_CONFLICT','FINAL_CONFLICT','FINAL_NOT_READY','REPORT_NOT_READY','REPORT_CONFLICT','REPORT_UNAVAILABLE','NOT_FOUND','CONFLICT','SOURCE_CHANGED','VERIFY','ASSESSMENT_CONFLICT','ASSESSMENT_COMPLETED','ATTACHMENT_INVALID','STORAGE_BUSY','STORAGE_ARCHIVED','STORAGE_CONTRACT','STORAGE_ACTIVE'].includes(result.code) ? result.code : 'SHOWS_UNAVAILABLE');
    return result.data;
  };
  if(!legacy&&(nativeShowsSelected(env)||managedShowsRouting(env))){
    const state=nativeService?null:createNativeShowState({env});
    const native=nativeService||createNativeShowsService({env,state});
    const authorityRepo=authority?null:state?.repo||createNativeShowsRepository({env});
    const unrelated=operation=>operation.startsWith('artist-')||operation.startsWith('incident-')||operation.startsWith('biography-');
    const explicit=nativeShowsSelected(env),check=authority||(()=>assertNativeAuthority({env,repository:authorityRepo}));
    if(!explicit){
      const old=createShowsStore({env,request,active,repository,legacy:true}),route=createManagedShowsRouting({env,repository:authorityRepo});
      const shows=(operation,payload={})=>route({legacy:()=>old(operation,payload),native:()=>{const clean={...payload};delete clean.__actor;return unrelated(operation)&&native.related?native.related(operation,clean,(body=clean)=>drive(operation,body)):native(operation,payload);}});
      shows.provider='managed';shows.nativeManaged=true;shows.allowLegacyMaintenance=()=>route({legacy:()=>true,native:()=>{throw Error('STORAGE_ACTIVE');}});
      shows.activeStorage=Object.fromEntries(['alerts','verify','run'].map(method=>[method,(...args)=>route({legacy:()=>old.activeStorage?old.activeStorage[method](...args):method==='alerts'?[]:{enabled:false,mirrored:0,archived:0,failed:0},native:()=>native.activeStorage[method](...args)})]));
      return shows;
    }
    const shows=async(operation,payload={})=>{
      await check();
      const clean={...payload};delete clean.__actor;
      if(unrelated(operation)){
        return native.related?native.related(operation,clean,(body=clean)=>drive(operation,body)):drive(operation,clean);
      }
      return native(operation,payload);
    };
    shows.provider='dataverse';shows.allowLegacyMaintenance=async()=>{throw Error('STORAGE_ACTIVE');};shows.activeStorage=native.activeStorage;return shows;
  }
  const service=active&&env.VITE_SUPABASE_URL&&env.SUPABASE_SECRET_KEY?createActiveShowService({drive,repository:repository||createActiveRepository({env})}):null;
  let pilotReady=null;
  const shows=async(operation,payload={})=>{
    payload={...payload};delete payload.__actor;
    if(isDataversePilot(payload.concertId)){
      if(operation==='home-metadata')return{show:pilotShow()};
      // Alleen de expliciet geopende testshow aanmaken; geen writes bij menulezen.
      pilotReady ||= drive('pilot-ensure',{concertId:payload.concertId}).catch(error=>{pilotReady=null;throw error;});
      await pilotReady;
    }
    const data=await (service&&!isDataverseShowId(payload.concertId)?service.request(operation,payload):drive(operation,payload));
    return operation==='home-dashboard'&&service?service.planning(data):data;
  };
  shows.activeStorage=service;
  return shows;
}
