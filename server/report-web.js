import {reportPages} from '../shared/report-routes.js';
import {calculateReport} from './ontrack-report/data.js';
// Alleen vaste voorbeeldkeuze; automatische rapport-/CSV-koppeling volgt later.
const examples={jungle:{key:reportPages.find(report=>report.slug==='jungle').concertId,name:'Jungle',venue:'Ziggo Dome',dates:['2026-11-03']}};
export function validateWebReportRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).join(',')!=='slug'||typeof input.slug!=='string'||!Object.hasOwn(examples,input.slug))throw Error('VALIDATION');
 return input.slug;
}
export function createWebReportService({store}){
 return async(actor,input)=>{
  const slug=validateWebReportRequest(input),source=await store('web-preview',actor,{slug});
  if(typeof source?.csvBase64!=='string'||source.csvBase64.length>2800000||!Number.isFinite(Date.parse(source.modifiedAt)))throw Error('REPORT_UNAVAILABLE');
  const report=calculateReport(Buffer.from(source.csvBase64,'base64'),{generatedAt:source.modifiedAt});
  return{show:examples[slug],report:{kpis:report.kpis,types:report.types,timeline:report.timeline,locations:report.locations,
   incidents:report.incidents.map(({id,localDate,time,zone,type,priority,description,note,highlight})=>({id,localDate,time,zone,type,priority,description,note,highlight})),
  }};
 };
}
