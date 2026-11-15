import {pathToFileURL} from 'node:url';
const endpoints={tasks:'https://esmojo.nl/api/background-tasks-sync',validation:'https://esmojo.nl/api/shows-validation-sync','reports-validation':'https://esmojo.nl/api/reports-validation-sync','reports-cutover':'https://esmojo.nl/api/reports-cutover-sync'};
const keys=['steps','completed','blocked','waiting','failed'];
// Eén workflow houdt meerdere korte serverrondes gaande. De server blijft
// eigenaar van machtiging, checkpoints, leases, Retry-After en conflictstops.
export async function continueTasks({env=process.env,fetcher=fetch,now=Date.now,log=console.log,budgetMs=40*60000,maxRounds=160,mode='tasks',operation='continue',resumeReportsTechnical=false,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const endpoint=endpoints[mode];if(!endpoint||!['continue','status','reports-check','reports-resume'].includes(operation)||operation!=='continue'&&mode!=='tasks')throw Error('Onbekende vaste worker.');
 const deadline=now()+Math.min(budgetMs,40*60000);
 for(let round=1;round<=maxRounds&&now()+280000<=deadline;round++){
  let response,data,transportStage='identity';
  try{
   const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
   const identity=await fetcher(url,{headers:{Authorization:`Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(30000)});
   if(!identity.ok)throw Error();const {value}=await identity.json();if(typeof value!=='string'||!value)throw Error();log(`::add-mask::${value}`);
   transportStage='request';
   response=await fetcher(endpoint,{method:'POST',headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json'},body:mode==='reports-validation'&&resumeReportsTechnical&&round===1?JSON.stringify({operation:'resume-technical'}):operation!=='continue'&&!(operation==='reports-resume'&&round>1)?JSON.stringify({operation}):'{}',signal:AbortSignal.timeout(280000)});
   transportStage='response';
   data=await response.json();
   if(mode==='reports-validation'&&!response.ok){
    const codes=['OIDC_FORBIDDEN','REPORTS_VALIDATION_BLOCKED','REPORTS_VALIDATION_UNCONFIRMED','VALIDATION_APPROVAL_REQUIRED','TASK_EXPIRED','TASK_CORRUPT','TASK_BUSY','FORBIDDEN','CHOICE_AUTH','CHOICE_FORBIDDEN','SETUP_TEMPORARY','SETUP_THROTTLED'];
    log(JSON.stringify({validationHttpStatus:Number.isInteger(response.status)?response.status:0,code:codes.includes(data?.code)?data.code:'UNCONFIRMED',stage:['identity','token','claims','issuer','audience','subject','repository','ref','workflow','jwks','signature','approval','running','status'].includes(data?.stage)?data.stage:'unknown'}));
   }
  }catch{if(mode==='reports-validation')log(JSON.stringify({validationHttpStatus:Number.isInteger(response?.status)?response.status:0,code:'TRANSPORT_UNCONFIRMED',stage:transportStage}));throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');}
  if(operation==='reports-check'){
   const d=data?.diagnostic;if(!response.ok||data?.ok!==true||!d||!/^[a-z-]{1,40}$/.test(d.stage)||!(d.code===null||/^[A-Z][A-Z0-9_]{0,63}$/.test(d.code))||!d.counts||Object.values(d.counts).some(v=>!Number.isSafeInteger(v)||v<0))throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');
   const allowed=['groups','multiDateGroups','missingShow','badGroupId','badSourceHash','catalogue','historical','validations','sources','available','unlinked','entries','grouped','manifestPages','settingsPages','csvBytes','plannedRecords','recordIndex','existingRecords','missingRecords','batchRecords'];
   log(JSON.stringify({stage:d.stage,code:d.code,counts:Object.fromEntries(allowed.filter(k=>Object.hasOwn(d.counts,k)).map(k=>[k,d.counts[k]]))}));return;
  }
  const continuation=data?.continuation;
  if(continuation!==undefined){
   if(!continuation||typeof continuation.active!=='boolean'||!Array.isArray(continuation.tasks)||continuation.active&&(!Number.isSafeInteger(continuation.pollAfterMs)||continuation.pollAfterMs<1000||continuation.pollAfterMs>60000))throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');
   for(const task of continuation.tasks){
    if(!task||!/^[a-z][a-z0-9-]{0,79}$/.test(task.type)||!['queued','running','waiting','blocked','complete'].includes(task.status)||!['current','total'].every(k=>Number.isSafeInteger(task[k])&&task[k]>=0)||['verifiedRecords','verifiedFiles'].some(k=>task[k]!==undefined&&(!Number.isSafeInteger(task[k])||task[k]<0))||!['updatedAt','nextAt','authorizationExpiresAt'].every(k=>Number.isSafeInteger(task[k])&&task[k]>=0)||!(task.leaseUntil===null||Number.isSafeInteger(task.leaseUntil)&&task.leaseUntil>=0)||!/^[a-z0-9_-]{0,60}$/.test(task.phase)||!(task.code===null||/^[A-Z][A-Z0-9_]{0,63}$/.test(task.code)))throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');
    log(JSON.stringify(Object.fromEntries(['type','status','phase','current','total','verifiedRecords','verifiedFiles','updatedAt','nextAt','leaseUntil','authorizationExpiresAt','code'].map(k=>[k,task[k]]))));
   }
  }
  if(operation==='status'){if(!response.ok||data?.ok!==true||!continuation)throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');return;}
  if(operation==='reports-resume'&&round===1){if(!response.ok||data?.ok!==true||!continuation)throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');if(!continuation.active)return;await wait(continuation.pollAfterMs);continue;}
  const stats=data?.stats;
  if(!response.ok||data?.ok!==true||!stats||keys.some(key=>!Number.isSafeInteger(stats[key])||stats[key]<0))throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');
  log(JSON.stringify({round,...Object.fromEntries(keys.map(key=>[key,stats[key]]))}));
  if(['validation','reports-validation','reports-cutover'].includes(mode)&&data.verification){const v=data.verification,subject=mode==='validation'?'shows':'reports';if([subject,'records','files'].some(k=>!Number.isSafeInteger(v[k])||v[k]<0))throw Error('Eindvalidatie niet bevestigd.');log(JSON.stringify({[subject==='shows'?'verifiedShows':'verifiedReports']:v[subject],verifiedRecords:v.records,verifiedFiles:v.files}));}
  if(['validation','reports-validation','reports-cutover'].includes(mode)&&stats.blocked)throw Error('Eindvalidatie gestopt voor controle; raadpleeg de beheerpagina.');
  if(stats.failed)throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');
  if(continuation&&['tasks','reports-validation','reports-cutover'].includes(mode)){
   // The server still decides what is due and enforces Retry-After, leases,
   // delegation and current permissions. Waiting here never holds a Vercel call.
   if(!continuation.active)return;
   if(now()+continuation.pollAfterMs+280000>deadline)break;
   await wait(continuation.pollAfterMs);
  }else if(stats.completed||stats.blocked||stats.waiting||!stats.steps)return;
 }
 log('Begrensde uitvoering afgerond; opgeslagen taken blijven beschikbaar voor de volgende ronde.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await continueTasks({mode:process.argv.includes('--reports-cutover')?'reports-cutover':process.argv.includes('--reports-validation')?'reports-validation':process.argv.includes('--shows-validation')?'validation':'tasks',operation:process.env.BACKGROUND_TASK_OPERATION||'continue',resumeReportsTechnical:process.env.REPORTS_VALIDATION_RESUME_TECHNICAL==='1'});}catch{console.error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');process.exitCode=1;}
}
