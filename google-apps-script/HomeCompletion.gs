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
 const risks=snapshot.risks||{},definition=measureDefinitions(show,risks),rows=definition.rows.map(row=>({...row,...measureState(row,risks.measureImplementations?.[row.id])}));
 const allRisksCompleted=productionComplete(show,snapshot)&&operationalComplete(snapshot);
 return{rows,allRisksCompleted,complete:allRisksCompleted&&definition.known&&rows.every(row=>row.implemented)};
}
