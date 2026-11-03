import {createProductionChoiceQueue} from './lib/production-choice-saves.js';
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

export function createRiskAnalysis(panel, { show, version=()=>0, requestAccess=access, request = body => requestAccess('show-risks', { method:'POST', body }), choices, saveSelection = body => requestAccess('production-risks', {method:'POST',body}) } = {}) {
  let disposed=false, loaded=false, loadingNow=false, risks=[], state='pending', error='', view='overview';
  let loadedVersion=-1;
  const entranceNotApplicable=show?.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder';
  let production={revision:0,choices:{}},productionReady=false,assessments={},disposeDetail=null;
  const choiceError='De keuzes zijn nog niet bevestigd. Je invoer is behouden. Probeer de opslag opnieuw.';
  const choiceControls=new Map();
  choices ||= createProductionChoiceQueue({save:body=>saveSelection({concertId:show.key,...body}),read:async()=>{const data=await request({concertId:show.key});return data.production;}});
  const unsubscribeChoices=choices.subscribe(()=>{
    if(disposed)return;
    if(choices.server)production=choices.server;
    if(view==='overview'){
      if(choices.failed&&!error){error=choiceError;overview();}
      else updateChoiceControls();
    }
  });
  function updateChoiceControls(){
    for(const [field,control]of choiceControls){
      const pending=choices.pending(field);
      control.button.disabled=!productionReady||pending||production.choices[field]!==true;
      control.group.setAttribute('aria-busy',String(pending));
      control.group.title=pending?'Keuze wordt opgeslagen…':'';
      for(const [value,option]of control.options){option.disabled=!productionReady;option.setAttribute('aria-pressed',String(choices.value(field)===value));}
    }
  }
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
    if(choices.failed&&!error)error=choiceError;
    section.replaceChildren();choiceControls.clear();
    if(error){
      const message=node('p','profile-message',error);message.setAttribute('role','alert');
      const retry=node('button','secondary-button',choices.failed?'Opnieuw proberen':'Opnieuw laden');retry.type='button';retry.onclick=()=>load(false,true);section.append(message,retry);
    }
    const layout=node('div','profile-layout'),categories=node('div','profile-categories'),productionCards=[];
    for(const group of productionRiskGroups){
      const {card}=category(group.title,'production');
      const block=node('div','production-risk-group');
      for(const entry of group.items){
        const row=node('div','production-risk-row'),frame=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary');button.type='button';button.dataset.productionId=entry.id;
        const notApplicable=entry.id==='entrance_process'&&entranceNotApplicable;
        button.disabled=notApplicable||Boolean(entry.conditional&&(!productionReady||choices.pending(entry.id)||production.choices[entry.id]!==true));
        const title=node('span','analysis-row-title',entry.title);
        if(notApplicable)button.dataset.applicability='not-applicable';
        button.append(title);
        if(notApplicable){const status=node('span','analysis-status','NVT bij Gashouder');status.dataset.status='not-applicable';button.append(status);}
        const assessment=assessments[entry.id==='barrier_layout'?'barrier':entry.id==='floor_pressure'?'floor':''];
        if(assessment?.revision){const status=node('span','analysis-status',assessment.completed?'Afgerond':'Concept');status.dataset.status=assessment.completed?'completed':'draft';button.append(status);}
        button.append(glyph('chevron','analysis-chevron'));
        button.onclick=()=>{if(!button.disabled)productionDetail(entry,group);};frame.append(button);row.append(frame);
        if(entry.conditional){
          const choice=node('div','production-risk-choice');choice.setAttribute('role','group');choice.setAttribute('aria-label',`Is ${entry.title} van toepassing?`);
          const options=[];
          for(const [value,label]of [[true,'Ja'],[false,'Nee']]){
            const option=node('button','production-risk-option',label);option.type='button';option.dataset.field=entry.id;option.dataset.choice=String(value);option.disabled=!productionReady;
            option.setAttribute('aria-label',`${label}, ${entry.title}`);option.setAttribute('aria-pressed',String(choices.value(entry.id)===value));
            option.onclick=()=>saveChoice(entry.id,value);choice.append(option);options.push([value,option]);
          }
          row.append(choice);choiceControls.set(entry.id,{button,group:choice,options});
        }
        block.append(row);
      }
      card.append(block);productionCards.push(card);
    }
    const operational=category("Operationele risico's",'operational');
    if(loaded)operational.header.append(node('span','profile-category-count',`${risks.length} ${risks.length===1?'risico':"risico's"}`));
    if(!error&&loaded&&!risks.length){
      operational.card.append(node('p','risk-empty','Operationele risico\'s worden binnen 24 uur beschikbaar nadat het showprofiel is afgerond'));
    }
    for(const risk of risks){
      const row=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary');button.type='button';button.dataset.riskId=risk.id;
      button.append(node('span','analysis-row-title',risk.title),badge(),glyph('chevron','analysis-chevron'));
      button.onclick=()=>detail(risk);row.append(button);operational.card.append(row);
    }
    categories.append(productionCards[0],operational.card,...productionCards.slice(1));layout.append(categories);section.append(layout);updateChoiceControls();
    if(focusId) [...section.querySelectorAll('[data-risk-id]')].find(button=>button.dataset.riskId===focusId)?.focus({preventScroll:true});
    if(productionId)[...section.querySelectorAll('[data-production-id]')].find(button=>button.dataset.productionId===productionId)?.focus({preventScroll:true});
  }
  function productionDetail(entry,group){
    if(disposed||(entry.id==='entrance_process'&&entranceNotApplicable))return;closeDetail();view='production';section.replaceChildren();
    if(['barrier_layout','floor_pressure'].includes(entry.id)){
      const action=entry.id==='barrier_layout'?'barrier-layout':'floor-pressure';
      const options={show,request:body=>requestAccess(action,{method:'POST',body}),onStored:(_record,data)=>{if(data?.overview){production=data.overview.production;assessments=data.overview.assessments;}},onBack:()=>backFromAssessment(entry.id),onBarrier:()=>productionDetail(productionRiskGroups[0].items.find(item=>item.id==='barrier_layout'),productionRiskGroups[0])};
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
  function saveChoice(field,value){
    if(disposed||!productionReady)return;
    choices.enqueue(field,value);
  }
  async function load(strict=false,retryChoices=false) {
    if(disposed||loadingNow)return;
    loadingNow=true;productionReady=false;error='';if(view==='overview')overview();const finish=loading?.start();panel.setAttribute('aria-busy','true');
    try{
      if(choices.busy)await choices.whenSettled();
      if(choices.failed&&retryChoices){await choices.retry();if(choices.failed)throw Error('UNCONFIRMED');}
      if(disposed)return;
      const data=await request({concertId:show.key});if(disposed)return;
      if(!['ready','pending','not-ready'].includes(data.state)||!Array.isArray(data.risks)||data.risks.length>30)throw Error('Invalid response');
      const ids=new Set();
      for(const risk of data.risks){if(!risk||!/^R\d{2}$/.test(risk.id)||ids.has(risk.id)||['title','description','consequence'].some(key=>typeof risk[key]!=='string'||!risk[key].trim()))throw Error('Invalid risk');ids.add(risk.id);}
      validateProductionRiskState(data.production);choices.sync(data.production);production=choices.server;assessments=data.assessments||{};productionReady=true;state=data.state;risks=data.risks;loaded=true;loadedVersion=version();error=choices.failed?choiceError:'';
    }catch{if(!disposed){if(!choices.failed){loaded=false;risks=[];}error=choices.failed?choiceError:'Risicoanalyse laden is niet gelukt. Probeer opnieuw.';}if(strict===true)throw Error(error);}
    finally{loadingNow=false;finish?.();panel.removeAttribute('aria-busy');if(!disposed&&view==='overview')overview();}
  }
  overview();
  return { prepare(){return load(true);}, activate(){if((!loaded||loadedVersion!==version())&&!loadingNow)void load();}, dispose(){disposed=true;unsubscribeChoices();choiceControls.clear();closeDetail();risks=[];production={revision:0,choices:{}};section.replaceChildren();loading?.dispose();panel.removeAttribute('aria-busy');} };
}
