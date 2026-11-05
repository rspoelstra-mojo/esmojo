// Gegenereerd uit src/lib/show-planning.js productionComplete; gedeelde broncriteria.
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
