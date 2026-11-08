import {medicalReportFilters} from '../shared/report-medical.js';
import {securityReportFilters} from '../shared/report-security.js';
import {reportHref} from '../shared/report-routes.js';
import {timetableEntryLabel} from '../shared/show-timetable.js';
const missing='Geen informatie beschikbaar';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
export function renderArtistShowOverview(data,{onBack=()=>{}}={}){
 const panel=node('section','artist-show-overview'),bar=node('div','artist-show-toolbar'),back=node('button','artist-show-back','Terug naar artiestoverzicht');
 back.type='button';back.onclick=onBack;
 const date=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(data.show.date+'T12:00:00Z'));
 const title=node('h2','artist-show-title',date+' · '+data.show.venue);title.tabIndex=-1;bar.append(back,title);panel.append(bar);
 const grid=node('div','artist-show-grid');
 const card=(label,kind)=>{const el=node('section','artist-profile-card artist-show-card artist-show-'+kind);el.append(node('h3','',label));grid.append(el);return el;};
 const general=card('Algemene informatie','general'),facts=node('dl','artist-show-facts');
 for(const [label,value]of [['Artiest',data.show.name],['Locatie',data.show.venue],['Datum',date]]){const row=node('div');row.append(node('dt','',label),node('dd','',value));facts.append(row);}general.append(facts);
 const timetable=card('Tijdschema','timetable');
 if(data.timetable?.status==='available'&&data.timetable.entries?.length){const list=node('dl','artist-show-facts');for(const entry of data.timetable.entries){const row=node('div');row.append(node('dt','',timetableEntryLabel(entry)),node('dd','',entry.time));list.append(row);}timetable.append(list);}else timetable.append(node('p','',missing));
 const statistic=(label,kind,fields)=>{const el=card(label,kind),values=data.kpis?.[kind];if(!values){el.append(node('p','',missing));return;}
  const header=node('div','artist-show-stat-heading');header.append(el.firstChild,node('strong','artist-show-total',String(values.total)));el.append(header);
  const list=node('dl','artist-show-stat-list');for(const {id,label}of fields){const row=node('div');row.append(node('dt','',label),node('dd','',String(values[id])));list.append(row);}el.append(list);
 };
 statistic('Beveiliging','security',securityReportFilters);card('Titel A','placeholder-a');statistic('Medisch','medical',medicalReportFilters);card('Titel B','placeholder-b');
 const report=node(data.reportId?'a':'button','artist-show-report-link','Ga naar rapportage');
 if(data.reportId)report.href=reportHref({concertId:data.reportId});else{report.type='button';report.disabled=true;report.title='Geen rapportage beschikbaar';}
 grid.append(report);panel.append(grid);return panel;
}
