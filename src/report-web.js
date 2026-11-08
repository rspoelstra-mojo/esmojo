import {createMailOpenReceipt} from './lib/mail-open-receipt.js';
import {reportChronology,timetableEntryLabel} from '../shared/show-timetable.js';
import {medicalReportFilters} from '../shared/report-medical.js';
import {createReportDateTabs} from './report-date-tabs.js';
import {securityReportFilters} from '../shared/report-security.js';
import {selectedReportIncidents,shortIncidentDate,highlightedReportIncident,reportPhoto,reportPriorityLabel,reportTabDates} from './lib/report-view.js';
import './report-web.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {donutChart,timelineChart} from './report-charts.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const reportFilters=[...medicalReportFilters,...securityReportFilters];
const value=text=>typeof text==='string'&&text.trim()?text:'Niet opgegeven';
function card(title,className=''){const element=node('section','report-card '+className),heading=node('h2','report-card-title',title);element.append(heading);return element;}
function statCard(title,statistics,labels,className,onFilter){
 const element=card(title,className),header=node('div','report-stat-header');header.append(element.firstChild,node('strong','report-total',String(statistics.total)));element.append(header);
 const rows=node(onFilter?'ul':'dl','report-stat-list'+(onFilter?' report-filter-list':''));
 for(const [field,label]of labels){
  if(onFilter){
   const item=node('li',''),button=node('button','report-stat-filter');button.type='button';button.dataset.reportFilter=field;button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls','report-incident-list');button.title='Filter incidenten: '+label;
   const amount=node('span','report-filter-amount',String(statistics[field])),glyph=node('span','report-filter-glyph');glyph.setAttribute('aria-hidden','true');glyph.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h14l-5 6v5l-4 2v-7L3 4Z"/></svg>';
   amount.append(glyph);button.append(node('span','',label),amount);button.onclick=()=>onFilter(field);item.append(button);rows.append(item);
  }else{const row=node('div','report-stat-row');row.append(node('dt','',label),node('dd','',String(statistics[field])));rows.append(row);}
 }
 element.append(rows);return element;
}
function typesCard(title,groups,className){
 const element=card(title,className);element.append(node('p','report-card-caption','Meest gemelde incidenttypes'));
 const content=node('div','report-types-body');content.append(donutChart(groups,title));
 const legend=node('ul','report-type-legend');for(const [index,row]of groups.entries()){const item=node('li',''),name=node('span','report-type-name'),swatch=node('span','report-swatch report-series-'+index%5);swatch.setAttribute('aria-hidden','true');name.append(swatch,node('span','',row.name));item.append(name,node('strong','',String(row.count)));legend.append(item);}
 if(!groups.length)legend.append(node('li','report-muted','Geen incidenttypes geregistreerd'));content.append(legend);element.append(content);return element;
}
function incidentCard(incident,index){
 const element=node('article','report-card report-incident');element.dataset.incidentId=incident.id;if(highlightedReportIncident(incident))element.dataset.highlight='true';
 const heading=node('h3','visually-hidden',`Incident ${index+1} · ${value(incident.zone)} · ${incident.time}`);element.append(heading);
 const fields=node('dl','report-incident-fields');
 for(const [key,label,content]of [['location','Locatie & tijd',null],['type','Incident type',value(incident.type)],['description','Omschrijving',value(incident.description)],['priority','Prioriteit',reportPriorityLabel(incident.priority)],['note','Afhandeling',value(incident.note)]]){
  const field=node('div','report-incident-field report-field-'+key),definition=node('dd','');field.append(node('dt','',label),definition);
  if(key==='location'){const time=node('time','report-incident-time',shortIncidentDate(incident.localDate)+' · '+incident.time);time.dateTime=incident.localDate+'T'+incident.time;definition.append(node('span','',value(incident.zone)),time);}else definition.textContent=content;
  fields.append(field);
 }
 element.append(fields);return element;
}
export function renderWebReport(parent,data,{loadDate=null,onSelected=()=>{}}={}){
 const {show}=data,view=node('section','web-report'),header=node('header','report-heading'),intro=node('div','report-heading-intro'),venue=node('p','report-show-meta',show.venue);
 intro.append(node('p','report-eyebrow','Showrapportage'),node('h1','',show.name),venue);header.append(intro);let photoLink=null;
 function updateHeader(day){
  venue.textContent=day.show?.venue||show.venue;photoLink?.remove();photoLink=null;header.classList.remove('report-heading-photo');const photo=reportPhoto(day.photo);if(!photo)return;
  const link=node('a','report-artist-photo'),image=node('img','');link.href=photo.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`Foto van ${show.name} op MOJO`);
  image.src=photo.imageUrl;image.alt=show.name;image.width=600;image.height=338;image.decoding='async';image.referrerPolicy='no-referrer';image.onerror=()=>{if(photoLink===link){link.remove();photoLink=null;header.classList.remove('report-heading-photo');}};link.append(image);header.classList.add('report-heading-photo');header.append(link);photoLink=link;
 }
 updateHeader(data);const panel=node('section','report-date-content');panel.id='report-date-panel';panel.setAttribute('role','tabpanel');let disposeDaily=()=>{},disposed=false,selection=0;
 const tabDates=reportTabDates(show.dates,data.selectedDate),slots=(data.availableShows||[]).filter(row=>tabDates.includes(row.date)&&row.performance);
 const slotByKey=new Map(slots.map(row=>[row.concertId,row]));
 const dates=tabDates.flatMap(date=>{const same=slots.filter(row=>row.date===date).sort((a,b)=>a.concertId.localeCompare(b.concertId));return same.length?same.map(row=>row.concertId):[date];});
 const labels=Object.fromEntries(slots.map(row=>[row.concertId,new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(row.date+'T12:00:00Z'))+' ('+row.performance+')']));
 const days=new Map(),pending=new Map(),loaders=new Map();
 for(const date of dates){if(data.reportsByDate?.[date])days.set(date,{show,photo:data.photo,report:data.reportsByDate[date]});}
 const initial=slotByKey.has(show.key)?show.key:data.selectedDate||(dates.length===1?dates[0]:null);if(initial&&data.report)days.set(initial,data);
 const tabs=createReportDateTabs(dates,(date,_index,tabId)=>{void selectDay(date,tabId);},labels);
 async function selectDay(date,tabId){
  const ticket=++selection,tab=[...tabs.element.querySelectorAll('button')].find(button=>button.id===tabId);panel.setAttribute('aria-labelledby',tabId);
  if(!days.has(date)&&loadDate){
   if(!loaders.has(date))loaders.set(date,createSubmenuLoading(tab,tab));const loader=loaders.get(date),finish=loader.start();panel.setAttribute('aria-busy','true');
   try{if(!pending.has(date))pending.set(date,Promise.resolve().then(()=>loadDate(slotByKey.get(date)?.date||date,slotByKey.get(date)?.concertId)).finally(()=>pending.delete(date)));const next=await pending.get(date);if(disposed)return;days.set(date,next);}
   catch{if(!disposed&&ticket===selection){disposeDaily();const message=node('p','form-message','Deze showrapportage kon niet worden geladen.'),retry=node('button','secondary-button','Opnieuw laden');message.setAttribute('role','alert');retry.type='button';retry.onclick=()=>void selectDay(date,tabId);panel.replaceChildren(message,retry);disposeDaily=()=>{};}return;}
   finally{finish();if(!disposed&&ticket===selection)panel.removeAttribute('aria-busy');}
  }
  if(disposed||ticket!==selection)return;disposeDaily();const day=days.get(date);
  if(day?.report){updateHeader(day);disposeDaily=renderDailyReport(panel,day.report);onSelected(slotByKey.get(date)?.date||date,day.show?.key||data.availableShows?.find(show=>show.date===date)?.concertId);}
  else{panel.replaceChildren(node('p','report-muted','Voor deze showdatum is nog geen rapportage beschikbaar.'));disposeDaily=()=>{};}
 }
 header.append(tabs.element);view.append(header,panel);parent.replaceChildren(view);tabs.select(dates.includes(initial)?initial:dates[0]);
 return()=>{disposed=true;selection++;tabs.dispose();for(const loader of loaders.values())loader.dispose();disposeDaily();days.clear();pending.clear();view.replaceChildren();};
}
function renderDailyReport(parent,report){
 const view=node('div','report-day'),disposers=[];let activeFilter=null;
 const selectFilter=filter=>{activeFilter=activeFilter===filter?null:filter;updateIncidents();incidents.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
 const grid=node('div','report-summary-grid');
 grid.append(statCard('Medisch',report.kpis.medical,medicalReportFilters.map(({id,label})=>[id,label]),'report-medical',selectFilter),
  statCard('Beveiliging',report.kpis.security,securityReportFilters.map(({id,label})=>[id,label]),'report-security',selectFilter),
  typesCard('Medisch · incidenttypes',report.types.medical,'report-medical-types'),typesCard('Beveiliging · incidenttypes',report.types.security,'report-security-types'));
 const timeline=card('Showverloop','report-timeline'),chart=node('div','report-line-chart');timeline.append(chart,node('p','report-card-caption','Aantal incidenten per halfuur'));
 const legend=node('div','report-line-legend');for(const [label,index]of [['Medisch',0],['Beveiliging',2]]){const item=node('span',''),line=node('span','report-line-key report-series-'+index);line.setAttribute('aria-hidden','true');item.append(line,node('span','',label));legend.append(item);}timeline.append(legend);
 const locations=card('Locaties incidenten','report-locations'),locationList=node('dl','report-location-list');for(const row of report.locations){const pair=node('div','');pair.append(node('dt','',row.name),node('dd','',String(row.count)));locationList.append(pair);}locations.append(locationList);grid.append(timeline,locations);view.append(grid);
 const incidents=node('section','report-incidents'),incidentHeader=node('div','report-incident-header'),title=node('h2','','Individuele incidenten');
 const filterControls=node('div','report-filter-controls'),filterSelect=node('select','report-filter-select'),clear=node('button','report-clear-filter','Filter wissen');filterControls.setAttribute('role','group');filterControls.setAttribute('aria-label','Incidentfilter');filterSelect.setAttribute('aria-label','Filter individuele incidenten');filterSelect.setAttribute('aria-controls','report-incident-list');
 for(const filter of [{id:'',label:'Alle incidenten'},...reportFilters]){const option=node('option','',filter.label);option.value=filter.id;filterSelect.append(option);}
 filterSelect.onchange=()=>{activeFilter=filterSelect.value||null;updateIncidents();};clear.type='button';clear.onclick=()=>{activeFilter=null;updateIncidents();filterSelect.focus();};filterControls.append(filterSelect,clear);
 const counter=node('span','report-incident-count');counter.setAttribute('role','status');counter.setAttribute('aria-live','polite');counter.setAttribute('aria-atomic','true');
 incidentHeader.append(title,filterControls,counter);incidents.append(incidentHeader);
 const timetableInfo=node('p','report-timetable-caption');
 if(report.timetable?.status==='available'){const captured=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Amsterdam'}).format(new Date(report.timetable.capturedAt));timetableInfo.textContent='Geplande tijden volgens MOJO · vastgelegd '+captured;}
 else timetableInfo.textContent='Geen op de showdag opgeslagen MOJO-tijdschema beschikbaar.';
 incidents.append(timetableInfo);
 const explanation=node('p','report-filter-explanation'),list=node('div','report-incident-list');list.id='report-incident-list';incidents.append(explanation,list);view.append(incidents);parent.replaceChildren(view);
 function updateIncidents(){
  const selection=reportFilters.find(filter=>filter.id===activeFilter),rows=selectedReportIncidents(report.incidents,activeFilter);
  for(const button of view.querySelectorAll('[data-report-filter]'))button.setAttribute('aria-pressed',String(button.dataset.reportFilter===activeFilter));
  filterSelect.value=activeFilter||'';clear.hidden=!selection;counter.textContent=`${rows.length} ${rows.length===1?'incident':'incidenten'}`;counter.setAttribute('aria-label',(selection?selection.label+': ':'')+counter.textContent);
  const statistics=activeFilter==='ambulance'?report.kpis.medical:report.kpis.security;
  explanation.hidden=!(['evictions','arrests','ambulance'].includes(activeFilter)&&statistics[activeFilter]!==rows.length);explanation.textContent=explanation.hidden?'':'Het cijfer hierboven telt personen; dit overzicht toont de bijbehorende incidenten.';
  list.replaceChildren();for(const item of reportChronology(rows,report.timetable)){if(item.type==='incident')list.append(incidentCard(item.value,item.index));else{const marker=node('div','report-timetable-marker');marker.setAttribute('role','heading');marker.setAttribute('aria-level','3');const time=node('time','',item.value.time);time.dateTime=item.value.localDate+'T'+item.value.time;marker.append(time,document.createTextNode(' - '+timetableEntryLabel(item.value)));list.append(marker);}}if(!rows.length)list.append(node('p','report-muted',selection?'Geen incidenten voor '+selection.label.toLocaleLowerCase('nl-NL')+'.':'Geen incidenten om te tonen.'));
 }
 updateIncidents();
 disposers.push(timelineChart(chart,report.timeline));
 return()=>{for(const dispose of disposers)dispose();view.replaceChildren();};
}
export function createWebReportPage(content,submenuLink,{concertId,request=access,onSelected=()=>{}}={}){
 const receipt=createMailOpenReceipt({concertId,request});
 let disposed=false,cleanup=()=>{},currentConcertId=concertId,revision=0,rendered=false,loading=createSubmenuLoading(submenuLink,content);
 async function load(){
  const ticket=++revision,finish=loading.start(),id=currentConcertId;
  try{const data=await request('report-web',{method:'POST',body:{concertId:id}});if(disposed||ticket!==revision)return;cleanup();
   cleanup=renderWebReport(content,data,{onSelected:(date,id)=>{currentConcertId=id;onSelected(date,id);},loadDate:async(date,concertId)=>{const show=data.availableShows.find(show=>concertId?show.concertId===concertId:show.date===date);if(!show)throw Error('NOT_FOUND');return request('report-web',{method:'POST',body:{concertId:show.concertId}});}});rendered=true;if(data.report)receipt.shown();document.title=`${data.show.name} · Rapportages · ESMOJO`;
  }
  catch{if(!disposed&&ticket===revision){const message=node('p','form-message','De rapportage kon niet worden geladen. Probeer opnieuw.'),retry=node('button','secondary-button','Opnieuw laden');message.setAttribute('role','alert');retry.type='button';retry.onclick=()=>void load();if(!rendered)content.replaceChildren(message,retry);}}
  finally{finish();}
 }
 void load();const dispose=()=>{disposed=true;receipt.dispose();revision++;cleanup();loading.dispose();content.replaceChildren();};
 dispose.reload=(nextId,nextLink)=>{currentConcertId=nextId;if(nextLink!==submenuLink){loading.dispose();submenuLink=nextLink;loading=createSubmenuLoading(submenuLink,content);}void load();};return dispose;
}
