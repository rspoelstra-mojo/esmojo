import {backgroundSaves} from './lib/background-saves.js';
const assessmentQueues=new Set();
export function clearAssessmentSaves(){for(const cancel of [...assessmentQueues])cancel();}
import {productionRiskLevels} from '../shared/barrier-layout.js';
export const assessmentNode=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
export function riskRadioGroup(name,onChange){
  const group=assessmentNode('fieldset','assessment-risk-group'),legend=assessmentNode('legend','','Risicobeoordeling'),scale=assessmentNode('div','analysis-final-scale'),inputs=[];
  group.append(legend);
  for(const level of productionRiskLevels){const label=assessmentNode('label','analysis-final-option assessment-risk-option'),input=assessmentNode('input','');input.type='radio';input.name=name;input.value=level.value;input.required=true;label.style.setProperty('--score-hue',String(level.hue));label.append(input,assessmentNode('span','',level.label));input.onchange=()=>{if(input.checked)onChange(level.value);};scale.append(label);inputs.push(input);}
  group.append(scale);return{element:group,inputs,update(value,disabled){for(const input of inputs){input.checked=input.value===value;input.disabled=disabled;}}};
}
// Alleen tijdelijk geheugen. Na een onzekere write geen vervolgwrites totdat
// de gebruiker bewust de actuele beoordeling opnieuw laadt.
export function createAssessmentQueue({snapshot,send,stored,changed,error,activity=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,info={label:'Beoordeling opslaan',route:globalThis.location?.pathname||'/'}}){
 let preparations=0,running=false,exclusive=false,failed=false,disposed=false,cancelled=false,timer=null,deferred=null,lastSnapshot=JSON.stringify(snapshot());const jobs=[],waiters=[];
 const unwatch=backgroundSaves.watch(()=>!cancelled&&(preparations>0||running||jobs.length>0||timer!==null));
 const settled=()=>{if(!preparations&&!running&&!jobs.length&&!timer){for(const done of waiters.splice(0))done();if(disposed){unwatch();assessmentQueues.delete(cancel);}}};
 const notify=()=>{activity();backgroundSaves.changed();if(!disposed)changed();settled();};
 const cancel=()=>{cancelled=true;failed=true;disposed=true;if(timer)clearTimer(timer);timer=null;deferred=null;for(const job of jobs.splice(0))for(const done of job.done)done(null);unwatch();assessmentQueues.delete(cancel);settled();};assessmentQueues.add(cancel);
 function enqueue(operation,payload,replace=false,done=()=>{}){
  if(failed||cancelled){done(null);return;}const last=jobs.at(-1);
  if(last?.operation===operation&&['draft','edit-text'].includes(operation)){last.payload=payload;last.replace=replace;last.done.push(done);}else jobs.push({operation,payload,replace,done:[done]});
  void pump();notify();
 }
 async function pump(){
  if(running||failed||cancelled)return;running=true;
  try{while(jobs.length&&!failed&&!cancelled){const job=jobs.shift();exclusive=job.operation!=='draft';notify();
   try{const result=await send(job.operation,job.payload);if(!cancelled){stored(result,job.replace,job);if(job.operation!=='draft'&&!timer&&!jobs.some(waiting=>waiting.operation==='draft'))lastSnapshot=JSON.stringify(snapshot());}for(const done of job.done)done(cancelled?null:result);}
   catch(failure){failed=true;if(timer)clearTimer(timer);timer=null;deferred=null;if(!cancelled)backgroundSaves.fail(info);if(!disposed)error(failure.message);for(const done of job.done)done(null);for(const waiting of jobs.splice(0))for(const done of waiting.done)done(null);}
  }}finally{running=false;exclusive=false;notify();}
 }
 function flush(){if(timer)clearTimer(timer);timer=null;const work=deferred;deferred=null;if(work)work();notify();}
 const api={
  get busy(){return preparations>0||running||jobs.length>0||timer!==null;},get exclusive(){return exclusive;},get failed(){return failed;},
  save(force=false){flush();const value=snapshot(),key=JSON.stringify(value);if(failed||cancelled||key===lastSnapshot&&!force)return;lastSnapshot=key;enqueue('draft',{data:structuredClone(value)});},
  later(){if(failed||cancelled)return;if(timer)clearTimer(timer);deferred=()=>{const value=snapshot(),key=JSON.stringify(value);if(key!==lastSnapshot){lastSnapshot=key;enqueue('draft',{data:structuredClone(value)});}};timer=setTimer(flush,600);notify();},
  laterAction(operation,payload){if(failed||cancelled)return;if(timer)clearTimer(timer);deferred=()=>{const value=typeof payload==='function'?payload():payload;if(value)enqueue(operation,value,true);};timer=setTimer(flush,600);notify();},
  action(operation,payload={}){if(failed||cancelled)return Promise.resolve(null);flush();return new Promise(done=>enqueue(operation,payload,true,done));},
  flush,
  hold(){preparations++;notify();let held=true;return()=>{if(held){held=false;preparations--;notify();}};},
  whenSettled(){return api.busy?new Promise(done=>waiters.push(done)):Promise.resolve();},
  dispose(){disposed=true;flush();if(!api.busy){unwatch();assessmentQueues.delete(cancel);return Promise.resolve();}return new Promise(done=>waiters.push(done));},
 };return api;
}
