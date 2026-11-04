import {visibleReportIncidents,shortIncidentDate,highlightedReportIncident,reportPhoto} from './lib/report-view.js';
import './report-web.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {donutChart,timelineChart} from './report-charts.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const value=text=>typeof text==='string'&&text.trim()?text:'Niet opgegeven';
const formatDate=date=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
function card(title,className=''){const element=node('section','report-card '+className),heading=node('h2','report-card-title',title);element.append(heading);return element;}
function statCard(title,statistics,labels,className){
 const element=card(title,className),header=node('div','report-stat-header');header.append(element.firstChild,node('strong','report-total',String(statistics.total)));element.append(header);
 const rows=node('dl','report-stat-list');for(const [field,label]of labels){const row=node('div','report-stat-row');row.append(node('dt','',label),node('dd','',String(statistics[field])));rows.append(row);}element.append(rows);return element;
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
 for(const [key,label,content]of [['location','Locatie & tijd',null],['type','Incident type',value(incident.type)],['description','Omschrijving',value(incident.description)],['priority','Prioriteit',value(incident.priority)],['note','Notitie',value(incident.note)]]){
  const field=node('div','report-incident-field report-field-'+key),definition=node('dd','');field.append(node('dt','',label),definition);
  if(key==='location'){const time=node('time','report-incident-time',shortIncidentDate(incident.localDate)+' · '+incident.time);time.dateTime=incident.localDate+'T'+incident.time;definition.append(node('span','',value(incident.zone)),time);}else definition.textContent=content;
  fields.append(field);
 }
 element.append(fields);return element;
}
export function renderWebReport(parent,data){
 const {show,report}=data,view=node('section','web-report'),disposers=[];
 const header=node('header','report-heading'),intro=node('div','report-heading-intro');intro.append(node('p','report-eyebrow','Showrapportage'),node('h1','',show.name),node('p','report-show-meta',show.dates.map(formatDate).join(' · ')+' · '+show.venue));header.append(intro);
 const photo=reportPhoto(data.photo);
 if(photo){
  const link=node('a','report-artist-photo'),image=node('img','');link.href=photo.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`Foto van ${show.name} op MOJO`);
  image.src=photo.imageUrl;image.alt=show.name;image.width=600;image.height=338;image.decoding='async';image.referrerPolicy='no-referrer';
  image.onerror=()=>{link.remove();header.classList.remove('report-heading-photo');};link.append(image);header.classList.add('report-heading-photo');header.append(link);
 }
 view.append(header);
 const grid=node('div','report-summary-grid');
 grid.append(statCard('Medisch',report.kpis.medical,[['treatments','Behandelingen'],['selfcare','Zelfzorg'],['unwell','Onwelwordingen'],['ambulance','Ambulancetransporten']],'report-medical'),
  statCard('Beveiliging',report.kpis.security,[['verbal','Verbale agressie'],['physical','Fysieke agressie'],['evictions','Uitzettingen'],['arrests','Aanhoudingen']],'report-security'),
  typesCard('Medisch · incidenttypes',report.types.medical,'report-medical-types'),typesCard('Beveiliging · incidenttypes',report.types.security,'report-security-types'));
 const timeline=card('Showverloop','report-timeline'),chart=node('div','report-line-chart');timeline.append(chart,node('p','report-card-caption','Aantal incidenten per halfuur'));
 const legend=node('div','report-line-legend');for(const [label,index]of [['Medisch',0],['Beveiliging',2]]){const item=node('span',''),line=node('span','report-line-key report-series-'+index);line.setAttribute('aria-hidden','true');item.append(line,node('span','',label));legend.append(item);}timeline.append(legend);
 const locations=card('Locaties incidenten','report-locations'),locationList=node('dl','report-location-list');for(const row of report.locations){const pair=node('div','');pair.append(node('dt','',row.name),node('dd','',String(row.count)));locationList.append(pair);}locations.append(locationList);grid.append(timeline,locations);view.append(grid);
 const visibleIncidents=visibleReportIncidents(report.incidents);
 const incidents=node('section','report-incidents'),incidentHeader=node('div','report-incident-header');incidentHeader.append(node('h2','','Individuele incidenten'),node('span','report-incident-count',`${visibleIncidents.length} incidenten`));incidents.append(incidentHeader);
 const list=node('div','report-incident-list');visibleIncidents.forEach((incident,index)=>list.append(incidentCard(incident,index)));if(!visibleIncidents.length)list.append(node('p','report-muted','Geen incidenten om te tonen.'));incidents.append(list);view.append(incidents);parent.replaceChildren(view);
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
