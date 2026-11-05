import {productionRiskGroups} from '../../shared/production-risks.js';
const DAY=86400000;
const definitions=[
  ['profile','Showprofiel afronden',31],
  ['operational','Operationele risico’s beoordelen',14],
  ['production','Productionele risico’s beoordelen',7],
  ['measures','Beheersmaatregelen implementeren',1],
  ['show','Showdag',0],
];
export function calendarDay(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const time=Date.parse(value+'T12:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time:null;
}
export function dutchToday(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const value=type=>parts.find(part=>part.type===type).value;return `${value('year')}-${value('month')}-${value('day')}`;
}
export const planningDate=value=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')).replace(/\.$/,'');
export function productionComplete(show,snapshot){
  const risk=snapshot.risks;if(!risk?.production)return false;
  return productionRiskGroups.every(group=>group.items.every(item=>{
    if(item.id==='entrance_process'&&show.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder')return true;
    if(item.conditional&&risk.production.choices[item.id]===false)return true;
    if(item.conditional&&risk.production.choices[item.id]!==true)return false;
    const key={barrier_layout:'barrier',floor_pressure:'floor'}[item.id];
    // Ontbrekende, nog niet gebouwde beoordelingen tellen nooit als afgerond.
    return Boolean(key&&risk.assessments?.[key]?.completed);
  }));
}
export function operationalComplete(snapshot){
 const risks=snapshot.risks,review=risks?.operational;
 return risks?.state==='ready'&&Array.isArray(risks.risks)&&risks.risks.length<=30&&Boolean(review?.source&&['revision','sha256'].every(key=>/^[a-f0-9]{64}$/.test(review.source[key]||'')))&&risks.risks.every(risk=>{
  const row=review.assessments?.[risk.id];
  return /^R[0-9]{2}$/.test(risk.id)&&Number.isSafeInteger(row?.revision)&&row.revision>0&&['none','low','medium','high'].includes(row.riskLevel)&&typeof row.riskNote==='string'&&(row.riskLevel==='low'||Boolean(row.riskNote.trim()))&&Number.isFinite(Date.parse(row.completedAt));
 });
}
export function showMeasures(show,snapshot={}){
 const risks=snapshot.risks,rows=[];let known=true;
 for(const group of productionRiskGroups)for(const item of group.items){
  if(item.id==='entrance_process'&&show.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder'||item.conditional&&risks?.production?.choices[item.id]===false)continue;
  const key={barrier_layout:'barrier',floor_pressure:'floor'}[item.id]||item.id,record=risks?.assessments?.[key];
  if(!record||!['none','low','medium','high'].includes(record.riskLevel)){known=false;continue;}
  if(!['medium','high'].includes(record.riskLevel))continue;
  const text=key==='floor'?record.note:record.riskNote;
  if(typeof text!=='string'||!text.trim()){known=false;continue;}
  rows.push({id:'production:'+item.id,title:item.title,text:text.trim(),origin:group.title+' · '+item.title,implemented:false});
 }
 if(risks?.state==='ready'&&risks.operational?.source)for(const risk of risks.risks||[]){
  const record=risks.operational.assessments?.[risk.id];
  if(['medium','high'].includes(record?.riskLevel)&&typeof record.riskNote==='string'&&record.riskNote.trim())rows.push({id:'operational:'+risks.operational.source.revision+':'+risk.id,title:risk.title,text:record.riskNote.trim(),origin:'Operationele risico’s · '+risk.title,implemented:false});
 }
 const allRisksCompleted=productionComplete(show,snapshot)&&operationalComplete(snapshot);
 return{rows,allRisksCompleted,complete:allRisksCompleted&&known&&rows.length===0};
}
export function showPlanning(show,snapshot={},now=new Date()){
  const dates=[...(show.dates||[])].sort();if(!dates.length||dates.some(date=>calendarDay(date)===null))return null;
  const start=calendarDay(dates[0]),today=dutchToday(now),todayTime=calendarDay(today);
  const completed=snapshot.completion||{profile:snapshot.pdf?.state==='ready',production:productionComplete(show,snapshot),operational:operationalComplete(snapshot),measures:showMeasures(show,snapshot).complete};
  const profileDates=Object.values(snapshot.profile?.finalization?.categories||{}).map(row=>row.completedAt).filter(value=>Number.isFinite(Date.parse(value))).sort();
  const steps=definitions.map(([id,label,offset])=>{
    const date=new Date(start-offset*DAY).toISOString().slice(0,10),days=Math.round((calendarDay(date)-todayTime)/DAY),done=completed[id]===true;
    const completedAt=id==='profile'&&done?profileDates.at(-1):null;
    const relative=days===0?'Vandaag':days===1?'Morgen':days===-1?'1 dag te laat':days<0?`${-days} dagen te laat`:`Over ${days} dagen`;
    return{id,label,date,days,completed:done,completedAt,badge:done?'Afgerond'+(completedAt?' · '+planningDate(dutchToday(new Date(completedAt))):''):id==='show'?'Showdag':relative};
  });
  const next=steps.find(step=>!step.completed&&step.id!=='show')||steps[4];next.current=true;
  const points=steps.map(step=>calendarDay(step.date));let position=10;
  if(todayTime>=points[4])position=90;
  else if(todayTime>points[0]){const i=points.findIndex(point=>point>=todayTime);position=10+20*(i-1+(todayTime-points[i-1])/(points[i]-points[i-1]));}
  return{today,steps,next,todayPosition:position};
}
