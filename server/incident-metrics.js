import {normalizeArtistName} from '../shared/artist-catalogue.js';
import {createHash} from 'node:crypto';
import {incidentReferences,calculateArtistRisk,validIncidentCounts,suitableIncidents,incidentVisitorUnits} from '../shared/artist-risk-score.js';
import {calculateReport} from './ontrack-report/data.js';
import {validateReportDay} from './web-report-catalogue.js';
import {webReportKpis} from './report-web.js';
export function createIncidentMetricsService({shows}={}){
 const running=new Map();
 const invoke=async(operation,payload)=>{try{const data=await shows(operation,payload);if(operation==='incident-read'&&data.policyVersion!==2)throw Error('SHOWS_UNAVAILABLE');return data;}catch(error){error.workerOperation=operation;throw error;}};
 async function update(actor,concertId,worker=false,sourceId=null){
  const authority={...(worker?{worker:true}:{actor}),...(sourceId?{sourceId}:{})};
  const key=actor+'\n'+concertId;if(running.has(key))return running.get(key);
  const job=(async()=>{const source=await invoke('incident-source',{...authority,concertId});
   if(typeof source.csvBase64!=='string'||source.csvBase64.length>2800000)throw Error('REPORT_UNAVAILABLE');
   const bytes=Buffer.from(source.csvBase64,'base64');if(createHash('sha256').update(bytes).digest('hex')!==source.sourceHash)throw Error('SOURCE_CHANGED');
   const report=validateReportDay(calculateReport(bytes,{generatedAt:source.modifiedAt}),source.date),kpis=webReportKpis(report,source);
   if(!validIncidentCounts(kpis))throw Error('REPORT_UNAVAILABLE');
   await invoke('incident-counts',{...authority,concertId,sourceHash:source.sourceHash,kpis});return kpis;
  })().finally(()=>running.delete(key));running.set(key,job);return job;
 }
 function project(source){
  const references=incidentReferences(source.rows),eligible=source.rows.filter(row=>row.sourceReady&&row.securityComplete&&row.medicalComplete&&incidentVisitorUnits(row)>0);
  const progress={available:source.rows.filter(row=>row.sourceReady).length,eligible:eligible.length,processed:eligible.filter(suitableIncidents).length,visitors:eligible.reduce((sum,row)=>sum+incidentVisitorUnits(row),0)/40};
  return{pending:false,references,progress,updatedAt:new Date().toISOString(),score:null,shows:source.rows.map(({kpis,visitorsFinal,artistFinal,visitorsRating,artistRating,operationalLevels,activeConcertId,...row})=>({...row,countsReady:Boolean(kpis)}))};
 }
 async function snapshot(actor,artistIds=null){
  // De beheerpagina heeft exact één geautoriseerde read, zonder inventarisatie.
  const published=await invoke('incident-daily-read',{actor,...(artistIds?{referencesOnly:true}:{})});
  if(!artistIds)return published;
  const source=await invoke('incident-read',{actor,artistIds}),own=source.rows.filter(row=>artistIds.includes('a_'+createHash('sha256').update(normalizeArtistName(row.name)).digest('hex')));
  return{pending:false,references:published.references,updatedAt:published.updatedAt,score:calculateArtistRisk(own,published.references)};
 }
 return{snapshot,async refresh({checkOnly=false}={}){
  const state=await invoke(checkOnly?'incident-daily-state':'incident-daily-start',{worker:true});
  if(state.workerVersion!==3)throw Error('SHOWS_UNAVAILABLE');
  if(checkOnly||!state.needsUpdate)return{ok:true,workerVersion:3,pending:Boolean(state.needsUpdate),status:state.needsUpdate?'processing':'complete'};
  const data=await invoke('incident-read',{worker:true});if(data.workerVersion!==2)throw Error('SHOWS_UNAVAILABLE');
  const batch=(data.jobs||[]).slice(0,5);
  for(const concertId of batch){const kpis=await update(null,concertId,true,data.jobSources?.[concertId]);const row=data.rows.find(row=>row.concertId===concertId);if(row)row.kpis=kpis;}
  const pending=(data.jobs?.length||0)>batch.length;
  if(pending)return{ok:true,workerVersion:3,pending:true,status:'processing'};
  const payload=project(data);
  if(payload.progress.available>0&&payload.references.concerts===0)throw Error('INCIDENT_REFERENCES_NO_ELIGIBLE_REPORTS');
  await invoke('incident-daily-publish',{worker:true,day:state.day,payload});
  return{ok:true,workerVersion:3,pending:false,status:'complete'};
 }};
}
