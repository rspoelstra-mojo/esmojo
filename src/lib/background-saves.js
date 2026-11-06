// Uitsluitend sessiegeheugen; geen inhoud, tokens of formulierwaarden in browseropslag.
export const SAVE_EXIT_MESSAGE='ESMOJO is nog gegevens aan het verwerken, weet je zeker dat je wilt afsluiten?';
export function createSaveActivity(){
 let epoch=0,next=0;const tasks=new Map(),sources=new Set(),listeners=new Set(),forms=new Map();
 const changed=()=>{for(const listener of listeners){try{listener();}catch{/* Een melding mag de opslag niet stoppen. */}}};
 const api={
  changed,get session(){return epoch;},
  get pending(){return [...tasks.values()].some(task=>task.state==='pending')||[...sources].some(source=>{try{return source();}catch{return false;}});},
  get failures(){return [...tasks.values()].filter(task=>task.state==='failed');},
  get unconfirmed(){return api.pending||api.failures.length>0;},
  watch(source){sources.add(source);changed();return()=>{sources.delete(source);changed();};},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  form(key,initial=()=>({})){if(!forms.has(key))forms.set(key,initial());return forms.get(key);},
  fail(info={}){const route=info.route||globalThis.location?.pathname||'/',label=info.label||'Gegevens opslaan',key=info.key||label+'|'+route;if(!api.failures.some(task=>task.key===key)){tasks.set(++next,{id:next,label,route,key,state:'failed'});changed();}},
  dismiss(id){tasks.delete(id);changed();},
  track(run,{label='Gegevens opslaan',route=globalThis.location?.pathname+ (globalThis.location?.search||''),key=label+'|'+route}={}){
   const id=++next,session=epoch;const task={id,label,key,route:typeof route==='string'&&route.startsWith('/')&&!route.startsWith('//')?route:'/',state:'pending'};tasks.set(id,task);changed();
   let result;try{result=run();}catch(error){result=Promise.reject(error);}
   return Promise.resolve(result).then(value=>{if(session===epoch){tasks.delete(id);for(const failed of api.failures)if(failed.key===key)tasks.delete(failed.id);changed();}return value;},error=>{if(session===epoch){task.state='failed';changed();}throw error;});
  },
  clear(){epoch++;tasks.clear();forms.clear();sources.clear();changed();},
 };return api;
}
export const backgroundSaves=createSaveActivity();
export function isSaveRequest(action,{method='GET',body={}}={}){
 if(!['POST','PATCH','PUT','DELETE'].includes(method)||['session','restore','remember','forget','complete','show-open','show-photo','show-risks','report-web','reports','home-metadata','fluid-preview'].includes(action))return false;
 return !['read','status','download','reserve','renew','release'].includes(body?.operation);
}
export function saveRequestInfo(action,body={}){
 const labels={'barrier-layout':'Barrieropstelling opslaan','floor-pressure':'Vloerdruk opslaan',measure:'Beheersmaatregel opslaan','operational-risk':'Operationeel risico opslaan','show-profile':'Showprofiel opslaan','analysis-finalization':'Analyse afronden','ticket-data':'Bezoekersgegevens opslaan',accounts:'Account opslaan',photo:'Profielfoto opslaan',ontrack:'OnTrack-instellingen opslaan',email:'Testmail versturen','ontrack-report':'Rapportageactie verwerken','production-risks':'Productioneel risico opslaan'};
 const tab=action==='measure'?'maatregelen':['operational-risk','production-risks','barrier-layout','floor-pressure'].includes(action)?'risicoanalyse':'showprofiel';
 return{key:action+'|'+(body.concertId||'')+'|'+(body.measureId||body.riskId||body.field||body.questionNumber||body.category||body.id||'default'),label:labels[action]||'Gegevens opslaan',route:action==='accounts'?'/beheerder/accounts':action==='photo'?'/account':action==='ontrack'||action==='ontrack-report'?'/beheerder/ontrack':action==='email'?'/beheerder/email':body.concertId?'/shows/'+encodeURIComponent(body.concertId)+'?tab='+tab:globalThis.location?.pathname||'/'};
}
export function installSaveExitWarning(win=window,activity=backgroundSaves){
 const handler=event=>{if(activity.unconfirmed){event.preventDefault();event.returnValue=SAVE_EXIT_MESSAGE;return SAVE_EXIT_MESSAGE;}};
 win.addEventListener('beforeunload',handler);return()=>win.removeEventListener('beforeunload',handler);
}
