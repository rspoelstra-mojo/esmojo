import {medicalReportFilters} from '../../shared/report-medical.js';
import {securityReportFilters} from '../../shared/report-security.js';
// Alleen webpresentatie; bronrecords, KPI’s, grafieken en PDF blijven ongewijzigd.
const contains=(value,keyword)=>String(value||'').toLocaleLowerCase('nl-NL').includes(keyword);
export function visibleReportIncidents(incidents){
 return incidents.filter(incident=>!['zelfzorg','kolven'].some(keyword=>contains(incident.type,keyword))&&!['pleister','pcm','paracetamol','paracetemol'].some(keyword=>contains(incident.description,keyword)));
}
export function shortIncidentDate(date){
 return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).formatToParts(new Date(date+'T12:00:00Z')).map(part=>part.type==='month'?part.value.replace(/\.$/,''):part.value).join('');
}
export const highlightedReportIncident=incident=>['high','critical'].includes(String(incident.priority||'').trim().toLowerCase());
export function reportPhoto(photo){
 try{
  const image=new URL(photo.imageUrl),source=new URL(photo.sourceUrl);
  if(image.origin!=='https://www.mojo.nl'||image.username||image.password||!/^\/media\/[\w/.-]+\.(?:jpe?g|png|webp)$/i.test(image.pathname)||source.origin!=='https://www.mojo.nl'||source.username||source.password||!/^\/concerten\/[\w%/-]+$/.test(source.pathname))return null;
  return{imageUrl:image.href,sourceUrl:source.href};
 }catch{return null;}
}

export function selectedReportIncidents(incidents,filter=null){
 if(!filter)return visibleReportIncidents(incidents);
 const field=medicalReportFilters.some(row=>row.id===filter)?'medicalFilters':securityReportFilters.some(row=>row.id===filter)?'securityFilters':null;
 if(!field)return[];
 return incidents.filter(incident=>Array.isArray(incident[field])&&incident[field].includes(filter));
}

export function reportPriorityLabel(priority){
 const value=typeof priority==='string'?priority.trim():'';
 const labels={low:'Laag',medium:'Midden',high:'Hoog',critical:'Kritisch'},key=value.toLowerCase();
 return Object.hasOwn(labels,key)?labels[key]:value||'Niet opgegeven';
}

// Nieuwste echte showdatum eerst, zonder opvullen of archiefbediening.
export const reportTabDates=(dates,selectedDate)=>{
 const sorted=[...new Set(dates)].sort((a,b)=>b.localeCompare(a)),latest=sorted.slice(0,5);
 return selectedDate&&sorted.includes(selectedDate)&&!latest.includes(selectedDate)?[...latest.slice(0,4),selectedDate].sort((a,b)=>b.localeCompare(a)):latest;
};
