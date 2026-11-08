import {medicalReportFilters} from '../shared/report-medical.js';
import {securityReportFilters} from '../shared/report-security.js';
import {reportHref} from '../shared/report-routes.js';
import {detailBackButton} from './detail-back.js';
const missing='Geen informatie beschikbaar';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
export function renderArtistShowOverview(data,{onBack=()=>{}}={}){
 const panel=node('section','artist-show-overview'),bar=node('div','analysis-editor-header artist-show-toolbar'),back=detailBackButton(node('button','profile-back artist-show-back'));
 back.setAttribute('aria-label','Terug naar artiestoverzicht');back.title='Terug naar artiestoverzicht';back.onclick=onBack;
 const date=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(data.show.date+'T12:00:00Z'));
 const title=node('h2','artist-show-title',date+(data.show.performance?' ('+data.show.performance+')':'')+' · '+data.show.venue);title.tabIndex=-1;bar.append(back,title);panel.append(bar);
 const grid=node('div','artist-show-grid');
 const preparation=data.preparation,generalData=preparation?.general,productionData=preparation?.production,pending='Nog toe te voegen';
 const numbers=new Intl.NumberFormat('nl-NL'),densityFormat=new Intl.NumberFormat('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2});
 const value=text=>text===null||text===undefined||text===''?pending:String(text);
 const fields=(parent,rows)=>{const list=node('dl','artist-show-facts');for(const [label,text]of rows){const row=node('div');row.append(node('dt','',label+':'),node('dd','',value(text)));list.append(row);}parent.append(list);};
 const card=(label,kind)=>{const el=node('section','artist-profile-card artist-show-card artist-show-'+kind);el.append(node('h3','',label));grid.append(el);return el;};
 const general=card('Algemene informatie','general');
 const projectLeadLabel=data.show.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder'?'Projectleider The Firm':'Projectleider TSC';
 fields(general,[['Productie manager',generalData?.productionManager],['Event Safety manager',generalData?.eventSafetyManager],[projectLeadLabel,generalData?.tscProjectLead],['Verkochte kaarten',generalData?.soldTickets==null?null:numbers.format(generalData.soldTickets)],['Percentage buitenlands',generalData?.foreignPercentage==null?null:numbers.format(generalData.foreignPercentage)+'%']]);
 const timetable=card('Tijdschema','timetable');
 if(data.timetable?.status==='available'&&data.timetable.entries?.length){const list=node('dl','artist-show-facts');for(const entry of data.timetable.entries){const row=node('div');row.append(node('dt','',entry.publishedLabel),node('dd','',entry.time));list.append(row);}timetable.append(list);}else timetable.append(node('p','',missing));
 const statistic=(label,kind,fields)=>{const el=card(label,kind),values=data.kpis?.[kind];if(!values){el.append(node('p','',missing));return;}
  const header=node('div','artist-show-stat-heading');header.append(el.firstChild,node('strong','artist-show-total',String(values.total)));el.append(header);
  const list=node('dl','artist-show-stat-list');for(const {id,label}of fields){const row=node('div');row.append(node('dt','',label),node('dd','',String(values[id])));list.append(row);}el.append(list);
 };
 statistic('Beveiliging','security',securityReportFilters);
 const production=card('Productioneel','production');
 const yesNo=answer=>typeof answer==='boolean'?answer?'Ja':'Nee':null;
 const standing=productionData?.densities?.find(row=>row.name?.trim().toLocaleLowerCase('nl-NL')==='staanplaatsen');
 const densities=productionData?.seated?'N.v.t. (Seated)':standing?densityFormat.format(standing.density)+' bezoekers/m²':null;
 fields(production,[['Ingangsconstructie',productionData?.entrance],['Barrieropstelling',productionData?.barrier],['Vloerdruk',densities],['Vuurwerk',yesNo(productionData?.fireworks)],['Open vuur',yesNo(productionData?.openFire)],['Drones',yesNo(productionData?.drones)]]);
 statistic('Medisch','medical',medicalReportFilters);
 const risks=card('Risico analyse','risks'),tiles=node('dl','artist-risk-tiles');
 for(const [key,label]of [['low','Laag risico’s'],['medium','Midden risico’s'],['high','Hoog risico’s'],['measures','Beheersmaatregelen']]){
  const tile=node('div','artist-risk-tile artist-risk-'+key),amount=preparation?.riskCounts?.[key];
  tile.append(node('dt','',label),node('dd','',amount==null?'—':numbers.format(amount)));tiles.append(tile);
 }
 risks.append(tiles);
 if(!preparation?.riskCounts)risks.append(node('p','artist-preparation-pending',pending));
 else if(preparation.riskCounts.unassessed)risks.append(node('p','artist-preparation-pending',numbers.format(preparation.riskCounts.unassessed)+' onderdelen nog te beoordelen.'));
 const report=node(data.reportId?'a':'button','artist-show-report-link','Ga naar rapportage');
 if(data.reportId)report.href=reportHref({concertId:data.reportId});else{report.type='button';report.disabled=true;report.title='Geen rapportage beschikbaar';}
 const showLink=node(preparation?.showId?'a':'button','artist-show-report-link artist-show-open-link','Ga naar show');
 if(preparation?.showId)showLink.href='/shows/'+encodeURIComponent(preparation.showId);else{showLink.type='button';showLink.disabled=true;showLink.title='Nog geen showprofiel gekoppeld';}
 grid.append(report,showLink);panel.append(grid);return panel;
}
