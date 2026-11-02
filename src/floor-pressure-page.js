import './production-assessment.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {barrierTypes} from '../shared/barrier-layout.js';
import {floorDensity,parseVisitorCount,parseFloorArea,validateFloorData} from '../shared/floor-pressure.js';
import {assessmentNode as node,riskRadioGroup,createAssessmentQueue} from './production-assessment-ui.js';

const numbers=new Intl.NumberFormat('nl-NL'),densityFormat=new Intl.NumberFormat('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=date=>new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Amsterdam'}).format(new Date(date+'T12:00:00Z'));
export function floorTicketText(tickets){
  if(tickets?.soldTickets===null||tickets?.soldTickets===undefined)return{main:'Niet beschikbaar',detail:'Ticketgegevens ontbreken of zijn niet beschikbaar in het showprofiel.'};
  const shows=tickets.shows||[],main=numbers.format(tickets.soldTickets);if(shows.length<2)return{main,detail:''};
  const highest=shows.find(row=>row.count===tickets.soldTickets),others=shows.filter(row=>row!==highest);
  return{main,detail:`Hoogste verkoopstand: ${dateLabel(highest.date)} (${numbers.format(highest.count)}). Overige dagen: ${others.map(row=>`${dateLabel(row.date)} ${numbers.format(row.count)}`).join(' · ')}.`};
}
export function createFloorPressurePage(section,{show,onBack,onBarrier,onStored=()=>{},request=body=>access('floor-pressure',{method:'POST',body})}){
  let disposed=false,ready=false,reading=false,record=null,basis=null,tickets=null,type=null,rows=[],riskLevel=null,note='',queue=null;
  const noteDrafts={};let rowControls=[];
  const menu=document.querySelector('#submenu-navigation [aria-current="page"]'),loading=menu?createSubmenuLoading(menu,section):null;
  section.replaceChildren();const root=node('section','production-assessment'),back=node('button','profile-back','← Terug naar overzicht');back.type='button';back.onclick=onBack;
  const title=node('h2','assessment-page-title','Vloerdruk');title.tabIndex=-1;
  const block=node('form','assessment-block'),source=node('p','assessment-note'),ticketLine=node('p','floor-ticket-line','Verkochte tickets: '),ticketValue=node('strong',''),ticketDetail=node('p','floor-ticket-detail');ticketLine.append(ticketValue);
  const tableWrap=node('div','floor-table-wrap'),table=node('table','floor-table'),head=node('thead',''),headRow=node('tr','');
  for(const text of ['Publieksvak / bezoekers','Aantal m²','Vloerdruk']){const th=node('th','',text);th.scope='col';headRow.append(th);}head.append(headRow);const body=node('tbody','');table.append(head,body);tableWrap.append(table);
  const add=node('button','secondary-button floor-add','+ Publieksvak toevoegen');add.type='button';
  const total=node('div','floor-total'),review=node('div','floor-review'),risk=riskRadioGroup('floor-risk',value=>{if(riskLevel)noteDrafts[riskLevel]=note;riskLevel=value;note=noteDrafts[value]||'';notes.value=note;queue.save();update();}),noteField=node('div','assessment-field'),noteLabel=node('label','','Toelichting'),notes=node('textarea','');notes.id='floor-notes';notes.rows=4;notes.maxLength=4000;noteLabel.htmlFor=notes.id;noteField.append(noteLabel,notes);review.append(risk.element,noteField);
  const status=node('p','assessment-status'),error=node('p','profile-message');error.setAttribute('role','alert');const reload=node('button','secondary-button','Actuele beoordeling laden');reload.type='button';reload.hidden=true;
  const missing=node('div','assessment-fields'),missingText=node('p','assessment-note','Selecteer eerst een barrieropstelling.'),openBarrier=node('button','secondary-button','Barrieropstelling openen');openBarrier.type='button';openBarrier.onclick=onBarrier;missing.append(missingText,openBarrier);
  const actions=node('div','assessment-actions'),edit=node('button','secondary-button','Vloerdruk bewerken'),complete=node('button','analysis-complete','Vloerdruk afronden');edit.type='button';complete.type='submit';actions.append(edit,complete);
  block.append(source,ticketLine,ticketDetail,missing,tableWrap,add,total,review,status,error,reload,actions);root.append(back,title,block);section.append(root);
  const snapshot=()=>({rows:rows.map(({id,name,visitors,area})=>({id,name,visitors,area})),riskLevel,note:riskLevel==='low'?'':note});
  const call=(operation,payload={})=>request({operation,concertId:show.key,...payload});
  function valid(){try{validateFloorData(snapshot(),type,true);return true;}catch{return false;}}
  function renderRows(){
    body.replaceChildren();rowControls=[];
    for(const [index,row]of rows.entries()){
      const tr=node('tr',''),visitorsCell=node('td',''),areaCell=node('td',''),resultCell=node('td',''),rowId='floor-'+row.id;
      if(type==='custom'&&index>0){const name=node('input','floor-row-name');name.value=row.name;name.maxLength=120;name.required=true;name.setAttribute('aria-label','Naam publieksvak');name.oninput=()=>{row.name=name.value;queue.later();update();};visitorsCell.append(name);rowControls.push(name);}else visitorsCell.append(node('label','',row.name));
      const visitors=node('input','');visitors.type='text';visitors.inputMode='numeric';visitors.required=true;visitors.id=rowId+'-visitors';visitors.value=row.visitors===null?'':numbers.format(row.visitors);visitors.setAttribute('aria-label',`Bezoekers ${row.name||'publieksvak'}`);
      const area=node('input','');area.type='text';area.inputMode='decimal';area.required=true;area.id=rowId+'-area';area.value=row.area===null?'':new Intl.NumberFormat('nl-NL',{maximumFractionDigits:20,useGrouping:false}).format(row.area);area.setAttribute('aria-label',`Netto oppervlakte in m² ${row.name||'publieksvak'}`);
      const output=node('output','');output.setAttribute('for',visitors.id+' '+area.id);
      visitors.oninput=()=>{row.visitors=parseVisitorCount(visitors.value);visitors.setCustomValidity(row.visitors===null?'Vul een geheel bezoekersaantal van nul of hoger in.':'');queue.later();calculate();update();};
      area.oninput=()=>{row.area=parseFloorArea(area.value);area.setCustomValidity(row.area===null||row.area<=0?'Vul een netto oppervlakte groter dan nul in.':'');queue.later();calculate();update();};
      visitors.onblur=()=>{if(row.visitors!==null)visitors.value=numbers.format(row.visitors);if(ready&&!record.completed&&!queue.failed)queue.save();};area.onblur=()=>{if(ready&&!record.completed&&!queue.failed)queue.save();};
      visitorsCell.append(visitors);areaCell.append(area);resultCell.append(output);tr.append(visitorsCell,areaCell,resultCell);body.append(tr);rowControls.push(visitors,area);rowControls.push({output,row});
      if(type==='custom'&&index>0){const remove=node('button','floor-row-remove','Publieksvak verwijderen');remove.type='button';remove.setAttribute('aria-label',`Verwijder ${row.name||'publieksvak'}`);remove.onclick=()=>{rows=rows.filter(item=>item.id!==row.id);renderRows();queue.save();update();};visitorsCell.append(remove);rowControls.push(remove);}
    }
    calculate();
  }
  function calculate(){
    for(const item of rowControls)if(item.output){const value=floorDensity(item.row.visitors,item.row.area);item.output.textContent=value===null?'—':densityFormat.format(value)+' bezoekers/m²';}
    const filled=rows.every(row=>row.visitors!==null),sum=filled?rows.reduce((n,row)=>n+row.visitors,0):null;total.replaceChildren();
    total.append(node('p','',`Totaal ingevoerd: ${sum===null?'—':numbers.format(sum)} bezoekers · Verkochte tickets: ${tickets?.soldTickets===null||tickets?.soldTickets===undefined?'niet beschikbaar':numbers.format(tickets.soldTickets)}`));
    if(sum!==null&&tickets?.soldTickets!==null&&tickets?.soldTickets!==undefined&&sum!==tickets.soldTickets)total.append(node('p','assessment-note',`Let op: ${numbers.format(sum)} bezoekers ingevoerd tegenover ${numbers.format(tickets.soldTickets)} verkochte tickets.`));
  }
  function update(){
    if(disposed)return;const seated=type==='seated',available=Boolean(type)&&!seated,locked=!ready||reading||queue?.exclusive||record?.completed;
    source.textContent=type?'Barrieropstelling: '+barrierTypes.find(row=>row.value===type)?.label+(record?.invalidatedAt?' · Gewijzigde opstelling: controleer de behouden invoer en rond opnieuw af.':''):'';missing.hidden=Boolean(type)||!ready;
    for(const el of [tableWrap,total,review,ticketLine,ticketDetail])el.hidden=!available;add.hidden=!available||type!=='custom'||Boolean(record?.completed);add.disabled=locked;
    for(const control of rowControls)if(!control.output)control.disabled=locked;risk.update(riskLevel,locked);
    noteField.hidden=!['none','medium','high'].includes(riskLevel);noteLabel.textContent=riskLevel==='none'?'Toelichting':'Beheersmaatregelen';notes.required=!noteField.hidden;notes.disabled=locked;
    complete.hidden=!available||Boolean(record?.completed);complete.disabled=locked||queue?.busy||queue?.failed||!valid();edit.hidden=!available||!record?.completed;edit.disabled=reading||queue?.busy;back.disabled=Boolean(queue?.exclusive);
    status.textContent=seated?'✓ Vloerdruk niet van toepassing bij Seated — Geen risico':record?.completed?'✓ Vloerdruk afgerond':queue?.failed?'Opslag niet bevestigd':queue?.busy?'Concept wordt opgeslagen…':record?.revision?'Concept opgeslagen':'';status.classList.toggle('assessment-completed',Boolean(record?.completed));
  }
  function accept(data,replace){
    if(!data||!data.basis||!data.tickets)throw Error('Onvolledige opslagbevestiging.');record=data.record;basis=data.basis;tickets=data.tickets;type=data.barrierType;
    if(disposed)return;
    if(replace){rows=(record?.rows||[]).map(({id,name,visitors,area})=>({id,name,visitors,area}));riskLevel=record?.riskLevel||null;note=record?.note||'';notes.value=note;renderRows();}
    const text=floorTicketText(tickets);ticketValue.textContent=text.main;ticketDetail.textContent=text.detail;
    onStored(record);update();
  }
  async function load(){
    if(reading)return;reading=true;ready=false;error.textContent='';reload.hidden=true;const finish=loading?.start();update();
    try{const data=await call('read');if(disposed)return;queue?.dispose();accept(data,true);queue=createAssessmentQueue({snapshot,send:(operation,payload)=>call(operation,{...payload,revision:record?.revision||0,basis}),stored:accept,changed:update,error:message=>{error.textContent=message+' Je invoer blijft hier staan. Laad de actuele beoordeling om opnieuw te beginnen.';reload.hidden=false;}});ready=true;}
    catch(failure){if(!disposed){error.textContent=failure.message;reload.hidden=false;}}
    finally{reading=false;finish?.();update();}
  }
  add.onclick=()=>{rows.push({id:'custom_'+crypto.randomUUID().replaceAll('-',''),name:'',visitors:null,area:null});renderRows();queue.save();update();};
  notes.oninput=()=>{note=notes.value;queue.later();update();};notes.onblur=()=>{if(ready&&record&&!record.completed&&!queue.failed)queue.save();};
  block.onsubmit=event=>{event.preventDefault();if(complete.disabled||!block.reportValidity())return;void queue.action('complete',{data:snapshot()});};edit.onclick=()=>queue.action('reopen');reload.onclick=load;
  update();void load();title.focus({preventScroll:true});
  return()=>{disposed=true;const pending=queue?.dispose();loading?.dispose();return pending;};
}
