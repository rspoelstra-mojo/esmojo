import {createPageFeedback} from './lib/page-feedback.js';
import {backgroundSaves,saveRequestInfo} from './lib/background-saves.js';
import {detailBackButton} from './detail-back.js';
import './production-assessment.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {barrierTypes} from '../shared/barrier-layout.js';
import {floorDensity,parseVisitorCount,parseFloorArea} from '../shared/floor-pressure.js';
import {validateFloorData,productionMeasureRequired} from '../shared/production-measure.js';
import './risk-review-card.css';
import {assessmentNode as node,riskRadioGroup,createAssessmentQueue} from './production-assessment-ui.js';
import {createEditActions,editHeaderRight,setEditMode,playEditTransition} from './edit-mode.js';

const numbers=new Intl.NumberFormat('nl-NL'),densityFormat=new Intl.NumberFormat('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=date=>new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Amsterdam'}).format(new Date(date+'T12:00:00Z'));
export function floorTicketText(tickets){
  if(tickets?.soldTickets===null||tickets?.soldTickets===undefined)return{main:'Niet beschikbaar',detail:'Ticketgegevens ontbreken of zijn niet beschikbaar in het showprofiel.'};
  const shows=tickets.shows||[],main=numbers.format(tickets.soldTickets);if(shows.length<2)return{main,detail:''};
  const highest=shows.find(row=>row.count===tickets.soldTickets),others=shows.filter(row=>row!==highest);
  return{main,detail:`Hoogste verkoopstand: ${dateLabel(highest.date)} (${numbers.format(highest.count)}). Overige dagen: ${others.map(row=>`${dateLabel(row.date)} ${numbers.format(row.count)}`).join(' · ')}.`};
}
export function createFloorPressurePage(section,{show,onBack,onBarrier,onStored=()=>{},request=body=>access('floor-pressure',{method:'POST',body})}){
  const feedback=createPageFeedback(saveRequestInfo('floor-pressure',{concertId:show.key})),local=backgroundSaves.form('floor-edit:'+show.key);
  let editing=false,saving=false,keepFields=false,disposed=false,ready=false,reading=false,record=null,basis=null,tickets=null,type=null,rows=[],riskLevel=null,measureRequired=null,queue=null;
  let rowControls=[];
  const menu=document.querySelector('#submenu-navigation [aria-current="page"]'),loading=menu?createSubmenuLoading(menu,section):null;
  section.replaceChildren();const root=node('section','production-assessment edit-page'),back=node('button','profile-back','← Terug naar overzicht');detailBackButton(back);back.onclick=onBack;setEditMode(root,'read');
  const title=node('h2','assessment-page-title','Vloerdruk');title.tabIndex=-1;
  const block=node('form','assessment-block'),source=node('p','assessment-note'),ticketLine=node('p','floor-ticket-line','Verkochte tickets: '),ticketValue=node('strong',''),ticketDetail=node('p','floor-ticket-detail');ticketLine.append(ticketValue);
  const tableWrap=node('div','floor-table-wrap'),table=node('table','floor-table'),head=node('thead',''),headRow=node('tr','');
  for(const text of ['Publieksvak / bezoekers','Aantal m²','Vloerdruk']){const th=node('th','',text);th.scope='col';headRow.append(th);}head.append(headRow);const body=node('tbody','');table.append(head,body);tableWrap.append(table);
  const seatedVisitors=node('input','floor-seated-count');seatedVisitors.type='text';seatedVisitors.readOnly=true;seatedVisitors.tabIndex=-1;seatedVisitors.id='floor-seated-visitors';seatedVisitors.setAttribute('aria-label','Bezoekers Zitplaatsen (automatisch)');
  const add=node('button','secondary-button floor-add','+ Publieksvak toevoegen');add.type='button';
  const total=node('div','floor-total'),review=node('div','floor-review'),risk=riskRadioGroup('floor-risk',value=>{const previous=riskLevel;riskLevel=value;if(value==='none')measureRequired=false;else if(previous==='none')measureRequired=null;remember();update();});
  // Beheersmaatregel noodzakelijk: Ja/Nee zonder standaardkeuze; bij Ja verschijnt de vloerdruk bij Maatregelen en wordt de maatregel daar uitgewerkt.
  const measureField=node('fieldset','risk-review-measure'),measureLegend=node('legend','risk-review-measure-title','Beheersmaatregel noodzakelijk'),measureChoices=node('div','risk-review-choices'),measureInputs=[];
  for(const [value,labelText]of [['no','Nee'],['yes','Ja']]){const option=node('label','risk-review-option risk-review-measure-option'),input=node('input','');input.type='radio';input.name='floor-measure';input.value=value;option.dataset.choice=value;option.append(input,node('span','',labelText));measureChoices.append(option);measureInputs.push(input);input.onchange=()=>{if(input.checked){measureRequired=value==='yes';remember();update();}};}
  measureField.append(measureLegend,measureChoices);review.append(risk.element,measureField);
  const status=node('p','assessment-status'),error=node('p','profile-message');error.setAttribute('role','alert');const reload=node('button','secondary-button','Actuele beoordeling laden');reload.type='button';reload.hidden=true;
  const missing=node('div','assessment-fields'),missingText=node('p','assessment-note','Selecteer eerst een barrieropstelling.'),openBarrier=node('button','secondary-button','Barrieropstelling openen');openBarrier.type='button';openBarrier.onclick=onBarrier;missing.append(missingText,openBarrier);
  const stateBadge=node('span','analysis-status','Niet afgerond'),editActions=createEditActions({onEdit:()=>enter(),onCancel:()=>leave(),onSave:()=>void saveAll()});
  block.append(source,ticketLine,ticketDetail,missing,tableWrap,add,total,review,status,error,reload);const heading=node('div','analysis-editor-header');heading.append(back,title,editHeaderRight(editActions,stateBadge));root.append(heading,block);section.append(root);
  const snapshot=()=>({rows:rows.map(({id,name,visitors,area})=>({id,name,visitors,area})),riskLevel,measureRequired:riskLevel===null?null:riskLevel==='none'?false:measureRequired});
  const remember=()=>{local.fields={data:structuredClone(snapshot()),basis:structuredClone(basis)};};
  const call=(operation,payload={})=>request({operation,concertId:show.key,...payload});
  function valid(){try{validateFloorData(snapshot(),type,true);return true;}catch{return false;}}
  function renderRows(){
    body.replaceChildren();rowControls=[];
    for(const [index,row]of rows.entries()){
      const tr=node('tr',''),visitorsCell=node('td',''),areaCell=node('td',''),resultCell=node('td',''),rowId='floor-'+row.id;
      const labelRow=node('tr','floor-section-heading'),labelCell=node('td','');labelRow.append(labelCell,node('td',''),node('td',''));body.append(labelRow);
      if(type==='custom'&&index>0){const name=node('input','floor-row-name');name.value=row.name;name.maxLength=120;name.required=true;name.setAttribute('aria-label','Naam publieksvak');name.oninput=()=>{row.name=name.value;remember();update();};labelCell.append(name);rowControls.push(name);}else {const label=node('label','',row.name);label.htmlFor=rowId+'-visitors';labelCell.append(label);}
      const visitors=node('input','');visitors.type='text';visitors.inputMode='numeric';visitors.required=true;visitors.id=rowId+'-visitors';visitors.value=row.visitors===null?'':numbers.format(row.visitors);visitors.setAttribute('aria-label',`Bezoekers ${row.name||'publieksvak'}`);
      const area=node('input','');area.type='text';area.inputMode='decimal';area.required=true;area.id=rowId+'-area';area.value=row.area===null?'':new Intl.NumberFormat('nl-NL',{maximumFractionDigits:20,useGrouping:false}).format(row.area);area.setAttribute('aria-label',`Netto oppervlakte in m² ${row.name||'publieksvak'}`);
      const output=node('output','');output.setAttribute('for',visitors.id+' '+area.id);
      visitors.oninput=()=>{row.visitors=parseVisitorCount(visitors.value);visitors.setCustomValidity(row.visitors===null?'Vul een geheel bezoekersaantal van nul of hoger in.':'');remember();calculate();update();};
      area.oninput=()=>{row.area=parseFloorArea(area.value);area.setCustomValidity(row.area===null||row.area<=0?'Vul een netto oppervlakte groter dan nul in.':'');remember();calculate();update();};
      visitors.onblur=()=>{if(row.visitors!==null)visitors.value=numbers.format(row.visitors);};
      visitorsCell.append(visitors);areaCell.append(area);resultCell.append(output);tr.append(visitorsCell,areaCell,resultCell);body.append(tr);rowControls.push(visitors,area);rowControls.push({output,row});
      if(type==='custom'&&index>0){const remove=node('button','floor-row-remove','Publieksvak verwijderen');remove.type='button';remove.setAttribute('aria-label',`Verwijder ${row.name||'publieksvak'}`);remove.onclick=()=>{rows=rows.filter(item=>item.id!==row.id);renderRows();remember();update();};visitorsCell.append(remove);rowControls.push(remove);}
    }
    const seatedHeading=node('tr','floor-section-heading'),seatedLabelCell=node('td',''),seatedLabel=node('label','','Zitplaatsen');seatedLabel.htmlFor=seatedVisitors.id;seatedLabelCell.append(seatedLabel);seatedHeading.append(seatedLabelCell,node('td',''),node('td',''));
    const seatedRow=node('tr','floor-seated-row'),seatedCell=node('td','');seatedCell.append(seatedVisitors);seatedRow.append(seatedCell,node('td',''),node('td',''));body.append(seatedHeading,seatedRow);
    calculate();
  }
  function calculate(){
    for(const item of rowControls)if(item.output){const value=floorDensity(item.row.visitors,item.row.area);item.output.textContent=value===null?'—':densityFormat.format(value)+' bezoekers/m²';}
    const filled=rows.every(row=>row.visitors!==null),standing=rows.reduce((n,row)=>n+(row.visitors??0),0),sold=tickets?.soldTickets;
    const seated=Number.isSafeInteger(sold)&&sold>=0?Math.max(0,sold-standing):null;
    seatedVisitors.value=seated===null?'':numbers.format(seated);seatedVisitors.placeholder=seated===null?'Ticketgegevens ontbreken':'';
    const sum=filled?standing+(seated??0):null;total.replaceChildren();
    total.append(node('p','',`Totaal: ${sum===null?'—':numbers.format(sum)} bezoekers · Verkochte tickets: ${sold===null||sold===undefined?'niet beschikbaar':numbers.format(sold)}`));
    if(Number.isSafeInteger(sold)&&standing>sold)total.append(node('p','assessment-note',`Let op: ${numbers.format(standing)} bezoekers ingevoerd tegenover ${numbers.format(sold)} verkochte tickets.`));
  }
  function update(){
    if(disposed)return;const seated=type==='seated',available=Boolean(type)&&!seated,locked=!ready||reading||queue?.exclusive||!editing||saving;
    source.textContent=type?'Barrieropstelling: '+barrierTypes.find(row=>row.value===type)?.label+(record?.invalidatedAt?' · Gewijzigde opstelling: controleer de behouden invoer en rond opnieuw af.':''):'';missing.hidden=Boolean(type)||!ready;
    for(const el of [tableWrap,total,review,ticketLine,ticketDetail])el.hidden=!available;add.hidden=!available||type!=='custom'||Boolean(record?.completed);add.disabled=locked;
    for(const control of rowControls)if(!control.output)control.disabled=locked;risk.update(riskLevel,locked);
    measureField.hidden=!['low','medium','high'].includes(riskLevel);for(const input of measureInputs){input.checked=measureRequired===(input.value==='yes');input.disabled=locked;input.required=!measureField.hidden;}
    editActions.update({busy:saving||Boolean(queue?.exclusive),canSave:ready&&!queue?.failed&&valid(),editable:available&&(ready&&!reading&&!queue?.failed||editing)});stateBadge.textContent=record?.completed?'Afgerond':'Niet afgerond';stateBadge.dataset.status=record?.completed?'completed':'draft';back.disabled=false;
    status.textContent=seated?'✓ Vloerdruk niet van toepassing bij Seated — Geen risico':'';status.hidden=!status.textContent;status.classList.toggle('assessment-completed',false);
  }
  function accept(data,replace,job){
    if(!data||!data.basis||!data.tickets)throw Error('Onvolledige opslagbevestiging.');record=data.record;if(job?.operation==='complete'&&record?.completed)local.fields=null;basis=data.basis;tickets=data.tickets;type=data.barrierType;
    if(disposed)return;
    if(replace&&!(keepFields&&job?.operation==='reopen')){rows=(record?.rows||[]).map(({id,name,visitors,area})=>({id,name,visitors,area}));riskLevel=record?.riskLevel||null;measureRequired=record?.riskLevel?productionMeasureRequired(record,record.note):null;renderRows();}
    const text=floorTicketText(tickets);ticketValue.textContent=text.main;ticketDetail.textContent=text.detail;calculate();
    if(job)feedback.resolved();onStored(record,data);update();
  }
  async function load(){
    if(reading)return;reading=true;ready=false;error.textContent='';reload.hidden=true;const finish=loading?.start();update();
    try{const data=await call('read');if(disposed)return;queue?.dispose();accept(data,true);if(local.fields&&editing){rows=structuredClone(local.fields.data.rows);riskLevel=local.fields.data.riskLevel;measureRequired=local.fields.data.measureRequired;renderRows();if(JSON.stringify(local.fields.basis)!==JSON.stringify(basis))feedback.show('De brongegevens zijn gewijzigd. Controleer je behouden invoer voordat je opslaat.');}queue=createAssessmentQueue({info:saveRequestInfo('floor-pressure',{concertId:show.key}),snapshot,send:(operation,payload)=>call(operation,{...payload,revision:record?.revision||0,basis}),stored:accept,changed:update,error:message=>{feedback.show('Opslag niet bevestigd. Je invoer is behouden.',async()=>{await load();return false;},'Actuele beoordeling laden');}});ready=true;}
    catch(failure){if(!disposed){feedback.show('De beoordeling kon niet worden geladen. Je invoer is behouden.',async()=>{await load();return ready&&!queue?.failed;},'Opnieuw laden');}}
    finally{reading=false;finish?.();update();}
  }
  add.onclick=()=>{rows.push({id:'custom_'+crypto.randomUUID().replaceAll('-',''),name:'',visitors:null,area:null});renderRows();remember();update();};
  block.onsubmit=event=>event.preventDefault();reload.onclick=load;
  // Eén bevestigde reeks: zo nodig heropenen en afronden; pas daarna terug naar de leesmodus. Bij een fout blijft de invoer staan.
  async function saveAll(){
    if(!editing||saving||!ready||queue?.failed||!valid()||!block.reportValidity())return;
    saving=true;keepFields=true;update();const wanted=structuredClone(snapshot());let ok=true;
    try{if(record?.completed)ok=Boolean(await queue.action('reopen'));if(ok)ok=Boolean(await queue.action('complete',{data:wanted}));}
    finally{saving=false;keepFields=false;}
    if(disposed)return;
    if(ok&&record?.completed){editing=false;local.fields=null;setEditMode(root,'read');playEditTransition(block);editActions.edit.focus({preventScroll:true});}
    update();
  }
  function enter(){
    if(editing||!ready||reading||saving||queue?.failed||!type||type==='seated')return;
    editing=true;setEditMode(root,'edit');playEditTransition(block);update();requestAnimationFrame(()=>{if(editing)(rowControls.find(control=>control.tagName==='INPUT'&&!control.readOnly)||add).focus({preventScroll:true});});
  }
  function leave(){
    if(!editing||saving)return;editing=false;local.fields=null;
    rows=(record?.rows||[]).map(({id,name,visitors,area})=>({id,name,visitors,area}));riskLevel=record?.riskLevel||null;measureRequired=record?.riskLevel?productionMeasureRequired(record,record.note):null;renderRows();
    setEditMode(root,'read');playEditTransition(block);update();editActions.edit.focus({preventScroll:true});
  }
  update();void load();title.focus({preventScroll:true});
  return()=>{disposed=true;if(!saving&&!queue?.failed)local.fields=null;feedback.dispose();const pending=queue?.dispose();loading?.dispose();return pending;};
}
