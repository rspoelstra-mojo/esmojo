import './show-planning.css';
import {showPlanning,planningDate} from './lib/show-planning.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const icons={check:'<path d="m5 12 4 4L19 6"/>',flag:'<path d="M6 21V4m0 0c5-5 7 5 13 0v10c-6 5-8-5-13 0"/>',next:'<path d="M5 4v10a3 3 0 0 0 3 3h12m-4-4 4 4-4 4"/>'};
function icon(name){const el=node('span','planning-icon');el.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;return el;}
export function createShowPlanning(parent,{show,data,now=()=>new Date()}){
  const card=node('section','show-planning');card.setAttribute('aria-label','Planning en deadlines');parent.append(card);let disposed=false;
  function render(){
    if(disposed)return;const model=showPlanning(show,data.planningSnapshot(),now());card.replaceChildren();
    if(!model){card.append(node('p','planning-unavailable','De planning is beschikbaar zodra de concertdatum bekend is.'));return;}
    const timeline=node('div','planning-timeline'),track=node('div','planning-track');
    const marker=node('div','planning-today'),today=node('span','planning-today-label','Vandaag · '+planningDate(model.today));marker.append(today);timeline.append(marker);
    timeline.style.setProperty('--planning-position',String(model.todayPosition/100));
    const list=node('ol','planning-steps');
    model.steps.forEach((step,index)=>{
      const item=node('li','planning-step');item.dataset.state=step.completed?'completed':step.current?'current':'pending';
      if(step.current)item.setAttribute('aria-current','step');
      const date=node('time','planning-date',planningDate(step.date));date.dateTime=step.date;date.title='Deadline: '+new Intl.DateTimeFormat('nl-NL',{dateStyle:'long',timeZone:'UTC'}).format(new Date(step.date+'T12:00:00Z'));
      const point=node('span','planning-point');point.setAttribute('aria-hidden','true');if(step.completed)point.append(icon('check'));else if(step.id==='show')point.append(icon('flag'));else if(step.current)point.append(node('span','planning-dot'));
      const label=node('span','planning-step-title',step.label),badge=node('span','planning-badge',step.badge);if(!step.completed&&step.days<0&&step.id!=='show')badge.dataset.overdue='true';
      item.append(date,point,label,badge);list.append(item);
      if(index<4){const segment=node('span','planning-segment');segment.style.left=(10+20*index)+'%';if(step.completed)segment.dataset.completed='true';track.append(segment);}
    });
    timeline.append(track,list);
    const next=model.next,relative=next.id==='show'?(next.days<0?'voorbij':next.days===0?'vandaag':next.days===1?'morgen':`over ${next.days} dagen`):next.badge.toLocaleLowerCase('nl-NL');
    const footer=node('div','planning-footer');footer.append(icon('next'),node('span','',`${next.days<0&&next.id!=='show'?'Openstaande':'Volgende'} deadline: ${next.label.toLocaleLowerCase('nl-NL')} · ${relative}`));
    card.append(timeline,footer);
  }
  const unsubscribe=data.subscribe(render);render();
  // Ook een pagina die over middernacht open blijft gebruikt de juiste NL-dag.
  const timer=setInterval(render,60000);
  return()=>{disposed=true;unsubscribe();clearInterval(timer);};
}
