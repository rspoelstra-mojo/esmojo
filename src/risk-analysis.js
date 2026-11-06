import {createOperationalReviewMemory} from './lib/operational-review-memory.js';
import {createProductionChoiceQueue} from './lib/production-choice-saves.js';
import './show-profile.css';
import './risk-analysis.css';
import './production-assessment.css';
import {createRiskReviewCard} from './risk-review-card.js';
import {operationalRiskLabels,validateOperationalReview} from '../shared/operational-risk.js';
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
const badge = record => { const el=node('span','analysis-status',operationalRiskLabels[record?.riskLevel]||'Nog te beoordelen');el.dataset.status=record?.riskLevel||'unreviewed';return el; };

export function createRiskAnalysis(panel, { show, readOnly=false, version=()=>0, requestAccess=access, request = body => requestAccess('show-risks', { method:'POST', body }), choices, reviewMemory, saveSelection = body => requestAccess('production-risks', {method:'POST',body}) } = {}) {
  let disposed=false, loaded=false, loadingNow=false, risks=[], state='pending', error='', view='overview';
  let loadedVersion=-1,operational=null,activeRisk=null;
  const ownsReviews=!reviewMemory;reviewMemory ||= createOperationalReviewMemory();
  const reviewDrafts=reviewMemory.drafts;let refreshOperational=()=>{};
  const unsubscribeReviews=reviewMemory.subscribe(()=>{if(disposed)return;if(view==='overview')overview();else if(view==='operational')refreshOperational();});
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
    const operationalCard=category("Operationele risico's",'operational');
    if(loaded)operationalCard.header.append(node('span','profile-category-count',`${risks.length} ${risks.length===1?'risico':"risico's"}`));
    if(!error&&loaded&&!risks.length){
      operationalCard.card.append(node('p','risk-empty','Operationele risico\'s worden binnen 24 uur beschikbaar nadat het showprofiel is afgerond'));
    }
    for(const risk of risks){
      const row=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary');button.type='button';button.dataset.riskId=risk.id;
      button.append(node('span','analysis-row-title',risk.title),badge(reviewDrafts.get(risk.id)?.busy?{riskLevel:reviewDrafts.get(risk.id).riskLevel}:operational?.assessments?.[risk.id]),glyph('chevron','analysis-chevron'));
      button.onclick=()=>detail(risk);row.append(button);
      if(reviewDrafts.get(risk.id)?.error){const notice=node('p','operational-save-error','Opslaan is niet gelukt. Je beoordeling is bewaard. Open het risico om opnieuw te proberen.');notice.setAttribute('role','alert');row.append(notice);}
      operationalCard.card.append(row);
    }
    categories.append(productionCards[0],operationalCard.card,...productionCards.slice(1));layout.append(categories);section.append(layout);updateChoiceControls();
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
    closeDetail();view='operational';activeRisk=risk.id;
    section.replaceChildren();
    const back=node('button','profile-back','← Terug naar overzicht');back.type='button';back.onclick=()=>overview(risk.id);
    const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro'),title=node('h2','',risk.title);title.tabIndex=-1;
    intro.append(title,node('p','',"Operationele risico's"));header.append(glyph('operational','profile-category-icon'),intro,badge(operational?.assessments?.[risk.id]));
    const content=node('div','analysis-editor-form');
    for(const [label,text]of [['Gedefinieerd risico',risk.description],['Mogelijk gevolg',risk.consequence]]){
      const card=node('section','analysis-editor-card');card.append(node('h3','',label),node('p','risk-definition',text));content.append(card);
    }
    const stored=operational?.assessments?.[risk.id];
    let draft=reviewDrafts.get(risk.id);
    if(!draft){draft={riskLevel:stored?.riskLevel||null,riskNote:stored?.riskNote||'',editing:!stored,revision:stored?.revision||0,busy:false,error:'',payload:null};reviewDrafts.set(risk.id,draft);}
    const source=operational?.source,sourceKey=JSON.stringify(source);
    const message=node('p','profile-message');message.setAttribute('role','alert');
    const retry=node('button','secondary-button','Opnieuw proberen');retry.type='button';retry.hidden=true;
    const reload=node('button','secondary-button','Actuele risico’s laden');reload.type='button';reload.hidden=true;
    const live=()=>!disposed&&view==='operational'&&activeRisk===risk.id;
    const values=()=>({concertId:show.key,source,riskId:risk.id,revision:draft.revision,riskLevel:draft.riskLevel,riskNote:draft.riskNote});
    const valid=()=>{try{validateOperationalReview(values());return true;}catch{return false;}};
    const update=()=>{
      if(!live())return;
      review.update({riskLevel:draft.riskLevel,riskNote:draft.riskNote,disabled:readOnly||!source||draft.busy||!draft.editing,busy:draft.busy,completed:!draft.editing,canSave:valid(),canEdit:!readOnly&&!draft.busy,failed:false});
      message.textContent=draft.error;message.hidden=!draft.error;retry.hidden=!draft.error||draft.busy;reload.hidden=!draft.error||draft.busy;
      const status=Array.from(header.querySelectorAll('span')).find(el=>el.className==='analysis-status');
      if(status){const row=operational?.assessments?.[risk.id];status.textContent=operationalRiskLabels[row?.riskLevel]||'Nog te beoordelen';status.dataset.status=row?.riskLevel||'unreviewed';}
    };
    const save=async()=>{
      if(readOnly||draft.busy||!valid())return;draft.busy=true;draft.error='';draft.payload ||= validateOperationalReview(values());const payload=structuredClone(draft.payload);overview(risk.id);
      try{
        const data=await reviewMemory.run(()=>requestAccess('operational-risk',{method:'POST',body:payload}));
        if(!data?.record?.completedAt||data.record.riskLevel!==payload.riskLevel||data.record.riskNote!==payload.riskNote||!data.overview?.operational||JSON.stringify(data.overview.operational.source)!==sourceKey)throw Error('UNCONFIRMED');
        draft.payload=null;draft.editing=false;draft.revision=data.record.revision;draft.riskLevel=data.record.riskLevel;draft.riskNote=data.record.riskNote;
        if(disposed)return;
        operational=data.overview.operational;risks=data.overview.risks;state=data.overview.state;loadedVersion=version();if(view==='overview')overview(risk.id);
      }catch{draft.error='Opslag niet bevestigd. Je invoer is behouden. Probeer opnieuw of laad de actuele risico’s.';}
      finally{draft.busy=false;reviewMemory.notify();}
    };
    refreshOperational=update;
    const review=createRiskReviewCard({name:'operational-'+risk.id,onChange:(level,note)=>{draft.riskLevel=level;draft.riskNote=level==='low'?'':note;draft.error='';draft.payload=null;update();},onSave:save,onEdit:()=>{draft.editing=true;update();}});
    retry.onclick=save;reload.onclick=()=>{if(!draft.busy){reviewDrafts.delete(risk.id);view='overview';overview();void load();}};
    const aside=node('aside','operational-review-aside');aside.append(review.element,message,retry,reload);
    const layout=node('div','barrier-assessment-layout operational-assessment-layout');layout.append(content,aside);
    section.append(back,header,layout);update();title.focus({preventScroll:true});
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
      validateProductionRiskState(data.production);choices.sync(data.production);production=choices.server;assessments=data.assessments||{};productionReady=true;state=data.state;risks=data.risks;operational=data.operational||null;const sourceKey=JSON.stringify(data.operational?.source);if(reviewMemory.source!==sourceKey){reviewDrafts.clear();reviewMemory.source=sourceKey;}loaded=true;loadedVersion=version();error=choices.failed?choiceError:'';
    }catch{if(!disposed){if(!choices.failed){loaded=false;risks=[];}error=choices.failed?choiceError:'Risicoanalyse laden is niet gelukt. Probeer opnieuw.';}if(strict===true)throw Error(error);}
    finally{loadingNow=false;finish?.();panel.removeAttribute('aria-busy');if(!disposed&&view==='overview')overview();else if(!disposed&&view==='operational'&&loaded&&!error){const risk=risks.find(risk=>risk.id===activeRisk);if(risk)detail(risk);else overview();}}
  }
  overview();
  return { prepare(){return load(true);}, activate(){if((!loaded||loadedVersion!==version())&&!loadingNow)void load();}, dispose(){disposed=true;unsubscribeChoices();unsubscribeReviews();choiceControls.clear();closeDetail();if(ownsReviews&&!reviewMemory.busy)reviewMemory.clear();operational=null;risks=[];production={revision:0,choices:{}};section.replaceChildren();loading?.dispose();panel.removeAttribute('aria-busy');} };
}
