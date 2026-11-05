import './show-profile.css';
import './show-measures.css';
import {showMeasures} from './lib/show-planning.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const icon=(kind)=>{const el=node('span',kind==='chevron'?'analysis-chevron':'profile-category-icon');el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(kind==='chevron'?'<path d="m9 6 6 6-6 6"/>':'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>')+'</svg>';return el;};
function status(row){const badge=node('span','analysis-status',row.implemented?'Geïmplementeerd':'Nog niet geïmplementeerd');badge.dataset.status=row.implemented?'completed':'pending';return badge;}
export function createShowMeasures(panel,{show,data}){
 const root=node('section','show-profile show-measures');panel.append(root);let disposed=false,selected=null;
 function render(){
  if(disposed)return;const model=showMeasures(show,data.planningSnapshot()),row=model.rows.find(row=>row.id===selected);root.replaceChildren();
  if(row){
   const back=node('button','profile-back','← Terug naar overzicht');back.type='button';back.onclick=()=>{selected=null;render();};
   const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro');intro.append(node('h2','',row.title),node('p','',row.origin));header.append(icon(),intro,status(row));
   const card=node('section','analysis-editor-card');card.append(node('h3','','Beheersmaatregel'),node('p','measure-text',row.text));root.append(back,header,card);return;
  }
  selected=null;const card=node('section','profile-category'),header=node('div','profile-category-header'),intro=node('div','profile-category-intro');intro.append(node('h3','','Beheersmaatregelen'));header.append(icon(),intro,node('span','profile-category-count',String(model.rows.length)));card.append(header);
  if(!model.rows.length)card.append(node('p','measure-empty',model.complete?'Geen beheersmaatregelen voor deze show':'Nog geen beheersmaatregelen ingevuld. De risicobeoordelingen zijn nog niet volledig afgerond.'));
  for(const measure of model.rows){
   const frame=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary measure-summary');button.type='button';button.dataset.measureId=measure.id;
   const label=node('span','measure-summary-text');label.append(node('span','measure-text',measure.text),node('span','measure-origin',measure.origin));button.append(label,status(measure),icon('chevron'));button.onclick=()=>{selected=measure.id;render();const title=root.querySelector('h2');title?.setAttribute('tabindex','-1');title?.focus({preventScroll:true});};frame.append(button);card.append(frame);
  }
  root.append(card);
 }
 const unsubscribe=data.subscribe(render);render();return()=>{disposed=true;unsubscribe();root.replaceChildren();};
}
