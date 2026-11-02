import './show-profile.css';
import './risk-analysis.css';
import {createBarrierLayoutPage} from './barrier-layout-page.js';
import {createFloorPressurePage} from './floor-pressure-page.js';
import { access } from './auth.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';
import { productionRiskGroups, validateProductionRiskState } from '../shared/production-risks.js';

const node = (tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text !== undefined) el.textContent = text; return el; };
const paths = {
  production: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>',
  operational: '<path d="m12 3 10 18H2L12 3ZM12 9v5m0 3h.01"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
};
const glyph = (name, className) => { const el=node('span',className); el.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`; return el; };
const badge = () => { const el=node('span','analysis-status','AI-concept');el.dataset.status='draft';return el; };

export function createRiskAnalysis(panel, { show, request = body => access('show-risks', { method:'POST', body }), saveSelection = body => access('production-risks', {method:'POST',body}) } = {}) {
  let disposed=false, loaded=false, loadingNow=false, risks=[], state='pending', error='', view='overview';
  let production={revision:0,choices:{}},productionReady=false,saving=false,assessments={},disposeDetail=null;
  function closeDetail(){const cleanup=disposeDetail;disposeDetail=null;return cleanup?.();}
  function backFromAssessment(id){productionReady=false;const pending=closeDetail();overview(null,id);Promise.resolve(pending).then(()=>{if(!disposed&&view==='overview')void load();});}
  const section=node('section','show-profile risk-analysis');panel.append(section);
  const menuLink=document.querySelector('#submenu-navigation [aria-current="page"]');
  const loading=menuLink?createSubmenuLoading(menuLink,panel):null;
  function category(title, icon) {
    const card=node('section','profile-category'),header=node('div','profile-category-header'),intro=node('div','profile-category-intro');
    intro.append(node('h3','',title));header.append(glyph(icon,'profile-category-icon'),intro);card.append(header);
    return {card,header};
  }
  function overview(focusId,productionId) {
    if(disposed)return;
    view='overview';
    section.replaceChildren();
    if(error){
      const message=node('p','profile-message',error);message.setAttribute('role','alert');
      const retry=node('button','secondary-button','Opnieuw laden');retry.type='button';retry.onclick=load;section.append(message,retry);
    }
    const layout=node('div','profile-layout'),categories=node('div','profile-categories');
    const productionCard=category("Productionele risico's",'production');
    for(const group of productionRiskGroups){
      const block=node('section','production-risk-group');block.append(node('h4','production-risk-group-title',group.title));
      for(const entry of group.items){
        const row=node('div','production-risk-row'),frame=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary');button.type='button';button.dataset.productionId=entry.id;
        button.disabled=Boolean(entry.conditional&&(!productionReady||saving||production.choices[entry.id]!==true));
        button.append(node('span','analysis-row-title',entry.title));
        const assessment=assessments[entry.id==='barrier_layout'?'barrier':entry.id==='floor_pressure'?'floor':''];
        if(assessment?.revision){const status=node('span','analysis-status',assessment.completed?'Afgerond':'Concept');status.dataset.status=assessment.completed?'completed':'draft';button.append(status);}
        button.append(glyph('chevron','analysis-chevron'));
        button.onclick=()=>{if(!button.disabled)productionDetail(entry,group);};frame.append(button);row.append(frame);
        if(entry.conditional){
          const choice=node('div','production-risk-choice');choice.setAttribute('role','group');choice.setAttribute('aria-label',`Is ${entry.title} van toepassing?`);
          for(const [value,label]of [[true,'Ja'],[false,'Nee']]){
            const option=node('button','production-risk-option',label);option.type='button';option.dataset.field=entry.id;option.dataset.choice=String(value);option.disabled=!productionReady||saving;
            option.setAttribute('aria-label',`${label}, ${entry.title}`);option.setAttribute('aria-pressed',String(production.choices[entry.id]===value));
            option.onclick=()=>saveChoice(entry.id,value);choice.append(option);
          }
          row.append(choice);
        }
        block.append(row);
      }
      productionCard.card.append(block);
    }
    const operational=category("Operationele risico's",'operational');
    if(loaded)operational.header.append(node('span','profile-category-count',`${risks.length} ${risks.length===1?'risico':"risico's"}`));
    if(!error&&loaded&&!risks.length){
      operational.card.append(node('p','risk-empty',state==='ready'?"Er zijn geen operationele risico's gedefinieerd.":'Nog geen operationele risicoanalyse beschikbaar.'));
    }
    for(const risk of risks){
      const row=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary');button.type='button';button.dataset.riskId=risk.id;
      button.append(node('span','analysis-row-title',risk.title),badge(),glyph('chevron','analysis-chevron'));
      button.onclick=()=>detail(risk);row.append(button);operational.card.append(row);
    }
    categories.append(productionCard.card,operational.card);layout.append(categories);section.append(layout);
    if(focusId) [...section.querySelectorAll('[data-risk-id]')].find(button=>button.dataset.riskId===focusId)?.focus({preventScroll:true});
    if(productionId)[...section.querySelectorAll('[data-production-id]')].find(button=>button.dataset.productionId===productionId)?.focus({preventScroll:true});
  }
  function productionDetail(entry,group){
    if(disposed)return;closeDetail();view='production';section.replaceChildren();
    if(['barrier_layout','floor_pressure'].includes(entry.id)){
      const options={show,onBack:()=>backFromAssessment(entry.id),onBarrier:()=>productionDetail(productionRiskGroups[0].items[0],productionRiskGroups[0])};
      disposeDetail=entry.id==='barrier_layout'?createBarrierLayoutPage(section,options):createFloorPressurePage(section,options);return;
    }
    const back=node('button','profile-back','← Terug naar overzicht');back.type='button';back.onclick=()=>overview(null,entry.id);
    const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro'),title=node('h2','',entry.title);title.tabIndex=-1;
    intro.append(title,node('p','',`Productionele risico's · ${group.title}`));header.append(glyph('production','profile-category-icon'),intro);section.append(back,header);title.focus({preventScroll:true});
    window.scrollTo({top:0,left:window.scrollX,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  function detail(risk) {
    if(disposed)return;
    view='operational';
    section.replaceChildren();
    const back=node('button','profile-back','← Terug naar overzicht');back.type='button';back.onclick=()=>overview(risk.id);
    const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro'),title=node('h2','',risk.title);title.tabIndex=-1;
    intro.append(title,node('p','',"Operationele risico's"));header.append(glyph('operational','profile-category-icon'),intro,badge());
    const content=node('div','analysis-editor-form');
    for(const [label,text]of [['Gedefinieerd risico',risk.description],['Mogelijk gevolg',risk.consequence]]){
      const card=node('section','analysis-editor-card');card.append(node('h3','',label),node('p','risk-definition',text));content.append(card);
    }
    section.append(back,header,content);title.focus({preventScroll:true});
    window.scrollTo({top:0,left:window.scrollX,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  async function saveChoice(field,value){
    if(disposed||!productionReady||saving||production.choices[field]===value)return;
    saving=true;error='';overview();const finish=loading?.start();panel.setAttribute('aria-busy','true');
    try{
      const data=await saveSelection({concertId:show.key,field,value,revision:production.revision});if(disposed)return;
      validateProductionRiskState(data);if(data.choices[field]!==value)throw Error('Unverified choice');production=data;
    }catch{if(!disposed){productionReady=false;error='De keuze is niet bevestigd. Laad de risicoanalyse opnieuw voordat je verdergaat.';}}
    finally{saving=false;finish?.();panel.removeAttribute('aria-busy');if(!disposed&&view==='overview'){overview();if(productionReady)[...section.querySelectorAll('[data-field]')].find(button=>button.dataset.field===field&&button.dataset.choice===String(value))?.focus({preventScroll:true});}}
  }
  async function load() {
    if(disposed||loadingNow||saving)return;
    loadingNow=true;productionReady=false;error='';if(view==='overview')overview();const finish=loading?.start();panel.setAttribute('aria-busy','true');
    try{
      const data=await request({concertId:show.key});if(disposed)return;
      if(!['ready','pending','not-ready'].includes(data.state)||!Array.isArray(data.risks)||data.risks.length>30)throw Error('Invalid response');
      const ids=new Set();
      for(const risk of data.risks){if(!risk||!/^R\d{2}$/.test(risk.id)||ids.has(risk.id)||['title','description','consequence'].some(key=>typeof risk[key]!=='string'||!risk[key].trim()))throw Error('Invalid risk');ids.add(risk.id);}
      validateProductionRiskState(data.production);production=data.production;assessments=data.assessments||{};productionReady=true;state=data.state;risks=data.risks;loaded=true;
    }catch{if(!disposed){loaded=false;risks=[];error='Risicoanalyse laden is niet gelukt. Probeer opnieuw.';}}
    finally{loadingNow=false;finish?.();panel.removeAttribute('aria-busy');if(!disposed&&view==='overview')overview();}
  }
  overview();
  return { activate(){if(!loaded&&!loadingNow)void load();}, dispose(){disposed=true;closeDetail();risks=[];production={revision:0,choices:{}};section.replaceChildren();loading?.dispose();panel.removeAttribute('aria-busy');} };
}
