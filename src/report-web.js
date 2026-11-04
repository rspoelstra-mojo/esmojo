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
export function renderWebReport(parent,data){
 const {show}=data,view=node('section','web-report'),header=node('header','report-heading'),intro=node('div','report-heading-intro');
 intro.append(node('p','report-eyebrow','Showrapportage'),node('h1','',show.name),node('p','report-show-meta',show.venue));header.append(intro);
 const photo=reportPhoto(data.photo);
 if(photo){
  const link=node('a','report-artist-photo'),image=node('img','');link.href=photo.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`Foto van ${show.name} op MOJO`);
  image.src=photo.imageUrl;image.alt=show.name;image.width=600;image.height=338;image.decoding='async';image.referrerPolicy='no-referrer';
  image.onerror=()=>{link.remove();header.classList.remove('report-heading-photo');};link.append(image);header.classList.add('report-heading-photo');header.append(link);
 }
 const panel=node('section','report-date-content');panel.id='report-date-panel';panel.setAttribute('role','tabpanel');let disposeDaily=()=>{};
 const dates=reportTabDates(show.dates);
 const tabs=createReportDateTabs(dates,(date,_index,tabId)=>{
  disposeDaily();panel.setAttribute('aria-labelledby',tabId);
  // Eén bronrapport nooit herhalen over andere showdagen; nachtincidenten blijven bij hun bronrapport.
  const report=data.reportsByDate?.[date]||(dates.length===1?data.report:null);
  if(report)disposeDaily=renderDailyReport(panel,report);
  else{panel.replaceChildren(node('p','report-muted','Voor deze showdatum is nog geen rapportage beschikbaar.'));disposeDaily=()=>{};}
 });
 header.append(tabs.element);view.append(header,panel);parent.replaceChildren(view);tabs.select(dates[0]);
 return()=>{tabs.dispose();disposeDaily();view.replaceChildren();};
}
function renderDailyReport(parent,report){
 const view=node('div','report-day'),disposers=[];let activeFilter=null;
 const selectFilter=filter=>{activeFilter=activeFilter===filter?null:filter;updateIncidents();incidents.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
 const grid=node('div','report-summary-grid');
 grid.append(statCard('Medisch',report.kpis.medical,[['treatments','Behandelingen'],['selfcare','Zelfzorg'],['unwell','Onwelwordingen'],['ambulance','Ambulancetransporten']],'report-medical',selectFilter),
  statCard('Beveiliging',report.kpis.security,[['verbal','Verbale agressie'],['physical','Fysieke agressie'],['evictions','Uitzettingen'],['arrests','Aanhoudingen']],'report-security',selectFilter),
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
 const explanation=node('p','report-filter-explanation'),list=node('div','report-incident-list');list.id='report-incident-list';incidents.append(explanation,list);view.append(incidents);parent.replaceChildren(view);
 function updateIncidents(){
  const selection=reportFilters.find(filter=>filter.id===activeFilter),rows=selectedReportIncidents(report.incidents,activeFilter);
  for(const button of view.querySelectorAll('[data-report-filter]'))button.setAttribute('aria-pressed',String(button.dataset.reportFilter===activeFilter));
  filterSelect.value=activeFilter||'';clear.hidden=!selection;counter.textContent=`${rows.length} ${rows.length===1?'incident':'incidenten'}`;counter.setAttribute('aria-label',(selection?selection.label+': ':'')+counter.textContent);
  const statistics=activeFilter==='ambulance'?report.kpis.medical:report.kpis.security;
  explanation.hidden=!(['evictions','arrests','ambulance'].includes(activeFilter)&&statistics[activeFilter]!==rows.length);explanation.textContent=explanation.hidden?'':'Het cijfer hierboven telt personen; dit overzicht toont de bijbehorende incidenten.';
  list.replaceChildren();rows.forEach((incident,index)=>list.append(incidentCard(incident,index)));if(!rows.length)list.append(node('p','report-muted',selection?'Geen incidenten voor '+selection.label.toLocaleLowerCase('nl-NL')+'.':'Geen incidenten om te tonen.'));
 }
 updateIncidents();
 disposers.push(timelineChart(chart,report.timeline));
 return()=>{for(const dispose of disposers)dispose();view.replaceChildren();};
}
export function createWebReportPage(content,submenuLink,{slug='jungle',request=access}={}){
 let disposed=false,cleanup=()=>{};const loading=createSubmenuLoading(submenuLink,content);
 async function load(){
  cleanup();content.replaceChildren();const finish=loading.start();
  try{const data=await request('report-web',{method:'POST',body:{slug}});if(disposed)return;cleanup=renderWebReport(content,data);document.title=`${data.show.name} · Rapportages · ESMOJO`;}
  catch{if(!disposed){const message=node('p','form-message','De rapportage kon niet worden geladen. Probeer opnieuw.'),retry=node('button','secondary-button','Opnieuw laden');message.setAttribute('role','alert');retry.type='button';retry.onclick=()=>void load();content.replaceChildren(message,retry);}}
  finally{finish();}
 }
 void load();return()=>{disposed=true;cleanup();loading.dispose();content.replaceChildren();};
}
