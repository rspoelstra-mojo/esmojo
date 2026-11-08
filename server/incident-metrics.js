import {normalizeArtistName} from '../shared/artist-catalogue.js';
import {createHash} from 'node:crypto';
import {incidentReferences,calculateArtistRisk,validIncidentCounts} from '../shared/artist-risk-score.js';
import {calculateReport} from './ontrack-report/data.js';
import {validateReportDay} from './web-report-catalogue.js';
import {webReportKpis} from './report-web.js';
export function createIncidentMetricsService({shows}={}){
 const running=new Map();
 const invoke=async(operation,payload)=>{try{const data=await shows(operation,payload);if(operation==='incident-read'&&data.policyVersion!==2)throw Error('SHOWS_UNAVAILABLE');return data;}catch(error){error.workerOperation=operation;throw error;}};
 async function update(actor,concertId,worker=false){
  const authority=worker?{worker:true}:{actor};
  const key=actor+'\n'+concertId;if(running.has(key))return running.get(key);
  const job=(async()=>{const source=await invoke('incident-source',{...authority,concertId});
   if(typeof source.csvBase64!=='string'||source.csvBase64.length>2800000)throw Error('REPORT_UNAVAILABLE');
   const bytes=Buffer.from(source.csvBase64,'base64');if(createHash('sha256').update(bytes).digest('hex')!==source.sourceHash)throw Error('SOURCE_CHANGED');
   const report=validateReportDay(calculateReport(bytes,{generatedAt:source.modifiedAt}),source.date),kpis=webReportKpis(report);
   if(!validIncidentCounts(kpis))throw Error('REPORT_UNAVAILABLE');
   await invoke('incident-counts',{...authority,concertId,sourceHash:source.sourceHash,kpis});
  })().finally(()=>running.delete(key));running.set(key,job);return job;
 }
 async function snapshot(actor,artistIds=null){
  const payload={actor,...(artistIds?{artistIds}:{})};let source=await invoke('incident-read',payload);
  if(source.jobs?.length){await update(actor,source.jobs[0]);source=await invoke('incident-read',payload);}
  const pending=Boolean(source.jobs?.length),references=pending?null:incidentReferences(source.rows);
  const own=artistIds?source.rows.filter(row=>artistIds.includes('a_'+createHash('sha256').update(normalizeArtistName(row.name)).digest('hex'))):null;
  return{pending,references,updatedAt:new Date().toISOString(),score:own&&!pending?calculateArtistRisk(own,references):null,...(!artistIds?{shows:source.rows.map(({kpis,visitorsFinal,artistFinal,visitorsRating,artistRating,operationalLevels,activeConcertId,...row})=>({...row,countsReady:Boolean(kpis)}))}:{})};
 }
 return{snapshot,async refresh({checkOnly=false}={}){
  const data=await invoke('incident-read',{worker:true});
  if(!checkOnly)for(const concertId of (data.jobs||[]).slice(0,2))await update(null,concertId,true);
  return{ok:true,workerVersion:1,pending:checkOnly?Boolean(data.jobs?.length):(data.jobs?.length||0)>2};
 }};
}
