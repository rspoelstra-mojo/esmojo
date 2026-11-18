import {showPagePlanning,showMeasures,operationalReviewed} from './show-planning.js';
import {analysisCategories} from './analysis-topics.js';
import {productionRiskGroups} from '../../shared/production-risks.js';
const topics=analysisCategories.flatMap(category=>category.questions),MAX_TODOS=3;
const statusLabels={done:'Afgerond','on-track':'Op schema',behind:'Achter op schema'};
const isGashouder=show=>show.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder';
// Openstaande onderdelen van het showprofiel: analyses, aantallen en herkomst, afrondingen en het verzenden van het profiel.
function profileItems(show,snapshot){
  const items=[],analyses=snapshot.profile?.analyses,final=snapshot.profile?.finalization;
  if(analyses)topics.forEach((title,index)=>{const number=index+1;if(analyses[number]?.status!=='completed')items.push({id:'analysis-'+number,title,target:{tab:'showprofiel',analysis:number}});});
  if(final&&final.ticketsReady===false)items.push({id:'tickets',title:'Aantallen en herkomst',target:{tab:'showprofiel',tickets:true}});
  for(const [key,label] of [['visitors','Bezoekersanalyse'],['artist','Artiestanalyse']]){const category=final?.categories?.[key];if(category?.ready&&!category.completedAt)items.push({id:'finalize-'+key,title:label+' afronden',target:{tab:'showprofiel',finalize:key}});}
  // Verzenden kan alleen via Showbeheer (Gashouder) en pas wanneer de actuele PDF gereed is.
  if(isGashouder(show)&&snapshot.pdf?.state==='ready'&&!snapshot.profileSentAt)items.push({id:'send',title:'Showprofiel verzenden',target:{tab:'overzicht',send:true}});
  return items;
}
// Openstaande risico's: productionele beoordelingen en keuzes, en operationele risico's zonder geldige beoordeling.
function riskItems(show,snapshot){
  const items=[],risks=snapshot.risks;
  if(risks?.production)for(const group of productionRiskGroups)for(const item of group.items){
    if(item.id==='entrance_process'&&isGashouder(show))continue;
    const choice=item.conditional?risks.production.choices?.[item.id]:undefined;
    if(item.conditional&&choice===false)continue;
    // Een nog niet beantwoorde Ja/Nee-keuze staat op het overzicht van de risicoanalyse.
    if(item.conditional&&choice===undefined){items.push({id:'production-'+item.id,title:item.title,target:{tab:'risicoanalyse'}});continue;}
    const key={barrier_layout:'barrier',floor_pressure:'floor'}[item.id];
    if(key&&!risks.assessments?.[key]?.completed)items.push({id:'production-'+item.id,title:item.title,target:{tab:'risicoanalyse',production:item.id}});
  }
  if(risks?.state==='ready'&&Array.isArray(risks.risks)&&risks.operational?.source)for(const risk of risks.risks)if(!operationalReviewed(risks.operational,risk))items.push({id:'risk-'+risk.id,title:risk.title,target:{tab:'risicoanalyse',risk:risk.id}});
  return items;
}
// Maximaal drie losse regels; daarboven één samenvattende regel naar de overzichtspagina.
const collapse=(items,id,title,tab)=>items.length>MAX_TODOS?[{id,title,multiple:true,target:{tab}}]:items;
// Statusbadge plus de eerstvolgende to-do's, gesorteerd op de deadline van de planning (maximaal drie).
export function showActions(show,snapshot={},now=new Date()){
  const planning=showPagePlanning(show,snapshot,now);if(!planning)return null;
  const step=id=>planning.steps.find(item=>item.id===id),status=planning.allDone?'done':planning.steps.some(item=>item.overdue)?'behind':'on-track';
  const tag=(items,id,suffix)=>items.map((item,order)=>({...item,group:id,suffix:item.multiple?'':suffix,deadline:step(id).date,overdue:step(id).overdue,order}));
  const all=[
    ...tag(collapse(profileItems(show,snapshot),'multiple-analyses','Nog meerdere openstaande analyses','showprofiel'),'profile','nog te doen'),
    ...tag(collapse(riskItems(show,snapshot),'multiple-risks','Nog meerdere openstaande risico’s','risicoanalyse'),'risks','nog te doen'),
    ...tag(showMeasures(show,snapshot).rows.filter(row=>!row.implemented).map(row=>({id:'measure-'+row.id,title:row.title,target:{tab:'maatregelen',measure:row.id}})),'measures','nog niet afgerond'),
  ];
  // Stabiele sortering: eerst op deadline, daarna op de volgorde binnen het onderdeel.
  const sorted=all.map((item,index)=>({item,index})).sort((a,b)=>a.item.deadline<b.item.deadline?-1:a.item.deadline>b.item.deadline?1:a.index-b.index).map(entry=>entry.item);
  return{status,label:statusLabels[status],items:sorted.slice(0,MAX_TODOS),total:sorted.length};
}

// Gecombineerd planningsblok: alle openstaande acties per planningsstap (profile, risks, measures), in volgorde per onderdeel.
// Profiel en risico's houden de samenvattende regel boven drie acties; maatregelen blijven volledig (de weergave klapt ze in).
export function showPlanActions(show,snapshot={},now=new Date()){
  const planning=showPagePlanning(show,snapshot,now);if(!planning)return null;
  const step=id=>planning.steps.find(item=>item.id===id),status=planning.allDone?'done':planning.steps.some(item=>item.overdue)?'behind':'on-track';
  const tag=(items,id,suffix)=>items.map((item,order)=>({...item,group:id,suffix:item.multiple?'':suffix,deadline:step(id).date,overdue:step(id).overdue,order}));
  const groups={
    profile:tag(collapse(profileItems(show,snapshot),'multiple-analyses','Nog meerdere openstaande analyses','showprofiel'),'profile','nog te doen'),
    risks:tag(collapse(riskItems(show,snapshot),'multiple-risks','Nog meerdere openstaande risico’s','risicoanalyse'),'risks','nog te doen'),
    measures:tag(showMeasures(show,snapshot).rows.filter(row=>!row.implemented).map(row=>({id:'measure-'+row.id,title:row.title,target:{tab:'maatregelen',measure:row.id}})),'measures','nog niet afgerond'),
  };
  return{status,label:statusLabels[status],groups};
}
