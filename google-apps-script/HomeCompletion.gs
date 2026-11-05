// Gegenereerd uit src/lib/show-planning.js: gedeelde broncriteria, zonder imports.
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
function operationalComplete(snapshot){
 const risks=snapshot.risks,review=risks?.operational;
 return risks?.state==='ready'&&Array.isArray(risks.risks)&&risks.risks.length<=30&&Boolean(review?.source&&['revision','sha256'].every(key=>/^[a-f0-9]{64}$/.test(review.source[key]||'')))&&risks.risks.every(risk=>{
  const row=review.assessments?.[risk.id];
  return /^R[0-9]{2}$/.test(risk.id)&&Number.isSafeInteger(row?.revision)&&row.revision>0&&['none','low','medium','high'].includes(row.riskLevel)&&typeof row.riskNote==='string'&&(row.riskLevel==='low'||Boolean(row.riskNote.trim()))&&Number.isFinite(Date.parse(row.completedAt));
 });
}
function showMeasures(show,snapshot={}){
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
