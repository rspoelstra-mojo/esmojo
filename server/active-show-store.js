import {isDeepStrictEqual} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {createHash,randomUUID} from 'node:crypto';
import {archiveAfterShow,validateActiveSnapshot} from '../shared/active-show-storage.js';
import {activeCompletion,activeRiskView,reduceActiveShow} from './active-show-model.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function publicActivePlanning(state,now=new Date().toISOString()){
 return{key:state.concertId,updatedAt:now,completion:activeCompletion(state)};
}
export function createActiveRepository({env=process.env,clientFactory=createClient}={}){
 let client;const db=()=>client||(client=clientFactory(env.VITE_SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}));
 const check=({data,error})=>{if(error)throw Error('ACTIVE_STORAGE_UNAVAILABLE');return data;};
 return{
  async health(){const row=check(await db().from('esmojo_storage_control').select('version,enabled').eq('id',1).single());if(row.version!==1)throw Error('ACTIVE_STORAGE_UNAVAILABLE');check(await db().rpc('esmojo_show_claim',{p_id:'__schema_probe__',p_lease:randomUUID()}));return{schemaReady:true,enabled:row.enabled};},
  async enabled(){const {data,error}=await db().from('esmojo_storage_control').select('enabled,version').eq('id',1).maybeSingle();if(error&&['42P01','PGRST205'].includes(error.code))return false;if(error)throw Error('ACTIVE_STORAGE_UNAVAILABLE');return data?.version===1&&data.enabled===true;},
  async get(id){const rows=check(await db().from('esmojo_active_shows').select('*').contains('aliases',[id]).limit(2));if(rows.length>1)throw Error('CONFLICT');return rows[0]||null;},
  async seed(snapshot){validateActiveSnapshot(snapshot);const overlaps=check(await db().from('esmojo_active_shows').select('concert_id').overlaps('aliases',snapshot.aliases).limit(2));if(overlaps.some(row=>row.concert_id!==snapshot.concertId))throw Error('CONFLICT');check(await db().from('esmojo_active_shows').upsert({concert_id:snapshot.concertId,aliases:snapshot.aliases,archive_after:archiveAfterShow(snapshot.dates),snapshot},{onConflict:'concert_id',ignoreDuplicates:true}));return this.get(snapshot.concertId);},
  async claim(id){const lease=randomUUID(),rows=check(await db().rpc('esmojo_show_claim',{p_id:id,p_lease:lease}));return rows[0]||null;},
  async commit(row,snapshot,command=null,result=null){validateActiveSnapshot(snapshot);const rows=check(await db().rpc('esmojo_show_commit',{p_id:row.concert_id,p_lease:row.lease,p_revision:row.revision,p_snapshot:snapshot,p_archive_after:archiveAfterShow(snapshot.dates),p_command:command,p_result:result}));if(!rows[0])throw Error('ACTIVE_STORAGE_CONFLICT');return rows[0];},
  async intent(row,command){if(!check(await db().rpc('esmojo_show_intent',{p_id:row.concert_id,p_lease:row.lease,p_revision:row.revision,p_command:command})))throw Error('ACTIVE_STORAGE_CONFLICT');},
  async error(row){check(await db().rpc('esmojo_show_error',{p_id:row.concert_id,p_lease:row.lease,p_revision:row.revision}));},
  async receipt(id,command){return check(await db().from('esmojo_show_receipts').select('result').eq('concert_id',id).eq('command',command).maybeSingle());},
  async release(row,{mirrored=false,error=false}={}){return check(await db().rpc('esmojo_show_release',{p_id:row.concert_id,p_lease:row.lease,p_revision:row.revision,p_mirrored:mirrored,p_error:error}));},
  async purge(row){if(!check(await db().rpc('esmojo_show_purge',{p_id:row.concert_id,p_lease:row.lease,p_revision:row.revision})))throw Error('ACTIVE_STORAGE_CONFLICT');},
  async planningRows(){return check(await db().from('esmojo_active_shows').select('concert_id,completion:snapshot->completion,updated_at').limit(1000));},
  async alertRows(){return check(await db().from('esmojo_active_shows').select('concert_id').eq('archive_error',true).limit(1000));},
  async work(){return check(await db().from('esmojo_active_shows').select('*').or('pending.eq.true,archive_after.lte.'+new Date().toISOString()+',external_command.not.is.null').order('archive_after').limit(12));},
  async all(){return check(await db().from('esmojo_active_shows').select('*').order('archive_after').limit(1000));},
 };
}
const applies=operation=>['show-open','profile-read','profile-save','final-read','final-complete','risk-view','risk-operational-save','risk-production-save'].includes(operation)||/^(barrier-|floor-|ticket-|measure-|report-)/.test(operation);
const nonblocking=operation=>['show-open','profile-read','ticket-read','ticket-reserve','ticket-renew','ticket-release','barrier-download','measure-download'].includes(operation)||operation.startsWith('report-');
const external=operation=>['show-open','profile-read'].includes(operation)||/^(floor-|ticket-|report-)/.test(operation);
// Supabase is de waarheid voor actieve voorbereiding; Drive-only acties krijgen
// alleen een tijdelijke overlay op hun bestaande gevalideerde Drive-uitvoering.
export function createActiveShowService({drive,repository,now=Date.now,sleep=delay}={}){
 async function enabled(){return repository.enabled();}
 async function acquire(id){const until=now()+12000;do{const row=await repository.claim(id);if(row){if(row.external_command){if(await recover(row))return null;continue;}return row;}await sleep(150);}while(now()<until);throw Error('STORAGE_BUSY');}
 async function recover(row){
  if(now()-Date.parse(row.external_started)<3*60000||Date.parse(row.lease_until)-now()<7*60000)throw Error('STORAGE_BUSY');
  const response=await drive('active-recover',{concertId:row.concert_id,command:row.external_command,leaseUntil:row.lease_until,snapshot:row.snapshot});
  if(!response.verified)throw Error('VERIFY');
  if(response.archived){await repository.purge(row);return true;}
  await repository.commit(row,response.snapshot);return false;
 }

 async function bridge(row,mode,request=null,fresh=false){
  const command=hash({mode,id:row.concert_id,revision:row.revision,snapshot:row.snapshot,request,...(fresh?{nonce:randomUUID()}:{})});
  if(row.lease&&!['sync','virtual'].includes(mode))await repository.intent(row,command);
  return drive('active-bridge',{concertId:row.concert_id,snapshot:row.snapshot,revision:row.revision,leaseUntil:row.lease_until,mode,command,request});
 }
 async function archive(row){
  const response=await bridge(row,'archive');if(response.deferred){await repository.commit(row,response.snapshot);return false;}if(!response.archived||!response.verified)throw Error('VERIFY');await repository.purge(row);return true;
 }
 let handoffReady=false;
 async function find(id){
  let row=await repository.get(id);if(row)return row;
  let source=await drive('active-export',{concertId:id,...(handoffReady?{activate:true}:{})});
  if(!source.archived&&source.supportsActivation&&!handoffReady){handoffReady=true;source=await drive('active-export',{concertId:id,activate:true});}
  if(source.archived)return null;
  const snapshot=validateActiveSnapshot(source.snapshot);
  // Historische shows nooit alsnog naar Supabase importeren.
  if(Date.parse(archiveAfterShow(snapshot.dates))<=now())return null;
  return repository.seed(snapshot);
 }
 const service={
  async request(operation,payload={}){
   if(!applies(operation)||!payload.concertId)return drive(operation,payload);
   if(!await enabled())return drive(operation,payload);
   let row;
   if(operation==='show-open'){
    row=await repository.get(payload.concertId);
    if(!row){
     let source;try{source=await drive('active-open',payload);}catch(error){if(error.message!=='VALIDATION')throw error;}
     if(source){
      if(!source.bundle?.profile||!source.bundle?.tickets||!source.bundle?.risks)throw Error('STORAGE_CONTRACT');
      if(source.archived){row=await repository.get(payload.concertId);if(!row)return source.bundle;}
      else{
       const snapshot=validateActiveSnapshot(source.snapshot);row=await repository.seed(snapshot);
       // Een andere gebruiker kan tussen export en insert al hebben opgeslagen.
       // Alleen exact dezelfde gecommitteerde stand direct uit de bundel tonen.
       if(isDeepStrictEqual(row.snapshot,snapshot))return{...source.bundle,homePlanning:publicActivePlanning(row.snapshot,new Date(now()).toISOString())};
      }
     }
    }
   }
   row ||= await find(payload.concertId);if(!row)return drive(operation,payload);
   if((nonblocking(operation)||operation==='risk-view'&&activeRiskView(row.snapshot).state!=='ready')&&Date.parse(archiveAfterShow(row.snapshot.dates))>now()){
    // Lezen/PDF/bestanden mogen geen snelle beoordelingswrite blokkeren.
    const frozen={...row,lease:null,lease_until:new Date(now()+15*60000).toISOString()};
    const response=await bridge(frozen,'virtual',{operation,...payload,concertId:row.concert_id},true);
    if(!response.verified)throw Error('VERIFY');
    let confirmed=false,stale=false;
    if(JSON.stringify(response.snapshot)!==JSON.stringify(row.snapshot)){
     try{await repository.commit(frozen,response.snapshot);confirmed=true;}catch(error){if(error.message!=='ACTIVE_STORAGE_CONFLICT')throw error;stale=true;}
    }
    if(response.errorCode)throw Error(response.errorCode);return{...response.result,...(confirmed?{homePlanning:publicActivePlanning(response.snapshot,new Date(now()).toISOString())}:{}),...(stale?{storageStale:true}:{})};
   }
   const command=hash({operation,payload});
   if(!external(operation)){const saved=await repository.receipt(row.concert_id,command);if(saved)return saved.result;}
   row=await acquire(row.concert_id);if(!row)return drive(operation,payload);let handedToDrive=false;
   try{
    if(Date.parse(archiveAfterShow(row.snapshot.dates))<=now()){
     handedToDrive=true;if(!await archive(row))return service.request(operation,payload);return drive(operation,payload);
    }
    const canonical={...payload,concertId:row.concert_id};let output;
    if(!external(operation)){
     try{output=reduceActiveShow(row.snapshot,operation,canonical,new Date(now()).toISOString());}catch(error){if(error.message!=='DRIVE_REQUIRED')throw error;}
    }
    // Opkomende AI/PDF-bronnen komen nog via Drive. Alleen een ontbrekende bron
    // herlezen; geen herhaalde full-show reads tijdens normale beoordelingen.
    if(operation==='risk-view'&&output?.result.state!=='ready')output=null;
    if(!output){
     handedToDrive=true;const response=await bridge(row,'run',{operation,...canonical});
     if(!response.verified)throw Error('VERIFY');
     await repository.commit(row,response.snapshot);handedToDrive=false;
     if(response.errorCode)throw Error(response.errorCode);
     return{...response.result,homePlanning:publicActivePlanning(response.snapshot,new Date(now()).toISOString())};
    }
    if(JSON.stringify(output.snapshot)===JSON.stringify(row.snapshot)){await repository.release(row);return output.result;}
    const planning=publicActivePlanning(output.snapshot,new Date(now()).toISOString()),result={...output.result,homePlanning:planning};
    await repository.commit(row,output.snapshot,command,result);return result;
   }catch(error){
    // Een verloren Drive-antwoord kan nog een lopende uitvoering betekenen.
    // Dan niet vrijgeven: de lease voorkomt dat een latere write wordt ingehaald.
    if(!handedToDrive)await repository.release(row).catch(()=>{});else await repository.error(row).catch(()=>{});
    throw error;
   }
  },
  async planning(data){
   if(!await enabled())return data;const rows=repository.planningRows?await repository.planningRows():await repository.all(),map=new Map(rows.map(row=>[row.concert_id,row.snapshot?publicActivePlanning(row.snapshot):{completion:row.completion,updatedAt:new Date(row.updated_at).toISOString()}]));
   return{...data,shows:data.shows.map(show=>{const item=map.get(show.key);return item?{...show,snapshot:{completion:item.completion},planningUnavailable:false,planningUpdatedAt:item.updatedAt}:show;})};
  },
  async run({limit=3}={}){
   if(!await enabled())return{enabled:false,mirrored:0,archived:0,failed:0};
   const rows=repository.work?await repository.work():await repository.all();let mirrored=0,archived=0,failed=0;
   for(const candidate of rows.filter(row=>row.external_command||row.pending||Date.parse(archiveAfterShow(row.snapshot.dates))<=now()).slice(0,limit)){
    if(candidate.external_command){
     if(now()-Date.parse(candidate.external_started)<3*60000)continue;
     let current=candidate;if(Date.parse(current.lease_until)<=now())current=await repository.claim(current.concert_id);if(!current)continue;
     try{await recover(current);}catch{failed++;await repository.error(current).catch(()=>{});}continue;
    }

    const due=Date.parse(archiveAfterShow(candidate.snapshot.dates))<=now();
    const row=due?await repository.claim(candidate.concert_id):{...candidate,lease:null,lease_until:new Date(now()+15*60000).toISOString()};if(!row||!due&&candidate.lease)continue;
    try{
     if(due){if(await archive(row))archived++;}
     else{const response=await bridge(row,'sync');if(!response.verified)throw Error('VERIFY');await repository.release(row,{mirrored:true});mirrored++;}
    }catch{failed++;await repository.error(row).catch(()=>{});if(!due)await repository.release(row,{error:true}).catch(()=>{});}

   }
   return{enabled:true,mirrored,archived,failed};
  },
  async verify(){
   const health=repository.health?await repository.health():{schemaReady:true,enabled:await enabled()};
   const catalogue=await drive('list'),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now()));
   const concerts=catalogue.concerts.filter(row=>row.venue==='Gashouder'&&row.date>=today).sort((a,b)=>a.date.localeCompare(b.date));let verifiedShows=0,openReady=false,driveOpenMs=null;
   for(const concert of concerts.slice(0,1)){
    const source=await drive('active-export',{concertId:concert.concertId});if(source.archived)continue;
    const snapshot=validateActiveSnapshot(source.snapshot);
    if(health.enabled){
     const row=await find(concert.concertId);if(!row||row.snapshot.concertId!==snapshot.concertId)throw Error('VERIFY');validateActiveSnapshot(row.snapshot);
     // Alleen lezen, onder de bestaande main/OIDC-workerautoriteit. Technische
     // actor wordt nergens opgeslagen; de virtuele overlay schrijft geen brondata.
     const started=now(),frozen={...row,lease:null,lease_until:new Date(now()+15*60000).toISOString()};
     const opened=await bridge(frozen,'virtual',{operation:'show-open',concertId:row.concert_id,actor:'storage-worker-read'},true);
     if(!opened.verified||opened.errorCode||!opened.result?.profile||!opened.result?.tickets||!opened.result?.risks)throw Error('VERIFY');
     validateActiveSnapshot(opened.snapshot);openReady=true;driveOpenMs=Math.max(0,now()-started);
    }
    verifiedShows++;
   }
   return{...health,verifiedShows,driveBridge:true,openReady,...(openReady?{driveOpenMs}:{})};
  },
  async alerts(){if(!await enabled())return[];return(repository.alertRows?await repository.alertRows():(await repository.all()).filter(row=>row.archive_error)).map(row=>({key:row.concert_id}));},
 };
 return service;
}
