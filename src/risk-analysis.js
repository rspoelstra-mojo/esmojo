import {operationalIconPaths} from './lib/profile-icons.js';
import {createPageFeedback} from './lib/page-feedback.js';
import {backgroundSaves,saveRequestInfo} from './lib/background-saves.js';
import {detailBackButton} from './detail-back.js';
import {createOperationalReviewMemory} from './lib/operational-review-memory.js';
import {createProductionChoiceQueue} from './lib/production-choice-saves.js';
import './show-profile.css';
import './risk-analysis.css';
import './production-assessment.css';
import {createRiskReviewCard} from './risk-review-card.js';
import {createEditActions,editSwap,createEditPage,setEditMode,editHeaderRight} from './edit-mode.js';
import {operationalRiskLabels} from '../shared/operational-risk.js';
import {validateOperationalReview} from '../shared/operational-review.js';
import {validateRiskEdit,riskEditLimits} from '../shared/risk-edit.js';
import {validateOwnRisk,ownRiskLimits} from '../shared/own-risk.js';
import {createBarrierLayoutPage} from './barrier-layout-page.js';
import {createFloorPressurePage} from './floor-pressure-page.js';
import { access } from './auth.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';
import { productionRiskGroups, validateProductionRiskState } from '../shared/production-risks.js';

