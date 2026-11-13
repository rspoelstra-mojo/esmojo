import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {showTableSchema,tableByName as sharedTables,buildTableSetupSteps} from './dataverse-table-schema.js';
import {dataverseChoiceDefinitions} from './dataverse-choice-definitions.js';
// Fixed server-owned metadata, never supplied by a browser or a report/CSV.
export const reportsSchema=JSON.parse(readFileSync(new URL('../docs/dataverse/reports-schema.json',import.meta.url),'utf8'));
export const reportsSchemaHash=createHash('sha256').update(JSON.stringify(reportsSchema)).digest('hex');
export const reportsChoiceDefinitions=Object.entries(reportsSchema.choices).map(([code,options])=>({name:'esmojo_keuze_'+code,title:'ESMOJO '+({rapportbron:'Rapportagebron',rapportmailkanaal:'Rapportmailkanaal',rapportafleverstatus:'Rapportafleverstatus'}[code]),options:options.map(option=>({value:option.waarde,label:option.label}))}));
const dependencies=reportsSchema.dependencies.map(name=>{const table=sharedTables.get(name);if(!table||table.existing)throw Error('REPORTS_SCHEMA');return table;});
const byName=new Map([...dependencies,...reportsSchema.tables].map(table=>[table.logical_name,table]));
const allChoices=[...dataverseChoiceDefinitions,...reportsChoiceDefinitions],choices={...Object.fromEntries(reportsSchema.shared_choices.map(name=>[name,showTableSchema.choices[name]])),...reportsSchema.choices};
export const reportsTableNames=Object.freeze(reportsSchema.tables.map(table=>table.logical_name));
function contract(tables,choiceCodes){const steps=buildTableSetupSteps(tables,choiceCodes);return{setupTables:tables,tableByName:byName,tableSetupSteps:steps,tableStepById:new Map(steps.map(step=>[step.id,step])),choices:allChoices};}
export const reportsTablesContract=contract(reportsSchema.tables,choices);
const sharedChoices=Object.fromEntries(reportsSchema.shared_choices.map(name=>[name,showTableSchema.choices[name]]));
export const reportsDependenciesContract=contract(dependencies,sharedChoices);
export const reportsSetupPlan=Object.freeze([
 ...reportsDependenciesContract.tableSetupSteps.map(step=>({kind:'dependency',subkind:step.kind,stepId:step.id,title:step.title,phase:'Gedeelde inrichting controleren'})),
 ...reportsChoiceDefinitions.map(choice=>({kind:'choice',name:choice.name,title:choice.title,phase:'Rapportagekeuzelijsten'})),
 ...reportsTablesContract.tableSetupSteps.map(step=>({kind:'table',stepId:step.id,subkind:step.kind,title:step.title,phase:step.phase})),
 ...reportsTablesContract.tableSetupSteps.map(step=>({kind:'verify',subkind:step.kind,stepId:step.id,title:step.title,phase:'Eindcontrole Rapportages'})),
]);
