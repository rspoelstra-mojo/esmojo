import {randomUUID} from 'node:crypto';
const activeStatuses=['ready','waiting'];
const code=value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(value)?value:'TASK_UNCONFIRMED';
const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const count=value=>Number.isSafeInteger(value)&&value>=0&&value<=2147483647?value:0;
export function publicProgress(value={}){
 const progress=value.progress||{};return{label:text(value.label,600),...(value.error?{error:text(value.error,1600),code:code(value.code)}:{}),total:count(value.total),progress:{phase:/^[a-z0-9_-]{1,60}$/.test(progress.phase||'')?progress.phase:'',current:count(progress.current),verifiedRecords:count(progress.verifiedRecords),verifiedFiles:count(progress.verifiedFiles)}};
}
export function taskView(row,definition,actor,now=Date.now()){
 if(!row)return null;const state=row.state,leased=state.lease&&state.lease.until>now;
 return{type:state.type,title:definition.title,status:leased&&state.status==='ready'?'running':state.status==='ready'?'queued':state.status,...publicProgress(state.public),startedAt:new Date(state.startedAt).toISOString(),updatedAt:new Date(state.updatedAt).toISOString(),nextAttemptAt:new Date(Math.max(state.nextAt,state.uncertain?state.lease?.until||0:0)).toISOString(),canResume:!leased&&state.actor===actor&&state.status==='blocked'&&state.expiresAt>now,canRestart:!leased&&['blocked','complete'].includes(state.status)};
}
export function createBackgroundTasks({store,registry,authorize,now=Date.now,id=randomUUID,leaseMs=900000}={}){
 const definitions=Object.entries(registry);if(!store||typeof store.claimRunner!=='function'||typeof store.releaseRunner!=='function'||!definitions.length||typeof authorize!=='function'||definitions.some(([type,d])=>!/^[a-z][a-z0-9-]{0,79}$/.test(type)||typeof d.step!=='function'||d.idempotent!==true||!Number.isInteger(d.version)))throw Error('TASK_CONFIG');
 const changed=(row,patch)=>({...row.state,...patch,sequence:row.state.sequence+1,updatedAt:now()});
 const fresh=(type,actor,definition)=>({version:1,type,actor,epoch:id(),handlerVersion:definition.version,status:'ready',cursor:null,sequence:0,attempts:0,startedAt:now(),updatedAt:now(),expiresAt:now()+24*3600000,nextAt:now(),lease:null,uncertain:false,public:publicProgress({label:'In de wachtrij; de server start de taak.'})});
 async function control(input,actor){
  if(!input||Array.isArray(input)||Object.keys(input).sort().join(',')!=='operation,type'||!['status','start','resume','restart'].includes(input.operation)||typeof input.type!=='string'||!Object.hasOwn(registry,input.type)||typeof actor!=='string'||!actor)throw Error('VALIDATION');
  const definition=registry[input.type];if(!await authorize(actor,definition))throw Error('FORBIDDEN');
  let row=await store.get(input.type);
  if(input.operation==='status')return{task:taskView(row,definition,actor,now())};
  if(!row){if(input.operation!=='start')throw Error('TASK_NOT_FOUND');row=await store.create(input.type,definition.title,fresh(input.type,actor,definition));return{task:taskView(row,definition,actor,now())};}
  if(input.operation==='start')return{task:taskView(row,definition,actor,now())};
  if(row.state.lease&&row.state.lease.until>now())throw Error('TASK_BUSY');
  if(input.operation==='restart'){
   if(!['blocked','complete'].includes(row.state.status))throw Error('TASK_BUSY');
   row=await store.save(row,{...fresh(input.type,actor,definition),sequence:row.state.sequence+1});
  }else{
   if(row.state.actor!==actor)throw Error('FORBIDDEN');if(row.state.status!=='blocked')return{task:taskView(row,definition,actor,now())};if(row.state.expiresAt<=now())throw Error('TASK_EXPIRED');if(row.state.handlerVersion!==definition.version)throw Error('TASK_VERSION');
   row=await store.save(row,changed(row,{status:'ready',lease:null,uncertain:false,attempts:0,nextAt:now(),public:publicProgress({...row.state.public,error:undefined,code:undefined})}));
  }
  return{task:taskView(row,definition,actor,now())};
 }
 async function run({budgetMs=180000,maxSteps=400}={}){
  const deadline=now()+Math.min(budgetMs,210000),claimed=[],counts={steps:0,completed:0,blocked:0,waiting:0,failed:0};
  // Eén globaal uitvoeringsslot serialiseert ook toekomstige verschillende taaktypen.
  // Zonder bestaande expliciet gestarte taak maken cronrondes geen controlerecord aan.
  const due=[];for(const [type,definition]of definitions){try{const row=await store.get(type);if(row&&activeStatuses.includes(row.state.status)&&(row.state.nextAt<=now()||row.state.expiresAt<=now())&&!(row.state.lease?.until>now()))due.push({row,definition});}catch{counts.failed++;}}
  if(!due.length)return counts;
  const runnerLease={id:id(),until:Math.ceil((now()+leaseMs)/1000)*1000},runner=await store.claimRunner(runnerLease,now());if(!runner)return counts;
  let uncertain=false;
  for(const entry of due){try{
   let {row,definition}=entry;const lease={id:id(),until:Math.ceil((now()+leaseMs)/1000)*1000};row=await store.save(row,changed(row,{lease,uncertain:false}));
   if(row.state.lease?.id===lease.id)claimed.push({row,definition,lease});
  }catch{counts.failed++;}}

  try{
   while(claimed.length&&!uncertain&&counts.steps<maxSteps&&now()<deadline-60000){
    const entry=claimed.shift();let {row,definition,lease}=entry;
    try{
     // Altijd opnieuw lezen: een late oude worker mag nooit een nieuwe generatie voortzetten.
     row=await store.get(row.state.type);if(!row||row.state.epoch!==entry.row.state.epoch||row.state.lease?.id!==lease.id||row.state.lease.until<=now())continue;
     let result,failure;
     try{
      if(row.state.expiresAt<=now())result={status:'blocked',public:{...row.state.public,error:'De taakmachtiging is verlopen. Start opnieuw na controle.',code:'TASK_EXPIRED'}};
      else if(row.state.handlerVersion!==definition.version)result={status:'blocked',public:{...row.state.public,error:'Deze taak gebruikt een oudere uitvoeringsversie. Start opnieuw na controle.',code:'TASK_VERSION'}};
      else if(!await authorize(row.state.actor,definition))result={status:'blocked',public:{...row.state.public,error:'De initiatiefnemer heeft geen actuele beheerder- of moduletoegang meer.',code:'TASK_ACCESS_REVOKED'}};
      else result=await definition.step({cursor:row.state.cursor,actor:row.state.actor,runId:row.state.epoch});
     }catch(error){failure=error;}
     let next;
     if(failure){
      const description=definition.failure?.(failure)||{retryable:false,code:'TASK_UNCONFIRMED',error:'De taak is gestopt voor controle. Er zijn geen brongegevens verwijderd.'},attempts=row.state.attempts+1,retry=description.retryable===true&&attempts<=8,uncertain=description.uncertain===true;
      const requested=Number(description.retryAfterSeconds||0),delay=Math.max(3000,Number.isFinite(requested)&&requested>0?Math.min(24*3600000,Math.ceil(requested*1000)):0,Math.min(300000,3000*2**(attempts-1)));
      next=changed(row,{attempts,status:retry?'waiting':'blocked',nextAt:Math.max(now()+delay,uncertain?lease.until:0),uncertain,public:publicProgress({...row.state.public,...description})});
     }else{
      if(!result||!['ready','waiting','blocked','complete'].includes(result.status)||result.cursor!==undefined&&result.cursor!==null&&(typeof result.cursor!=='string'||result.cursor.length>50000))throw Error('TASK_CONTRACT');
      next=changed(row,{cursor:result.cursor===undefined?row.state.cursor:result.cursor,status:result.status,attempts:0,uncertain:false,nextAt:now()+Math.min(3600000,Math.max(0,result.delayMs||0)),public:publicProgress(result.public)});
     }
     if(['blocked','complete'].includes(next.status)&&!next.uncertain)next.lease=null;
     row=await store.save(row,next);counts.steps++;
     if(row.state.uncertain)uncertain=true;
     if(row.state.status==='complete')counts.completed++;
     else if(row.state.status==='blocked')counts.blocked++;
     else if(row.state.status==='waiting')counts.waiting++;
     if(row.state.lease?.id===lease.id&&row.state.status==='ready')claimed.push({row,definition,lease});
     else if(row.state.lease?.id===lease.id&&!row.state.uncertain)await release(row,lease.id);
    }catch{counts.failed++;uncertain=true; /* Checkpoint ongewijzigd; lease verloopt, idempotente stap kan later opnieuw. */}
   }
  }finally{for(const entry of claimed)try{await release(entry.row,entry.lease.id);}catch{counts.failed++;uncertain=true;}if(!uncertain)try{await store.releaseRunner(runner,runnerLease.id,now());}catch{counts.failed++;}}
  return counts;
 }
 async function release(row,leaseId){const current=await store.get(row.state.type);if(current?.state.epoch===row.state.epoch&&current.state.lease?.id===leaseId&&!current.state.uncertain)await store.save(current,changed(current,{lease:null}));}
 return{control,run};
}
