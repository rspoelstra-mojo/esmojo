import './show-planning.css';
import {showPagePlanning,planningDate} from './lib/show-planning.js';
import {showPlanActions} from './lib/show-actions.js';
import {showTargetHref} from '../shared/show-navigation.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const icons={check:'<path d="m5 12 4 4L19 6"/>',flag:'<path d="M6 21V4m0 0c5-5 7 5 13 0v10c-6 5-8-5-13 0"/>',chevron:'<path d="m9 6 6 6-6 6"/>'};
function icon(name,className='planning-icon'){const el=node('span',className);el.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;return el;}
const longDate=date=>new Intl.DateTimeFormat('nl-NL',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
const VISIBLE=3;
// Planning en to-do's in één blok: iedere planningsstap toont eronder de acties die nog openstaan. Een to-do is een echte
// link naar de pagina waar de actie wordt afgerond; een gewone klik opent die binnen de open show (onOpen).
// Alleen presentatie op de bestaande showcontext. Rood is uitsluitend voor "te laat" (tekst), nooit voor balken, iconen of labels.
export function createShowPlanning(parent,{show,data,onOpen,now=()=>new Date()}){
  const card=node('section','show-planning');card.setAttribute('aria-label','Planning en acties');parent.append(card);let disposed=false;const expanded=new Set();
  function action(item){
    const row=node('li','planning-action'),link=node('a','planning-action-link');link.href=showTargetHref(show.key,item.target);link.dataset.actionId=item.id;if(item.overdue)link.dataset.overdue='true';
    const text=node('span','planning-action-text'),title=node('strong','planning-action-title',item.title);text.append(title);
    if(item.suffix)text.append(document.createTextNode(' '),node('span','planning-action-suffix',item.suffix));
    link.append(text,icon('chevron','planning-action-chevron'));
    // Nieuw tabblad, toetsenbord en middelklik werken als gewone links; alleen een gewone klik navigeert binnen de open show.
    link.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onOpen?.(item.target);});
    row.append(link);return row;
  }
  function actions(step,items){
    if(!items.length||step.completed)return null;
    const list=node('ul','planning-actions'),open=expanded.has(step.id),shown=open?items:items.slice(0,VISIBLE);
    for(const item of shown)list.append(action(item));
    if(items.length>VISIBLE){
      const li=node('li','planning-actions-more'),toggle=node('button','planning-actions-toggle',open?'Minder tonen':`Toon alle ${items.length}`);toggle.type='button';toggle.setAttribute('aria-expanded',String(open));
      toggle.addEventListener('click',()=>{if(open)expanded.delete(step.id);else expanded.add(step.id);render();});li.append(toggle);list.append(li);
    }
    return list;
  }
  function row(item,index,items){
    const li=node('li','planning-step');li.dataset.state=item.state;li.dataset.kind=item.kind;if(item.state==='current'||item.state==='overdue'&&item.first)li.setAttribute('aria-current','step');
    const point=node('span','planning-point');point.setAttribute('aria-hidden','true');
    if(item.state==='completed')point.append(icon('check'));else if(item.kind==='show')point.append(icon('flag'));else point.append(node('span','planning-number',String(index+1)));
    const body=node('span','planning-step-body'),title=node('span','planning-step-title',item.label),date=node('time','planning-date',(item.kind==='show'?'':'Uiterlijk ')+planningDate(item.date));date.dateTime=item.date;date.title=longDate(item.date);
    body.append(title,date);const badge=node('span','planning-badge',item.badge);if(item.state==='overdue')badge.dataset.overdue='true';
    li.append(point,body,badge);const list=item.kind==='step'?actions(item,items):null;if(list)li.append(list);return li;
  }
  function render(){
    if(disposed)return;const snapshot=data.planningSnapshot(),model=showPagePlanning(show,snapshot,now()),plan=showPlanActions(show,snapshot,now());card.replaceChildren();
    const header=node('div','planning-header');header.append(node('h2','planning-title','Planning'));
    if(!model){card.append(header,node('p','planning-unavailable','De planning is beschikbaar zodra de concertdatum bekend is.'));return;}
    const status=node('span','planning-status',plan?.label||(model.allDone?'Afgerond':'Op schema'));status.dataset.status=plan?.status||(model.allDone?'done':'on-track');header.append(status);
    const summary=node('p','planning-summary',model.allDone?'Alles afgerond':`${model.done} van ${model.total} afgerond`);summary.dataset.complete=String(model.allDone);
    const bar=node('div','planning-progress');bar.setAttribute('role','img');bar.setAttribute('aria-label',`${model.done} van ${model.total} stappen afgerond`);
    for(const step of model.steps){const part=node('span','planning-progress-part');part.dataset.state=step.state==='overdue'?'pending':step.state;bar.append(part);}
    const items=[...model.steps.map(step=>({...step,kind:'step'})),{kind:'show',label:model.show.label,date:model.show.date,badge:model.show.badge,state:'pending'}];
    const firstOpen=items.findIndex(item=>item.kind==='step'&&!item.completed);if(firstOpen>=0)items[firstOpen].first=true;
    // Vandaag staat op de plek in de tijdlijn waar we nu zijn.
    const list=node('ol','planning-steps');let placed=false;
    const marker=()=>{const li=node('li','planning-today-row');li.setAttribute('aria-label','Vandaag');li.append(node('span','planning-today-label','Vandaag · '+planningDate(model.today)));return li;};
    items.forEach((item,index)=>{if(!placed&&item.date>=model.today){list.append(marker());placed=true;}list.append(row(item,index,plan?.groups?.[item.id]||[]));});
    if(!placed)list.append(marker());
    card.append(header,summary,bar,list);
  }
  const unsubscribe=data.subscribe(render);render();
  // Ook een pagina die over middernacht open blijft gebruikt de juiste NL-dag.
  const timer=setInterval(render,60000);
  return()=>{disposed=true;unsubscribe();clearInterval(timer);card.remove();};
}
