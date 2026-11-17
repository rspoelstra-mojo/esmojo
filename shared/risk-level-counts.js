import {productionRiskGroups} from './production-risks.js';
const levels=['none','low','medium','high'];
// Aantal laag/midden/hoog beoordeelde risico's van een show: de toepasselijke productionele beoordelingen plus de
// operationele risico's uit de actuele analyse. Gedeeld door de artiestenpagina en het showoverzicht.
export function riskLevelCounts(show,risks){
  risks=risks||{};const counts={low:0,medium:0,high:0},assessments=[];
  for(const group of productionRiskGroups)for(const item of group.items){
    if(item.id==='entrance_process'&&show.venue?.toLowerCase()==='gashouder'||item.conditional&&risks.production?.choices?.[item.id]===false)continue;
    const key={barrier_layout:'barrier',floor_pressure:'floor'}[item.id]||item.id;
    assessments.push(risks.assessments?.[key]);
  }
  if(risks.state==='ready')for(const risk of risks.risks||[])assessments.push(risks.operational?.assessments?.[risk.id]);
  for(const record of assessments)if(Object.hasOwn(counts,record?.riskLevel))counts[record.riskLevel]++;
  const known=risks.state==='ready'||assessments.some(record=>levels.includes(record?.riskLevel));
  return{...counts,known,unassessed:assessments.filter(record=>!levels.includes(record?.riskLevel)).length};
}
