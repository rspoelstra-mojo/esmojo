import {medicalReportTags} from '../shared/report-medical.js';
import {securityReportTags} from '../shared/report-security.js';
import {getMojoPhoto} from './mojo-photo.js';
import {reportPages} from '../shared/report-routes.js';
import {calculateReport,displayValue} from './ontrack-report/data.js';
// Alleen vaste voorbeeldkeuze; automatische rapport-/CSV-koppeling volgt later.
const examples={jungle:{key:reportPages.find(report=>report.slug==='jungle').concertId,name:'Jungle',venue:'Ziggo Dome',dates:reportPages.find(report=>report.slug==='jungle').dates,sourceUrl:'https://www.mojo.nl/concerten/jungle'}};
export function validateWebReportRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).join(',')!=='slug'||typeof input.slug!=='string'||!Object.hasOwn(examples,input.slug))throw Error('VALIDATION');
 return input.slug;
}
export function webReportTypes(incidents,division){
 const groups=new Map();
 incidents.forEach((incident,index)=>{
  if(!String(incident.division||'').toLocaleLowerCase('nl-NL').includes(division))return;
  const name=displayValue(incident.type),position=incident.position??index;
  if(!groups.has(name))groups.set(name,{name,count:0,first:position});
  const group=groups.get(name);group.count++;group.first=Math.min(group.first,position);
 });
 const sorted=[...groups.values()].sort((a,b)=>b.count-a.count||a.first-b.first),repeated=sorted.filter(group=>group.count>1);
 return(repeated.length>=5?repeated:sorted.slice(0,5)).map(({name,count})=>({name,count}));
}
export function createWebReportService({store,photo=getMojoPhoto}){
 return async(actor,input)=>{
  const slug=validateWebReportRequest(input),[sourceResult,photoResult,timetableResult]=await Promise.allSettled([store('web-preview',actor,{slug}),photo(examples[slug].sourceUrl),store('timetable-read',actor,{concertId:examples[slug].key})]);
  if(sourceResult.status==='rejected')throw sourceResult.reason;const source=sourceResult.value;
  if(typeof source?.csvBase64!=='string'||source.csvBase64.length>2800000||!Number.isFinite(Date.parse(source.modifiedAt)))throw Error('REPORT_UNAVAILABLE');
  const report=calculateReport(Buffer.from(source.csvBase64,'base64'),{generatedAt:source.modifiedAt});
  if(timetableResult.status==='rejected'&&timetableResult.reason?.message==='FORBIDDEN')throw timetableResult.reason;
  const photoData=photoResult.status==='fulfilled'?photoResult.value:null,timetable=timetableResult.status==='fulfilled'?timetableResult.value?.timetable||null:null;
  return{show:examples[slug],photo:photoData,report:{timetable,kpis:report.kpis,types:{medical:webReportTypes(report.incidents,'medisch'),security:webReportTypes(report.incidents,'beveiliging')},timeline:report.timeline,locations:report.locations,
   incidents:report.incidents.map(incident=>{const {id,localDate,time,zone,type,priority,description,note,highlight}=incident;return{id,localDate,time,zone,type,priority,description,note,highlight,securityFilters:securityReportTags(incident),medicalFilters:medicalReportTags(incident)};}),
  }};
 };
}
