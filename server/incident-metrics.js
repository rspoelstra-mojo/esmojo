import {normalizeArtistName} from '../shared/artist-catalogue.js';
import {createHash} from 'node:crypto';
import {incidentReferences,calculateArtistRisk,validIncidentCounts} from '../shared/artist-risk-score.js';
import {calculateReport} from './ontrack-report/data.js';
import {validateReportDay} from './web-report-catalogue.js';
import {webReportKpis} from './report-web.js';
export function validateIncidentConfirmation(body){
 const keys=['concertId','revision','visitors','securityComplete','medicalComplete','zeroIncidents'];
 if(!body||Array.isArray(body)||Object.keys(body).sort().join()!==keys.sort().join()||typeof body.concertId!=='string'||!body.concertId||body.concertId.length>240||/[\x00-\x1f/\\]/.test(body.concertId)||!Number.isSafeInteger(body.revision)||body.revision<0||body.visitors!==null&&(!Number.isSafeInteger(body.visitors)||body.visitors<0||body.visitors>10000000)||['securityComplete','medicalComplete','zeroIncidents'].some(key=>typeof body[key]!=='boolean'))throw Error('VALIDATION');
 return body;
}
export function createIncidentMetricsService({shows}={}){
 const running=new Map();
 async function update(actor,concertId){
  const key=actor+'\n'+concertId;if(running.has(key))return running.get(key);
  const job=(async()=>{const source=await shows('incident-source',{actor,concertId});
   if(typeof source.csvBase64!=='string'||source.csvBase64.length>2800000)throw Error('REPORT_UNAVAILABLE');
   const bytes=Buffer.from(source.csvBase64,'base64');if(createHash('sha256').update(bytes).digest('hex')!==source.sourceHash)throw Error('SOURCE_CHANGED');
   const report=validateReportDay(calculateReport(bytes,{generatedAt:source.modifiedAt}),source.date),kpis=webReportKpis(report);
   if(!validIncidentCounts(kpis))throw Error('REPORT_UNAVAILABLE');
   await shows('incident-counts',{actor,concertId,sourceHash:source.sourceHash,kpis});
  })().finally(()=>running.delete(key));running.set(key,job);return job;
 }
 async function snapshot(actor,artistIds=null){
  const payload={actor,...(artistIds?{artistIds}:{})};let source=await shows('incident-read',payload);
  if(source.jobs?.length){await update(actor,source.jobs[0]);source=await shows('incident-read',payload);}
  const pending=Boolean(source.jobs?.length),references=pending?null:incidentReferences(source.rows);
  const own=artistIds?source.rows.filter(row=>artistIds.includes('a_'+createHash('sha256').update(normalizeArtistName(row.name)).digest('hex'))):null;
  return{pending,references,updatedAt:new Date().toISOString(),score:own&&!pending?calculateArtistRisk(own,references):null,...(!artistIds?{shows:source.rows.map(({kpis,visitorsFinal,artistFinal,visitorsRating,artistRating,operationalLevels,activeConcertId,...row})=>({...row,countsReady:Boolean(kpis)}))}:{})};
 }
 return{snapshot,async confirm(actor,body){return shows('incident-confirm',{actor,...validateIncidentConfirmation(body)});}};
}
