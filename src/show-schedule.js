import './show-schedule.css';
import {visibleScheduleDays,scheduleDayLabel,scheduleUpdatedLabel} from './lib/show-schedule.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
// Beknopt voorlopig MOJO-tijdschema in het blok Tijdschema: tekst links, tijd rechts. Dagelijks vernieuwd door de 05:00-import;
// de server geeft altijd de meest recente beschikbare versie. Geen laadtekst; alleen na het tonen van het tabblad opgehaald.
export function createShowSchedule(block,{show,request,now=()=>new Date(),refreshAfter=10*60*1000}={}){
  const body=node('div','show-schedule-body');body.hidden=true;block.append(body);
  const controller=new AbortController();let disposed=false,loading=false,loadedAt=0,failed=false;
  function render(data){
    body.replaceChildren();const days=visibleScheduleDays(data,now());
    if(!days.length){body.append(node('p','show-schedule-empty','Nog geen tijdschema gepubliceerd.'));body.hidden=false;return;}
    for(const day of days){
      const section=node('div','show-schedule-day');
      if(days.length>1)section.append(node('h3','show-schedule-date',scheduleDayLabel(day.date)));
      const list=node('dl','show-schedule-list');
      for(const entry of day.entries){const row=node('div','show-schedule-row');row.dataset.kind=entry.kind||'act';row.append(node('dt','',entry.label),node('dd','',entry.time));list.append(row);}
      section.append(list);body.append(section);
    }
    const newest=days.map(day=>day.capturedAt).filter(Boolean).sort().at(-1),label=newest?scheduleUpdatedLabel(newest):'';
    if(label)body.append(node('p','show-schedule-updated',label));body.hidden=false;
  }
  async function load(){
    if(loading||disposed)return;loading=true;
    try{const data=await request('show-timetable',{method:'POST',body:{concertId:show.key},signal:controller.signal});if(disposed)return;failed=false;loadedAt=Date.now();render(data);}
    catch{if(disposed)return;failed=true;if(body.hidden){body.replaceChildren(node('p','show-schedule-empty','Het tijdschema kon niet worden geladen.'));body.hidden=false;}}
    finally{loading=false;}
  }
  return{
    // Herhaald aanroepen is veilig: pas opnieuw ophalen na een tijdje of na een eerdere fout.
    start(){if(disposed)return;if(!loadedAt||failed||Date.now()-loadedAt>refreshAfter)void load();},
    dispose(){disposed=true;controller.abort();body.remove();},
    body,
  };
}