const node = (tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text !== undefined) el.textContent = text; return el; };
const paths = {
  production: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>',
  operational: operationalIconPaths,
  chevron: '<path d="m9 6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const glyph = (name, className) => { const el=node('span',className); el.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`; return el; };
const badge = record => { const el=node('span','analysis-status',operationalRiskLabels[record?.riskLevel]||'Nog te beoordelen');el.dataset.status=record?.riskLevel||'unreviewed';return el; };

export function createRiskAnalysis(panel, { show, readOnly=false, version=()=>0, requestAccess=access, request = body => requestAccess('show-risks', { method:'POST', body }), choices, reviewMemory, saveSelection = body => requestAccess('production-risks', {method:'POST',body}) } = {}) {
  let disposed=false, loaded=false, loadingNow=false, risks=[], state='pending', error='', view='overview';
  let loadedVersion=-1,operational=null,activeRisk=null,detailEditing=false;
  // Eigen risico van de ESM in voorbereiding of in opslag; alleen sessiegeheugen. De requestId blijft gelijk tot de opslag bevestigd is.
  const freshOwn=()=>({title:'',description:'',consequence:'',riskLevel:null,riskNote:'',measureRequired:null,requestId:crypto.randomUUID(),busy:false,error:'',payload:null});
  let own=freshOwn();
  const ownsReviews=!reviewMemory;reviewMemory ||= createOperationalReviewMemory();
  const reviewDrafts=reviewMemory.drafts;let refreshOperational=()=>{};
  const unsubscribeReviews=reviewMemory.subscribe(()=>{if(disposed)return;if(view==='overview')overview();else if(view==='operational')refreshOperational();});
  const entranceNotApplicable=show?.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder';
  let production={revision:0,choices:{}},productionReady=false,assessments={},disposeDetail=null;
  const feedbacks=new Map();const feedback=info=>{if(!feedbacks.has(info.key))feedbacks.set(info.key,createPageFeedback(info));return feedbacks.get(info.key);};
  const readFeedback=feedback({key:'risk-read:'+show.key,label:'Risicoanalyse laden',route:'/shows/'+encodeURIComponent(show.key)+'?tab=risicoanalyse'});
  function choiceFailure(){for(const field of productionRiskGroups.flatMap(group=>group.items).filter(item=>item.conditional).map(item=>item.id))if(choices.pending(field))feedback(saveRequestInfo('production-risks',{concertId:show.key,field})).show(choiceError,async()=>{await load(false,true);return !choices.failed&&!error;});}
  const choiceError='De keuzes zijn nog niet bevestigd. Je invoer is behouden. Probeer de opslag opnieuw.';
  const choiceControls=new Map();
  choices ||= createProductionChoiceQueue({save:body=>saveSelection({concertId:show.key,...body}),read:async()=>{const data=await request({concertId:show.key});return data.production;}});
  const unsubscribeChoices=choices.subscribe(()=>{
    if(disposed)return;
    if(choices.server)production=choices.server;
    if(view==='overview'){
      if(choices.failed){error=choiceError;choiceFailure();updateChoiceControls();}
      else {
        for(const field of productionRiskGroups.flatMap(group=>group.items).filter(item=>item.conditional).map(item=>item.id)){
          if(!choices.pending(field)&&typeof production.choices[field]==='boolean')feedbacks.get(saveRequestInfo('production-risks',{concertId:show.key,field}).key)?.resolved();
        }
        updateChoiceControls();
      }
    }
  });
  function updateChoiceControls(){
    for(const [field,control]of choiceControls){
      const pending=choices.pending(field);
      control.button.disabled=!productionReady||pending||production.choices[field]!==true;
      control.group.setAttribute('aria-busy',String(pending));
      control.group.title='';
      for(const [value,option]of control.options){option.disabled=!productionReady;option.setAttribute('aria-pressed',String(choices.value(field)===value));}
    }
  }
  function closeDetail(){const cleanup=disposeDetail;disposeDetail=null;return cleanup?.();}
  function backFromAssessment(id){const pending=closeDetail();overview(null,id);Promise.resolve(pending).then(()=>{if(!disposed&&view==='overview')void load();});}
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
    view='overview';detailEditing=false;
    if(choices.failed){error=choiceError;choiceFailure();}
    section.replaceChildren();choiceControls.clear();
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
        if(assessment?.revision){const status=node('span','analysis-status',assessment.completed?'Afgerond':'Niet afgerond');status.dataset.status=assessment.completed?'completed':'draft';button.append(status);}
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
      operationalCard.card.append(row);
    }
    // Een eigen risico dat wordt opgeslagen (of niet bevestigd is) staat alvast in de lijst; pas na bevestiging komt het echte risico met zijn beoordeling.
    if(own.busy||own.error){
      const row=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary own-risk-pending');button.type='button';button.disabled=own.busy;button.dataset.ownRisk='pending';
      const status=node('span','analysis-status',own.busy?'Wordt opgeslagen':'Niet opgeslagen');status.dataset.status=own.busy?'unreviewed':'failed';
      button.append(node('span','analysis-row-title',own.title.trim()||'Eigen risico'),status);
      if(own.busy){button.setAttribute('aria-busy','true');const spinner=node('span','submenu-spinner');spinner.setAttribute('aria-hidden','true');button.append(spinner);}
      else{button.append(glyph('chevron','analysis-chevron'));button.onclick=()=>ownRiskPage();}
      row.append(button);operationalCard.card.append(row);
    }
    // Alleen zodra er een operationele analyse is; het risico hoort bij die analyse en wordt bij een nieuwe analyse opnieuw aangeboden.
    if(!readOnly&&!error&&loaded&&operational?.source&&!own.busy){
      const row=node('div','visitor-analysis'),button=node('button','visitor-analysis-summary own-risk-add');button.type='button';button.dataset.ownRisk='add';
      button.append(node('span','analysis-row-title','Eigen risico toevoegen'),glyph('plus','analysis-chevron'));button.onclick=()=>ownRiskPage();row.append(button);operationalCard.card.append(row);
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
    const back=node('button','profile-back','← Terug naar overzicht');detailBackButton(back);back.onclick=()=>overview(null,entry.id);
    const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro'),title=node('h2','',entry.title);title.tabIndex=-1;
    intro.append(title,node('p','',`Productionele risico's · ${group.title}`));header.append(glyph('production','profile-category-icon'),intro);header.prepend(back);section.append(header);title.focus({preventScroll:true});
    window.scrollTo({top:0,left:window.scrollX,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  // Detailpagina van een operationeel risico: leesmodus met één knop Bewerken (titel, gedefinieerd risico, mogelijk gevolg en de beoordeling). Opslaan bevestigt eerst op de
  // server en keert dan pas terug naar de leesmodus; Annuleren verwerpt alle wijzigingen. Er is geen apart concept: wat niet is opgeslagen gaat verloren.
  function detail(initial) {
    if(disposed)return;
    closeDetail();view='operational';activeRisk=initial.id;detailEditing=false;section.replaceChildren();
    let risk=initial,busy=false;
    const stored=()=>operational?.assessments?.[risk.id],canEdit=!readOnly&&Boolean(operational?.source);
    const form={title:'',description:'',consequence:'',riskLevel:null,measureRequired:null};
    const page=createEditPage(),back=node('button','profile-back','← Terug naar overzicht');detailBackButton(back);back.onclick=()=>overview(risk.id);
    const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro');
    const titleRead=node('h2','',risk.title);titleRead.tabIndex=-1;
    const titleInput=node('input','edit-title-input');titleInput.type='text';titleInput.maxLength=riskEditLimits.title;titleInput.setAttribute('aria-label','Titel');
    intro.append(editSwap(titleRead,titleInput),node('p','',"Operationele risico's"));
    const status=badge(stored());
    const actions=createEditActions({onEdit:()=>enter(),onCancel:()=>leave(),onSave:()=>void saveAll()});
    header.append(back,glyph('operational','profile-category-icon'),intro,editHeaderRight(actions,status));
    const content=node('div','analysis-editor-form'),areas={},reads={},counters={};
    for(const [key,label,max,rows]of [['description','Gedefinieerd risico',riskEditLimits.description,4],['consequence','Mogelijk gevolg',riskEditLimits.consequence,4]]){
      const card=node('section','analysis-editor-card'),read=node('p','risk-definition',risk[key]),area=node('textarea','analysis-summary'),editLayer=node('div','edit-field'),counter=node('span','analysis-character-count','');
      area.rows=rows;area.maxLength=max;area.setAttribute('aria-label',label);editLayer.append(area,counter);card.append(node('h3','',label),editSwap(read,editLayer));content.append(card);areas[key]=area;reads[key]=read;counters[key]=counter;
      area.oninput=()=>{form[key]=area.value;clearError();refresh();};
    }
    titleInput.oninput=()=>{form.title=titleInput.value;clearError();refresh();};
    titleInput.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();if(canSave())void saveAll();}};
    const review=createRiskReviewCard({name:'operational-'+risk.id,measureChoice:true,showSave:false,onSave:()=>{},onChange:level=>{const previous=form.riskLevel;form.riskLevel=level;if(level==='none')form.measureRequired=false;else if(previous==='none')form.measureRequired=null;clearError();refresh();},onMeasureChange:value=>{form.measureRequired=value;clearError();refresh();}});
    const aside=node('aside','operational-review-aside');aside.append(review.element);
    const layout=node('div','barrier-assessment-layout operational-assessment-layout');layout.append(content,aside);
    page.append(header,layout);section.append(page);
    const textFeedback=feedback(saveRequestInfo('operational-risk-edit',{concertId:show.key,riskId:risk.id})),reviewFeedback=feedback(saveRequestInfo('operational-risk',{concertId:show.key,riskId:risk.id}));
    const clearError=()=>{textFeedback.clear();reviewFeedback.clear();};
    const reviewStored=()=>{const row=stored();return{riskLevel:row?.riskLevel||null,measureRequired:typeof row?.measureRequired==='boolean'?row.measureRequired:null};};
    const textChanged=()=>form.title!==risk.title||form.description!==risk.description||form.consequence!==risk.consequence;
    const reviewChanged=()=>{const current=reviewStored();return form.riskLevel!==current.riskLevel||form.measureRequired!==current.measureRequired;};
    const textValues=()=>({concertId:show.key,source:operational?.source,riskId:risk.id,editRevision:risk.editRevision||0,title:form.title,description:form.description,consequence:form.consequence});
    const reviewValues=()=>({concertId:show.key,source:operational?.source,riskId:risk.id,revision:stored()?.revision||0,riskLevel:form.riskLevel,riskNote:'',measureRequired:form.measureRequired});
    const textValid=()=>{try{validateRiskEdit(textValues());return true;}catch{return false;}};
    const reviewValid=()=>{try{validateOperationalReview(reviewValues());return true;}catch{return false;}};
    const canSave=()=>canEdit&&(textChanged()||reviewChanged())&&(!textChanged()||textValid())&&(!reviewChanged()||reviewValid());
    function resetForm(){
      const current=reviewStored();Object.assign(form,{title:risk.title,description:risk.description,consequence:risk.consequence,riskLevel:current.riskLevel,measureRequired:current.measureRequired});
      titleInput.value=form.title;for(const key of Object.keys(areas))areas[key].value=form[key];
    }
    function fillRead(){
      titleRead.textContent=risk.title;for(const key of Object.keys(reads))reads[key].textContent=risk[key];
      const row=stored();status.textContent=operationalRiskLabels[row?.riskLevel]||'Nog te beoordelen';status.dataset.status=row?.riskLevel||'unreviewed';
    }
    function refresh(){
      if(disposed||view!=='operational'||activeRisk!==risk.id)return;
      for(const key of Object.keys(counters))counters[key].textContent=`${form[key].length} / ${riskEditLimits[key]}`;
      actions.update({busy,canSave:canSave(),editable:canEdit});
      review.update({riskLevel:form.riskLevel,riskNote:'',measureRequired:form.measureRequired,disabled:!detailEditing||busy,busy,completed:false,canSave:false,canEdit:false,failed:false});
    }
    refreshOperational=refresh;
    function enter(){
      if(busy||detailEditing||!canEdit)return;
      detailEditing=true;resetForm();setEditMode(page,'edit');refresh();requestAnimationFrame(()=>{if(detailEditing)titleInput.focus({preventScroll:true});});
    }
    function leave(){
      if(busy)return;
      detailEditing=false;clearError();resetForm();fillRead();setEditMode(page,'read');refresh();actions.edit.focus({preventScroll:true});
    }
    page.addEventListener('keydown',event=>{if(event.key==='Escape'&&detailEditing&&!busy){event.preventDefault();leave();}});
    const reloadNow=async()=>{if(busy)return false;detailEditing=false;view='overview';overview();await load();return !error;};
    async function saveAll(){
      if(disposed||busy||!canSave())return false;
      busy=true;clearError();refresh();
      let stage='edit';
      try{
        if(textChanged()){
          const payload=validateRiskEdit(textValues()),sourceKey=JSON.stringify(operational.source);
          const data=await reviewMemory.run(()=>requestAccess('operational-risk-edit',{method:'POST',body:payload}));
          const saved=data?.overview?.risks?.find(item=>item.id===risk.id&&item.title===payload.title&&item.description===payload.description&&item.consequence===payload.consequence&&item.editRevision===payload.editRevision+1);
          if(!saved||data.riskId!==risk.id||!data.overview?.operational||JSON.stringify(data.overview.operational.source)!==sourceKey)throw Error('UNCONFIRMED');
          operational=data.overview.operational;risks=data.overview.risks;state=data.overview.state;loadedVersion=version();risk=saved;
        }
        stage='review';
        if(reviewChanged()){
          const payload=validateOperationalReview(reviewValues()),sourceKey=JSON.stringify(operational.source);
          const data=await reviewMemory.run(()=>requestAccess('operational-risk',{method:'POST',body:payload}));
          if(!data?.record?.completedAt||data.record.riskLevel!==payload.riskLevel||data.record.measureRequired!==payload.measureRequired||!data.overview?.operational||JSON.stringify(data.overview.operational.source)!==sourceKey)throw Error('UNCONFIRMED');
          operational=data.overview.operational;risks=data.overview.risks;state=data.overview.state;loadedVersion=version();
        }
      }catch{
        busy=false;
        if(!disposed){const message='Opslag niet bevestigd. Je invoer is behouden. Probeer opnieuw of laad de actuele risico’s.';(stage==='edit'?textFeedback:reviewFeedback).show(message,saveAll,'Opnieuw proberen',[{label:'Actuele risico’s laden',run:reloadNow}]);refresh();}
        return false;
      }
      busy=false;textFeedback.resolved();reviewFeedback.resolved();
      if(disposed)return true;
      detailEditing=false;resetForm();fillRead();setEditMode(page,'read');refresh();actions.edit.focus({preventScroll:true});return true;
    }
    resetForm();fillRead();refresh();titleRead.focus({preventScroll:true});
    window.scrollTo({top:0,left:window.scrollX,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  // Pagina binnen het tabblad: eigen operationeel risico met mogelijk gevolg en meteen de beoordeling (beheersmaatregel bij Midden/Hoog).
  function ownRiskPage(){
    if(disposed||readOnly||!operational?.source)return;
    closeDetail();view='own';section.replaceChildren();
    const back=node('button','profile-back','← Terug naar overzicht');detailBackButton(back);back.onclick=()=>overview();
    const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro'),title=node('h2','','Eigen risico toevoegen');title.tabIndex=-1;
    intro.append(title,node('p','',"Operationele risico's"));header.append(back,glyph('operational','profile-category-icon'),intro);
    const content=node('div','analysis-editor-form'),fields={};
    for(const [key,label,max,rows]of [['title','Titel',ownRiskLimits.title,1],['description','Omschrijving',ownRiskLimits.description,4],['consequence','Mogelijk gevolg',ownRiskLimits.consequence,4]]){
      const card=node('section','analysis-editor-card'),heading=node('label','analysis-editor-label',label),input=node('textarea','analysis-summary');
      input.id='own-risk-'+key;heading.htmlFor=input.id;input.rows=rows;input.maxLength=max;input.required=true;input.value=own[key];
      const counter=node('span','analysis-character-count',`${input.value.length} / ${max}`);
      input.oninput=()=>{own[key]=input.value;own.error='';own.payload=null;counter.textContent=`${input.value.length} / ${max}`;update();};
      card.append(heading,input,counter);content.append(card);fields[key]=input;
    }
    const values=()=>({concertId:show.key,source:operational?.source,requestId:own.requestId,title:own.title,description:own.description,consequence:own.consequence,riskLevel:own.riskLevel,riskNote:own.riskNote,measureRequired:own.measureRequired});
    const valid=()=>{try{validateOwnRisk(values());return true;}catch{return false;}};
    const ownFeedback=feedback(saveRequestInfo('operational-risk-own',{concertId:show.key}));
    const review=createRiskReviewCard({name:'own-risk',measureChoice:true,onChange:(level)=>{const previous=own.riskLevel;own.riskLevel=level;own.riskNote='';if(level==='none')own.measureRequired=false;else if(previous==='none')own.measureRequired=null;own.error='';own.payload=null;update();},onMeasureChange:value=>{own.measureRequired=value;own.error='';own.payload=null;update();},onSave:()=>void save()});
    function update(){if(disposed||view!=='own')return;review.update({riskLevel:own.riskLevel,riskNote:own.riskNote,measureRequired:own.measureRequired,disabled:own.busy,busy:own.busy,completed:false,canSave:valid(),canEdit:false});}
    const aside=node('aside','operational-review-aside');aside.append(review.element);
    const layout=node('div','barrier-assessment-layout operational-assessment-layout');layout.append(content,aside);
    section.append(header,layout);update();title.focus({preventScroll:true});
    window.scrollTo({top:0,left:window.scrollX,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  // Valideert lokaal, keert direct terug naar het overzicht en bevestigt op de achtergrond; pas na serverbevestiging staat het risico (met beoordeling) in de lijst.
  async function save(){
    if(disposed||readOnly||own.busy||!operational?.source)return false;
    let payload;try{own.payload||=validateOwnRisk({concertId:show.key,source:operational.source,requestId:own.requestId,title:own.title,description:own.description,consequence:own.consequence,riskLevel:own.riskLevel,riskNote:own.riskNote,measureRequired:own.measureRequired});payload=structuredClone(own.payload);}catch{return false;}
    const ownFeedback=feedback(saveRequestInfo('operational-risk-own',{concertId:show.key})),sourceKey=JSON.stringify(operational.source);
    own.busy=true;own.error='';view='overview';overview();
    try{
      const data=await reviewMemory.run(()=>requestAccess('operational-risk-own',{method:'POST',body:payload}));
      const created=data?.overview?.risks?.find(risk=>risk.id===data.riskId&&risk.own===true&&risk.title===payload.title&&risk.description===payload.description&&risk.consequence===payload.consequence);
      if(!data?.record?.completedAt||data.record.riskLevel!==payload.riskLevel||data.record.measureRequired!==payload.measureRequired||!created||!data.overview?.operational||JSON.stringify(data.overview.operational.source)!==sourceKey)throw Error('UNCONFIRMED');
      own=freshOwn();ownFeedback.resolved();if(disposed)return true;
      operational=data.overview.operational;risks=data.overview.risks;state=data.overview.state;loadedVersion=version();if(view==='overview')overview(data.riskId);return true;
    }catch(failure){
      own.error=failure?.code==='OWN_RISK_LIMIT'?failure.message:'Opslag niet bevestigd. Je invoer is behouden. Probeer opnieuw.';
      if(reviewMemory.active)backgroundSaves.fail(saveRequestInfo('operational-risk-own',payload));
      if(!disposed){ownFeedback.show(own.error,failure?.code==='OWN_RISK_LIMIT'?()=>{ownRiskPage();return false;}:save,failure?.code==='OWN_RISK_LIMIT'?'Eigen risico bewerken':'Opnieuw proberen');if(view==='overview')overview();}
      return false;
    }finally{own.busy=false;reviewMemory.notify();}
  }
  function saveChoice(field,value){
    if(disposed||!productionReady)return;
    choices.enqueue(field,value);
  }
  async function load(strict=false,retryChoices=false) {
    if(disposed||loadingNow)return;
    loadingNow=true;productionReady=false;error='';if(view==='overview')overview();const finish=loading?.start();panel.setAttribute('aria-busy','true');
    try{
      // Bevestigde snapshots blijven bruikbaar terwijl keuzes opslaan.
      if(choices.failed&&retryChoices){await choices.retry();if(choices.failed)throw Error('UNCONFIRMED');}
      if(disposed)return;
      const data=await request({concertId:show.key});if(disposed)return;
      if(!['ready','pending','not-ready'].includes(data.state)||!Array.isArray(data.risks)||data.risks.length>30)throw Error('Invalid response');
      const ids=new Set();
      for(const risk of data.risks){if(!risk||!/^R\d{2}$/.test(risk.id)||ids.has(risk.id)||['title','description','consequence'].some(key=>typeof risk[key]!=='string'||!risk[key].trim()))throw Error('Invalid risk');ids.add(risk.id);}
      validateProductionRiskState(data.production);choices.sync(data.production);production=choices.server;assessments=data.assessments||{};productionReady=true;state=data.state;risks=data.risks;operational=data.operational||null;const sourceKey=JSON.stringify(data.operational?.source);if(reviewMemory.source!==sourceKey){reviewDrafts.clear();reviewMemory.source=sourceKey;}loaded=true;loadedVersion=version();error=choices.failed?choiceError:'';readFeedback.resolved();
    }catch{if(!disposed){if(!choices.failed){loaded=false;risks=[];}error=choices.failed?choiceError:'Risicoanalyse laden is niet gelukt. Probeer opnieuw.';}if(!disposed){if(choices.failed)choiceFailure();else readFeedback.show(error,async()=>{await load();return !error;},'Opnieuw laden');}if(strict===true)throw Error(error);}
    finally{loadingNow=false;finish?.();panel.removeAttribute('aria-busy');if(!disposed&&view==='overview')overview();else if(!disposed&&view==='operational'&&loaded&&!error&&!detailEditing){const risk=risks.find(risk=>risk.id===activeRisk);if(risk)detail(risk);else overview();}}
  }
  overview();
  return { prepare(){return load(true);},
    // Bestemming vanuit de actielijst: één operationeel risico, één productionele beoordeling of het overzicht.
    open(target={}){
      if(disposed||!loaded)return;
      if(target.risk){const risk=risks.find(item=>item.id===target.risk);if(risk){detail(risk);return;}}
      if(target.production)for(const group of productionRiskGroups){const entry=group.items.find(item=>item.id===target.production);if(entry){productionDetail(entry,group);return;}}
      closeDetail();overview();
    }, activate(){if((!loaded||loadedVersion!==version())&&!loadingNow)void load();}, dispose(){disposed=true;for(const item of feedbacks.values())item.dispose();unsubscribeChoices();unsubscribeReviews();choiceControls.clear();closeDetail();if(ownsReviews&&!reviewMemory.busy)reviewMemory.clear();operational=null;risks=[];production={revision:0,choices:{}};section.replaceChildren();loading?.dispose();panel.removeAttribute('aria-busy');} };
}
