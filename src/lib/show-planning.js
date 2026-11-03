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
function productionComplete(show,snapshot){
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
export function showPlanning(show,snapshot={},now=new Date()){
  const dates=[...(show.dates||[])].sort();if(!dates.length||dates.some(date=>calendarDay(date)===null))return null;
  const start=calendarDay(dates[0]),today=dutchToday(now),todayTime=calendarDay(today);
  const completed={profile:snapshot.pdf?.state==='ready',production:productionComplete(show,snapshot)};
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
