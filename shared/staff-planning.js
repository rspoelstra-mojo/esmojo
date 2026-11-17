// Personeelsplanning: functies per concert, in drie kleurgroepen. De namen zijn door de gebruiker als Vertrouwelijk geclassificeerd.
export const staffGroups=Object.freeze([
  {id:'production',label:'MOJO en TSC',fields:Object.freeze([
    {id:'productionManager',label:'Productie manager'},
    {id:'eventSafetyManager',label:'Event Safety manager'},
    {id:'securityProjectLead',label:'Projectleider beveiliging'},
    {id:'cmtLeadMojo',label:'CMT leider MOJO'},
  ])},
  {id:'venue',label:'Zaal',fields:Object.freeze([
    {id:'venueProductionManager',label:'Productie manager zaal'},
    {id:'venueEventManager',label:'Event manager zaal'},
    {id:'venueCmtLead',label:'CMT leider zaal'},
  ])},
]);
export const staffFieldIds=Object.freeze(staffGroups.flatMap(group=>group.fields.map(field=>field.id)));
export const staffNameMax=120;
// Een naam is vrije tekst van een mens: getrimd, zonder stuurtekens, maximaal 120 tekens. Leeg betekent niet ingevuld.
export function validStaffName(value){return typeof value==='string'&&value.length<=staffNameMax*2&&value.trim().length<=staffNameMax&&!/[\x00-\x1f\x7f]/.test(value);}
export const normalizedStaffName=value=>value.trim().replace(/\s+/g,' ');
export const emptyStaffRoles=()=>Object.fromEntries(staffFieldIds.map(id=>[id,'']));
// Het blok Projectteam op de showpagina toont deze vier functies uit de planning (Projectleider TSC = Projectleider beveiliging; CMT leider = CMT leider MOJO).
export const showTeamRoles=Object.freeze([
  {label:'Productiemanager',field:'productionManager'},
  {label:'Event Safety manager',field:'eventSafetyManager'},
  {label:'Projectleider TSC',field:'securityProjectLead'},
  {label:'CMT leider',field:'cmtLeadMojo'},
]);
