import {webReportTimeline} from '../shared/report-timeline.js';
import {medicalReportTags} from '../shared/report-medical.js';
import {securityReportTags} from '../shared/report-security.js';
import {getMojoPhoto} from './mojo-photo.js';
import {reportVenueName} from '../shared/report-filename.js';
import {legacyReportId} from '../shared/report-routes.js';
import {validateReportDay} from './web-report-catalogue.js';
import {createHash} from 'node:crypto';
import {calculateReport,displayValue} from './ontrack-report/data.js';
export function validateWebReportRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('VALIDATION');
 const key=Object.keys(input).join(','),id=key==='slug'?legacyReportId(input.slug):key==='concertId'?input.concertId:null;
 if(typeof id!=='string'||!id||id.length>240||/[\x00-\x1f/\\]/.test(id))throw Error('VALIDATION');return id;
}
export function webReportTypes(incidents,division){
 const groups=new Map();
 incidents.forEach((incident,index)=>{
  if(!String(incident.division||'').toLocaleLowerCase('nl-NL').includes(division))return;
  const name=displayValue(incident.type),position=incident.position??index;
  if(!groups.has(name))groups.set(name,{name,count:0,first:position});
  const group=groups.get(name);group.count++;group.first=Math.min(group.first,position);
 });
 const sorted=[...groups.values()].sort((a,b)=>b.count-a.count||a.first-b.first);
 return sorted.slice(0,5).map(({name,count})=>({name,count}));
}
export function createWebReportService({store,photo=getMojoPhoto}){
 return async(actor,input)=>{
  const concertId=validateWebReportRequest(input),source=await store('web-read',actor,{concertId}),show=source.show;
  if(show?.key!==concertId||typeof show.name!=='string'||!show.name||typeof show.venue!=='string'||typeof source?.csvBase64!=='string'||source.csvBase64.length>2800000||!Number.isFinite(Date.parse(source.modifiedAt))||!Array.isArray(source.series?.shows)||!source.series.shows.some(row=>row.concertId===concertId&&row.date===show.date))throw Error('REPORT_UNAVAILABLE');
  const bytes=Buffer.from(source.csvBase64,'base64');if(createHash('sha256').update(bytes).digest('hex')!==source.sourceHash)throw Error('SOURCE_CHANGED');
  const report=validateReportDay(calculateReport(bytes,{generatedAt:source.modifiedAt}),show.date);
  let photoData=source.photo||null;try{if(!photoData)photoData=await photo(show.sourceUrl);}catch{/* Optionele foto mag het rapport niet blokkeren. */}
  return{show:{key:show.key,name:show.name,venue:reportVenueName({name:show.venue}),dates:source.series.dates},selectedDate:show.date,availableShows:source.series.shows,photo:photoData,report:{timetable:source.timetable||null,kpis:report.kpis,types:{medical:webReportTypes(report.incidents,'medisch'),security:webReportTypes(report.incidents,'beveiliging')},timeline:webReportTimeline(report,source.timetable,show.date),locations:report.locations,
   incidents:report.incidents.map(incident=>{const {id,localDate,time,zone,type,priority,description,note,highlight}=incident;return{id,localDate,time,zone,type,priority,description,note,highlight,securityFilters:securityReportTags(incident),medicalFilters:medicalReportTags(incident)};}),
  }};
 };
}
