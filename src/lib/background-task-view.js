// Herbruikbare beheerweergave: alleen start/status; de browser voert geen taakstappen uit.
export function createBackgroundTaskView({container,button,type,request,run=task=>task(),isBusy=()=>false,onMessage=()=>{},pollMs=5000,labels={}}={}){
 let disposed=false,job=null,timer=null,pending=null,starting=false,revision=0;
 const status=document.createElement('p'),restart=document.createElement('button');status.setAttribute('role','status');status.setAttribute('aria-live','polite');restart.type='button';restart.textContent='Opnieuw controleren vanaf het begin';restart.hidden=true;container.append(status,restart);
 const runnable=()=>job&&['queued','running','waiting'].includes(job.status);
 function message(){
  if(!job)return 'Nog geen achtergrondtaak gestart.';
  const counts=labels.metadata?`${job.progress?.current||0} van ${job.total||0} inrichtingsstappen bevestigd.`:`${job.status!=='complete'&&job.total?'Stap '+(job.progress?.current||0)+' van '+job.total+' · ':''}${job.progress?.verifiedRecords||0} records en ${job.progress?.verifiedFiles||0} bestanden gecontroleerd.`;
  if(job.status==='complete'&&labels.metadata)return `${job.title||'Inrichting'} klaar. ${counts} ${labels.completedNote||''}`.trim();
  if(job.status==='complete')return `${job.title||'Achtergrondtaak'} klaar: ${job.total||0} ${labels.unit||'onderdelen'}. ${counts} ${labels.completedNote||''}`.trim();
  if(job.status==='blocked')return `${job.error||job.label||'Taak gestopt voor controle.'} ${counts}${!job.canResume&&!job.canRestart?' Veilig hervatten wordt na de wachttijd automatisch weer beschikbaar.':''}`;
  if(job.status==='waiting')return `${job.error||job.label||'De server wacht en probeert automatisch opnieuw.'} ${counts} Je mag deze pagina sluiten.`;
  return `${job.label||'De server verwerkt de taak.'} ${counts} Je mag deze pagina sluiten; de server gaat zelfstandig verder.`;
 }
 function sync(){
  button.disabled=starting||isBusy()||Boolean(runnable())||Boolean(job?.status==='blocked'&&!job.canResume&&!job.canRestart);
  button.textContent=job?.status==='complete'?(labels.repeat||'Opnieuw controleren'):job?.status==='blocked'?(job.canResume?(labels.resume||'Taak hervatten'):(labels.restart||'Taak opnieuw starten')):runnable()?(labels.running||'Taak loopt op de server'):(labels.start||'Taak starten');
  restart.hidden=job?.status!=='blocked'||!job.canRestart;restart.disabled=starting||isBusy();
 }
 function cancelTimer(){if(timer!==null)clearTimeout(timer);timer=null;}
 function schedule(){cancelTimer();if(!disposed&&(runnable()||job?.status==='blocked'&&!job.canResume&&!job.canRestart)&&document.visibilityState!=='hidden')timer=setTimeout(()=>refresh(),pollMs);}
 async function refresh(){
  if(disposed||document.visibilityState==='hidden')return;if(pending)return pending;
  const observedRevision=revision;pending=Promise.resolve().then(async()=>{try{const result=await request('background-tasks',{method:'POST',body:{operation:'status',type}});if(disposed||observedRevision!==revision)return;job=result.task;status.textContent=message();sync();}catch{if(!disposed&&observedRevision===revision)status.textContent='De actuele taakstatus kon niet worden opgehaald. De server bewaart de voortgang; open de pagina later opnieuw.';}}).finally(()=>{pending=null;schedule();});return pending;
 }
 async function command(operation){
  starting=true;revision++;sync();
  try{const result=await request('background-tasks',{method:'POST',body:{operation,type}});if(disposed)return;job=result.task;status.textContent=message();onMessage(message());schedule();}
  finally{starting=false;if(!disposed)sync();}
 }
 button.onclick=()=>run(()=>command(job?.status==='complete'||job?.status==='blocked'&&!job.canResume?'restart':job?.status==='blocked'?'resume':'start'));
 restart.onclick=()=>run(()=>command('restart'));
 const visible=()=>{if(document.visibilityState==='hidden')cancelTimer();else void refresh();};
 document.addEventListener('visibilitychange',visible);window.addEventListener('focus',visible);void refresh();
 return{sync,dispose(){disposed=true;cancelTimer();document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible);}};
}
