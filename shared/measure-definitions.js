// Maatregelen per risico (v2): een operationeel risico krijgt een maatregel zodra 'Beheersmaatregel noodzakelijk' op Ja staat;
// de tekst mag nog leeg zijn totdat die op de pagina Maatregelen is uitgewerkt. Productionele maatregelen blijven ongewijzigd.
import {productionRiskGroups} from './production-risks.js';
import {measureLevels} from './measure-workflow.js';
import {measureRequiredOf} from './operational-review.js';
import {productionMeasureRequired} from './production-measure.js';
export function measureDefinitions(show,risks={}){
 const rows=[];let known=true;
 for(const group of productionRiskGroups)for(const item of group.items){
  if(item.id==='entrance_process'&&show.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder'||item.conditional&&risks.production?.choices[item.id]===false)continue;
  const key={barrier_layout:'barrier',floor_pressure:'floor'}[item.id]||item.id,record=risks.assessments?.[key];
  if(!record||!measureLevels.includes(record.riskLevel)){known=false;continue;}
  if(!['low','medium','high'].includes(record.riskLevel))continue;
  const text=key==='floor'?record.note:record.riskNote;
  // Historische Midden/Hoog zonder keuze en zonder maatregeltekst zijn onbekend en nooit stilzwijgend maatregelenvrij.
  if(typeof record.measureRequired!=='boolean'&&['medium','high'].includes(record.riskLevel)&&!(typeof text==='string'&&text.trim())){known=false;continue;}
  if(!productionMeasureRequired(record,text))continue;
  rows.push({id:'production:'+item.id,sourceType:'production',sourceId:item.id,title:item.title,text:(typeof text==='string'?text:'').trim(),description:typeof record.description==='string'?record.description:null,origin:group.title+' · '+item.title,originalRiskLevel:record.riskLevel});
 }
 if(risks.state==='ready'&&risks.operational?.source)for(const risk of risks.risks||[]){
  const record=risks.operational.assessments?.[risk.id];
  if(['low','medium','high'].includes(record?.riskLevel)&&measureRequiredOf(record))rows.push({id:'operational:'+risks.operational.source.revision+':'+risk.id,sourceType:'operational',sourceId:risk.id,sourceRevision:risks.operational.source.revision,title:risk.title,text:(typeof record.riskNote==='string'?record.riskNote:'').trim(),description:risk.description||null,origin:'Operationele risico’s · '+risk.title,originalRiskLevel:record.riskLevel});
 }
 return{known,rows:rows.map(row=>({...row,basis:JSON.stringify([row.id,row.originalRiskLevel,row.text])}))};
}
