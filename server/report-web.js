import {getMojoPhoto} from './mojo-photo.js';
import {reportPages} from '../shared/report-routes.js';
import {calculateReport,displayValue} from './ontrack-report/data.js';
// Alleen vaste voorbeeldkeuze; automatische rapport-/CSV-koppeling volgt later.
const examples={jungle:{key:reportPages.find(report=>report.slug==='jungle').concertId,name:'Jungle',venue:'Ziggo Dome',dates:['2026-11-03'],sourceUrl:'https://www.mojo.nl/concerten/jungle'}};
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
  const slug=validateWebReportRequest(input),source=await store('web-preview',actor,{slug});
  if(typeof source?.csvBase64!=='string'||source.csvBase64.length>2800000||!Number.isFinite(Date.parse(source.modifiedAt)))throw Error('REPORT_UNAVAILABLE');
  const report=calculateReport(Buffer.from(source.csvBase64,'base64'),{generatedAt:source.modifiedAt});
  let photoData=null;try{photoData=await photo(examples[slug].sourceUrl);}catch{/* Optionele foto mag het rapport niet blokkeren. */}
  return{show:examples[slug],photo:photoData,report:{kpis:report.kpis,types:{medical:webReportTypes(report.incidents,'medisch'),security:webReportTypes(report.incidents,'beveiliging')},timeline:report.timeline,locations:report.locations,
   incidents:report.incidents.map(({id,localDate,time,zone,type,priority,description,note,highlight})=>({id,localDate,time,zone,type,priority,description,note,highlight})),
  }};
 };
}
