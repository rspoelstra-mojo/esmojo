import './show-profile.css';
import {createMeasureImplementationPage} from './measure-implementation-page.js';
import './show-measures.css';
import {showMeasures} from './lib/show-planning.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const icon=(kind)=>{const el=node('span',kind==='chevron'?'analysis-chevron':'profile-category-icon');el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(kind==='chevron'?'<path d="m9 6 6 6-6 6"/>':'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>')+'</svg>';return el;};
function status(row){const badge=node('span','analysis-status',row.implemented?'Geïmplementeerd':'Nog te implementeren');badge.dataset.status=row.implemented?'completed':'pending';return badge;}
export function createShowMeasures(panel,{show,data,readOnly=false}){
 const root=node('section','show-profile show-measures');panel.append(root);let disposed=false,selected=null,detail=null;
 function render(){
  if(disposed)return;const model=showMeasures(show,data.planningSnapshot()),row=model.rows.find(row=>row.id===selected);if(!row||!detail)root.replaceChildren();
  if(row){if(detail){detail.sync(row);return;}detail=createMeasureImplementationPage(root,{show,data,row,readOnly,onBack:()=>{detail?.dispose();detail=null;selected=null;render();}});return;}
  detail?.dispose();detail=null;
  selected=null;const card=node('section','profile-category'),header=node('div','profile-category-header'),intro=node('div','profile-category-intro');intro.append(node('h3','','Beheersmaatregelen'));header.append(icon(),intro,node('span','profile-category-count',String(model.rows.length)));card.append(header);
  if(!model.rows.length)card.append(node('p','measure-empty',model.complete?'Geen beheersmaatregelen voor deze show':'Nog geen beheersmaatregelen ingevuld. De risicobeoordelingen zijn nog niet volledig afgerond.'));
  for(const measure of model.rows){
   const frame=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary measure-summary');button.type='button';button.dataset.measureId=measure.id;button.disabled=Boolean(data.measureDrafts?.get(measure.id)?.finishing);
   const label=node('span','measure-summary-text');label.append(node('span','measure-text',measure.text),node('span','measure-origin',measure.origin));button.append(label,status(measure),icon('chevron'));button.onclick=()=>{selected=measure.id;render();const title=root.querySelector('h2');title?.setAttribute('tabindex','-1');title?.focus({preventScroll:true});};frame.append(button);card.append(frame);
  }
  root.append(card);
 }
 const unsubscribe=data.subscribe(render);render();return()=>{disposed=true;unsubscribe();detail?.dispose();detail=null;root.replaceChildren();};
}
