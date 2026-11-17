import './show-planning.css';
import {showPagePlanning,planningDate} from './lib/show-planning.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const icons={check:'<path d="m5 12 4 4L19 6"/>',flag:'<path d="M6 21V4m0 0c5-5 7 5 13 0v10c-6 5-8-5-13 0"/>',alert:'<path d="M12 7v6m0 4h.01"/>'};
function icon(name){const el=node('span','planning-icon');el.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;return el;}
const longDate=date=>new Intl.DateTimeFormat('nl-NL',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
// Planning op de showpagina: drie stappen vanaf de eerste concertdatum, met status en voortgang.
export function createShowPlanning(parent,{show,data,now=()=>new Date()}){
  const card=node('section','show-planning');card.setAttribute('aria-label','Planning en deadlines');parent.append(card);let disposed=false;
  function row(item,index){
    const li=node('li','planning-step');li.dataset.state=item.state;li.dataset.kind=item.kind;if(item.state==='current'||item.state==='overdue'&&item.first)li.setAttribute('aria-current','step');
    const point=node('span','planning-point');point.setAttribute('aria-hidden','true');
    if(item.state==='completed')point.append(icon('check'));else if(item.kind==='show')point.append(icon('flag'));else if(item.state==='overdue')point.append(icon('alert'));else point.append(node('span','planning-number',String(index+1)));
    const body=node('span','planning-step-body'),title=node('span','planning-step-title',item.label),date=node('time','planning-date',(item.kind==='show'?'':'Uiterlijk ')+planningDate(item.date));date.dateTime=item.date;date.title=longDate(item.date);
    body.append(title,date);const badge=node('span','planning-badge',item.badge);if(item.state==='overdue')badge.dataset.overdue='true';
    li.append(point,body,badge);return li;
  }
  function render(){
    if(disposed)return;const model=showPagePlanning(show,data.planningSnapshot(),now());card.replaceChildren();
    const header=node('div','planning-header');header.append(node('h2','planning-title','Planning'));
    if(!model){card.append(header,node('p','planning-unavailable','De planning is beschikbaar zodra de concertdatum bekend is.'));return;}
    const summary=node('span','planning-summary',model.allDone?'Alles afgerond':`${model.done} van ${model.total} afgerond`);summary.dataset.complete=String(model.allDone);header.append(summary);
    const bar=node('div','planning-progress');bar.setAttribute('role','img');bar.setAttribute('aria-label',`${model.done} van ${model.total} stappen afgerond`);
    for(const step of model.steps){const part=node('span','planning-progress-part');part.dataset.state=step.state;bar.append(part);}
    const items=[...model.steps.map(step=>({...step,kind:'step'})),{kind:'show',label:model.show.label,date:model.show.date,badge:model.show.badge,state:'pending'}];
    const firstOpen=items.findIndex(item=>item.kind==='step'&&!item.completed);if(firstOpen>=0)items[firstOpen].first=true;
    // Vandaag staat op de plek in de tijdlijn waar we nu zijn.
    const list=node('ol','planning-steps');let placed=false;
    const marker=()=>{const li=node('li','planning-today-row');li.setAttribute('aria-label','Vandaag');li.append(node('span','planning-today-label','Vandaag · '+planningDate(model.today)));return li;};
    items.forEach((item,index)=>{if(!placed&&item.date>=model.today){list.append(marker());placed=true;}list.append(row(item,index));});
    if(!placed)list.append(marker());
    card.append(header,bar,list);
  }
  const unsubscribe=data.subscribe(render);render();
  // Ook een pagina die over middernacht open blijft gebruikt de juiste NL-dag.
  const timer=setInterval(render,60000);
  return()=>{disposed=true;unsubscribe();clearInterval(timer);};
}
