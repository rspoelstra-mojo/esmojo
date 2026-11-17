import './show-actions.css';
import {showActions} from './lib/show-actions.js';
import {showTargetHref} from '../shared/show-navigation.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const chevron='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
// Actielijst voor de event safety manager: status rechtsboven en maximaal drie to-do's, gesorteerd op de deadline van de planning.
// Iedere to-do is een echte link naar de pagina waar de actie wordt afgerond; een gewone klik opent die in dezelfde sessie (onOpen).
export function createShowActions(block,{show,data,onOpen,now=()=>new Date()}){
  const title=block.querySelector('h2'),header=node('div','show-actions-header'),status=node('span','show-actions-status');
  if(title)header.append(title);header.append(status);block.prepend(header);
  const list=node('ul','show-actions-list'),empty=node('p','show-actions-empty');block.append(list,empty);let disposed=false;
  function render(){
    if(disposed)return;const model=showActions(show,data.planningSnapshot(),now());list.replaceChildren();
    if(!model){status.hidden=true;empty.hidden=false;empty.textContent='De actielijst is beschikbaar zodra de concertdatum bekend is.';return;}
    status.hidden=false;status.textContent=model.label;status.dataset.status=model.status;
    empty.hidden=model.items.length>0;empty.textContent=model.status==='done'?'Alles is afgerond.':'Geen openstaande acties.';
    for(const item of model.items){
      const row=node('li','show-actions-item'),link=node('a','show-action');link.href=showTargetHref(show.key,item.target);link.dataset.actionId=item.id;if(item.overdue)link.dataset.overdue='true';
      const text=node('span','show-action-text'),strong=node('strong','show-action-title',item.title);text.append(strong);if(item.suffix)text.append(document.createTextNode(' '),node('span','show-action-suffix',item.suffix));
      const arrow=node('span','show-action-chevron');arrow.innerHTML=chevron;
      link.append(node('span','show-action-dot'),text,arrow);
      // Nieuw tabblad, toetsenbord en middelklik werken als gewone links; alleen een gewone klik navigeert binnen de open show.
      link.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onOpen?.(item.target);});
      row.append(link);list.append(row);
    }
  }
  const unsubscribe=data.subscribe(render);render();
  // Ook een pagina die over middernacht open blijft gebruikt de juiste Nederlandse dag (deadlines).
  const timer=setInterval(render,60000);
  return()=>{disposed=true;unsubscribe();clearInterval(timer);header.remove();list.remove();empty.remove();};
}
