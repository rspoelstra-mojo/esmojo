// Gegenereerd uit shared/production-risks.js: alleen export-keywords verwijderd.
const productionRiskGroups = [
  { title:'Zaalindeling', items:[
    {id:'entrance_process',title:'Entreeproces'},
    {id:'barrier_layout',title:'Barrieropstelling'},
    {id:'floor_pressure',title:'Vloerdruk'},
    {id:'escape_routes',title:'Vluchtweg beperkingen',conditional:true},
  ] },
  { title:'Special effects', items:[
    {id:'fireworks',title:'Vuurwerk',conditional:true},
    {id:'open_fire',title:'Open vuur',conditional:true},
    {id:'lasers',title:'Lasers',conditional:true},
    {id:'drones',title:'Drones',conditional:true},
  ] },
];
const productionRiskFields = productionRiskGroups.flatMap(group=>group.items.filter(item=>item.conditional).map(item=>item.id));
function validateProductionRiskState(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='choices,revision'
    ||!Number.isSafeInteger(value.revision)||value.revision<0||!value.choices||typeof value.choices!=='object'||Array.isArray(value.choices)
    ||Object.keys(value.choices).some(key=>!productionRiskFields.includes(key)||typeof value.choices[key]!=='boolean'))throw Error('VALIDATION');
  return value;
}
function validateProductionRiskSelection(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='concertId,field,revision,value'
    ||typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)
    ||!productionRiskFields.includes(input.field)||typeof input.value!=='boolean'||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('VALIDATION');
  return {concertId:input.concertId,field:input.field,value:input.value,revision:input.revision};
}
