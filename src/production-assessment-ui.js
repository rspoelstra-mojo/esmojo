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
export function createAssessmentQueue({snapshot,send,stored,changed,error}){
  let pending=null,running=false,exclusive=false,failed=false,timer=null,disposed=false,cancelled=false,waiters=[],lastSnapshot=JSON.stringify(snapshot());
  const cancel=()=>{cancelled=true;failed=true;disposed=true;pending=null;if(timer)clearTimeout(timer);timer=null;assessmentQueues.delete(cancel);for(const done of waiters)done();waiters=[];};assessmentQueues.add(cancel);
  const notify=()=>{if(!disposed)changed();if(disposed&&!running){assessmentQueues.delete(cancel);for(const done of waiters)done();waiters=[];}};
  async function pump(){
    if(running||failed)return;
    running=true;notify();
    try{while(pending&&!failed){const data=pending;pending=null;const result=await send('draft',{data});if(!cancelled)stored(result,false);}}
    catch(failure){failed=true;if(!disposed)error(failure.message);}
    finally{running=false;notify();}
  }
  const queue=(force=false)=>{if(failed)return;const value=snapshot(),key=JSON.stringify(value);if(key===lastSnapshot&&!force){notify();return;}lastSnapshot=key;pending=structuredClone(value);void pump();};
  return{
    get busy(){return running||pending!==null||timer!==null;},get exclusive(){return exclusive;},get failed(){return failed;},
    save(force=false){if(timer){clearTimeout(timer);timer=null;}queue(force);},
    later(){if(failed)return;if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;queue();},600);notify();},
    async action(operation,payload={}){
      if(running||pending||timer||failed)return null;running=true;exclusive=true;notify();
      try{const result=await send(operation,payload);if(!cancelled){stored(result,true);lastSnapshot=JSON.stringify(snapshot());}return result;}
      catch(failure){failed=true;if(!disposed)error(failure.message);return null;}
      finally{running=false;exclusive=false;notify();}
    },
    dispose(){if(cancelled)return Promise.resolve();if(timer){clearTimeout(timer);timer=null;const value=snapshot();if(JSON.stringify(value)!==lastSnapshot)pending=structuredClone(value);}disposed=true;if(!running&&pending&&!failed)void pump();if(!running)assessmentQueues.delete(cancel);return running?new Promise(done=>waiters.push(done)):Promise.resolve();},
  };
}
