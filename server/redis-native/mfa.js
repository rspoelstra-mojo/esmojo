import {createHmac,randomUUID} from 'node:crypto';
import {createNativeShowsRepository} from '../dataverse-shows/repository.js';
import {technicalKey,technicalRecord,writeTechnical,securityTable} from './records.js';
const until=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
export function createNativeMfaReplay({env=process.env,repo=createNativeShowsRepository({env}),now=Date.now,id=randomUUID}={}){
 const digest=(kind,...values)=>{if(typeof env.SUPABASE_SECRET_KEY!=='string'||env.SUPABASE_SECRET_KEY.length<16)throw Error('MFA_CACHE_UNAVAILABLE');return createHmac('sha256',env.SUPABASE_SECRET_KEY).update(JSON.stringify(['esmojo-mfa-v1',kind,...values])).digest('hex');};
 const get=async(kind,key)=>{const row=await repo.byKey(securityTable,technicalKey(kind,key));if(row&&(row.esmojo_doelsoort!==kind||row.esmojo_resourcecode!==key||!Number.isFinite(Date.parse(row.modifiedon))))throw Error('MFA_CACHE_UNAVAILABLE');return row;};
 const leaseUntil=row=>row?.esmojo_leaseid?Date.parse(row.modifiedon)+46000:0;
 const usedUntil=row=>row?.esmojo_teller===1?Date.parse(row.modifiedon)+31000:0;
 const row=(kind,key,previous,fields)=>technicalRecord(kind,key,{generatie:(previous?.esmojo_generatie||0)+1,...fields});
 async function claim(userId,factorId,code){
  const user=digest('user',userId),hash=digest('code',userId,factorId,code),owner=id();
  for(let attempt=0;attempt<3;attempt++){
   const [guard,used]=await Promise.all([get('mfa-user-v1',user),get('mfa-used-v1',hash)]),clock=now();
   if(usedUntil(used)>clock)return{state:'replay'};
   if(leaseUntil(guard)>clock)return{state:'busy'};
   const expires=new Date(Math.ceil((clock+45000)/1000)*1000).toISOString(),guardModel=row('mfa-user-v1',user,guard,{leaseid:owner,leaseverlooptop:expires,venstereinde:expires}),usedModel=row('mfa-used-v1',hash,used,{leaseid:owner,leaseverlooptop:expires,teller:0,venstereinde:expires});
   try{await writeTechnical(repo,[[guardModel,guard],[usedModel,used]]);}catch(error){if(error.message==='DATAVERSE_SHOWS_CONFLICT')continue;throw Error('MFA_CACHE_UNAVAILABLE');}
   return{state:'claimed',async commit(){
    const [current,marker]=await Promise.all([get('mfa-user-v1',user),get('mfa-used-v1',hash)]),clock=now();if(current?.esmojo_leaseid!==owner||marker?.esmojo_leaseid!==owner||leaseUntil(current)<=clock)throw Error('MFA_CACHE_UNAVAILABLE');
    try{await writeTechnical(repo,[[row('mfa-user-v1',user,current,{leaseid:null,leaseverlooptop:null,venstereinde:new Date(clock).toISOString()}),current],[row('mfa-used-v1',hash,marker,{leaseid:null,leaseverlooptop:null,teller:1,venstereinde:new Date(Math.ceil((clock+30000)/1000)*1000).toISOString()}),marker]]);}catch{throw Error('MFA_CACHE_UNAVAILABLE');}const confirmed=await get('mfa-used-v1',hash);if(usedUntil(confirmed)<=now())throw Error('MFA_CACHE_UNAVAILABLE');
   },async release(){const current=await get('mfa-user-v1',user);if(current?.esmojo_leaseid!==owner)return;try{await writeTechnical(repo,[[row('mfa-user-v1',user,current,{leaseid:null,leaseverlooptop:null,venstereinde:new Date(now()).toISOString()}),current]]);}catch{throw Error('MFA_CACHE_UNAVAILABLE');}}};
  }throw Error('MFA_CACHE_UNAVAILABLE');
 }
 async function health(){const started=Date.now(),resource=id(),model=technicalRecord('security-probe-v1',resource,{teller:1,venstereinde:new Date(now()+60000).toISOString()});await writeTechnical(repo,[[model,null]]);const actual=await get('security-probe-v1',resource),m=await repo.meta(securityTable);await repo.atomic([{table:securityTable,id:actual[m.PrimaryIdAttribute],etag:actual['@odata.etag'],method:'DELETE'}]);if(await get('security-probe-v1',resource))throw Error('MFA_CACHE_UNAVAILABLE');if(Date.now()-started>8000)throw Error('SECURITY_STORAGE_SLOW');return true;}
 return{claim,health,provider:'dataverse'};
}
