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
 if(!securityReportFilters.some(row=>row.id===filter))return[];
 return incidents.filter(incident=>Array.isArray(incident.securityFilters)&&incident.securityFilters.includes(filter));
}
