import {readFileSync} from 'node:fs';
// Vast versiecontract, geen schema uit een browserrequest.
export const showTableSchema=JSON.parse(readFileSync(new URL('../docs/dataverse/shows-schema.json',import.meta.url),'utf8'));
export const setupTables=showTableSchema.tables;
export const tableByName=new Map(setupTables.map(table=>[table.logical_name,table]));
export const label=(text,language)=>({LocalizedLabels:[{Label:text,LanguageCode:language}]});
const typeMap={'Eén tekstregel':'String','Meerdere tekstregels':'Memo','Geheel getal':'Integer','Datum en tijd':'DateTime','Ja/Nee':'Boolean','Keuze':'Picklist','Decimaal getal':'Decimal','Bestand (File)':'File','Opzoeken':'Lookup'};
export function attributeKind(column){const type=typeMap[column.type];if(!type)throw Error('TABLE_SCHEMA');return type;}
export function compileAttribute(column,language,{primary=false,choiceId=null}={}){
 const kind=attributeKind(column),payload={'@odata.type':'Microsoft.Dynamics.CRM.'+kind+'AttributeMetadata',SchemaName:column.logical_name,DisplayName:label(column.label,language),RequiredLevel:{Value:column.required==='Ja'?'ApplicationRequired':'None'}};
 payload.AttributeTypeName={Value:kind+'Type'};if(kind!=='File')payload.AttributeType=kind;
 if(primary)payload.IsPrimaryName=true;
 if(kind==='String'){payload.MaxLength=Number(/maximaal (\d+) tekens/.exec(column.settings)?.[1]);payload.FormatName={Value:column.settings.startsWith('URL;')?'Url':column.settings.startsWith('E-mail;')?'Email':'Text'};}
 if(kind==='Memo'){payload.MaxLength=Number(/maximaal (\d+) tekens/.exec(column.settings)?.[1]);payload.Format='TextArea';}
 if(kind==='Integer'){const match=/Min (-?\d+); max (-?\d+)/.exec(column.settings);if(!match)throw Error('TABLE_SCHEMA');payload.MinValue=Number(match[1]);payload.MaxValue=Number(match[2]);payload.Format='None';/* Integer defaults are applied by the future record writer, not unsupported metadata properties. */}
 if(kind==='Decimal'){const match=/(\d+) decimalen; min ([\d.-]+); max ([\d.-]+)/.exec(column.settings);if(!match)throw Error('TABLE_SCHEMA');payload.Precision=Number(match[1]);payload.MinValue=Number(match[2]);payload.MaxValue=Number(match[3]);}
 if(kind==='DateTime'){const dateOnly=column.settings.startsWith('Gedrag Alleen datum;');payload.DateTimeBehavior={Value:dateOnly?'DateOnly':'UserLocal'};payload.Format=dateOnly?'DateOnly':'DateAndTime';}
 if(kind==='Boolean'){payload.DefaultValue=column.default_value===true;payload.OptionSet={'@odata.type':'Microsoft.Dynamics.CRM.BooleanOptionSetMetadata',TrueOption:{Value:1,Label:label('Ja',language)},FalseOption:{Value:0,Label:label('Nee',language)}};}
 if(kind==='Picklist'){if(!choiceId)throw Error('TABLE_CHOICE_MISSING');payload['GlobalOptionSet@odata.bind']='/GlobalOptionSetDefinitions('+choiceId+')';payload.DefaultFormValue=column.default_value??-1;}
 if(kind==='File'){payload.MaxSizeInKB=Number(/MaxSizeInKB (\d+)/.exec(column.settings)?.[1]);}
 if(kind==='String'||kind==='Memo'){if(!Number.isInteger(payload.MaxLength)||payload.MaxLength<1||payload.MaxLength>1048576)throw Error('TABLE_SCHEMA');}
 return payload;
}
export function compileEntity(table,language){
 if(table.existing)throw Error('TABLE_PROTECTED');const primary=table.columns.find(column=>column.logical_name==='esmojo_naam');if(!primary)throw Error('TABLE_SCHEMA');
 return{'@odata.type':'Microsoft.Dynamics.CRM.EntityMetadata',SchemaName:table.logical_name,DisplayName:label(table.label,language),DisplayCollectionName:label(table.plural,language),OwnershipType:'OrganizationOwned',IsActivity:false,HasActivities:false,HasNotes:false,Attributes:[compileAttribute(primary,language,{primary:true})]};
}
export function compileRelationship(table,column,language,primaryId){
 if(!column.target||!primaryId)throw Error('TABLE_SCHEMA');
 return{'@odata.type':'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',SchemaName:column.relationship_schema,ReferencedEntity:column.target,ReferencedAttribute:primaryId,ReferencingEntity:table.logical_name,Lookup:compileAttribute(column,language),AssociatedMenuConfiguration:{Behavior:'DoNotDisplay',Group:'Details',Order:10000,Label:label(column.label,language)},CascadeConfiguration:{Assign:'NoCascade',Delete:'Restrict',Merge:'NoCascade',Reparent:'NoCascade',Share:'NoCascade',Unshare:'NoCascade'}};
}
export function buildTableSetupSteps(tables,choices){return[
 ...Object.keys(choices).filter(name=>name!=='opruimstatus_bestaand').map(name=>({id:'choice:'+name,kind:'choice',phase:'Keuzelijsten controleren',title:'Keuzelijst '+name,name:'esmojo_keuze_'+name})),
 ...tables.map(table=>({id:'table:'+table.logical_name,kind:'table',phase:'Tabellen',title:table.label+(table.existing?' (bestaand behouden)':''),table:table.logical_name})),
 ...tables.filter(table=>!table.existing).flatMap(table=>table.columns.filter(column=>!column.target&&column.logical_name!=='esmojo_naam').map(column=>({id:'column:'+table.logical_name+':'+column.logical_name,kind:'column',phase:'Kolommen',title:table.label+' · '+column.label,table:table.logical_name,column:column.logical_name}))),
 ...tables.flatMap(table=>table.columns.filter(column=>column.target).map(column=>({id:'relationship:'+table.logical_name+':'+column.logical_name,kind:'relationship',phase:'Relaties',title:table.label+' · '+column.label,table:table.logical_name,column:column.logical_name}))),
 ...tables.map(table=>({id:'publish:'+table.logical_name,kind:'publish',phase:'Tabellen publiceren',title:table.label,table:table.logical_name})),
 ...tables.flatMap(table=>table.keys.map((key,index)=>({id:'key:'+table.logical_name+':'+index,kind:'key',phase:'Unieke sleutels',title:table.label+' · '+(table.existing?'bestaande sleutel':key.name),table:table.logical_name,key:index}))),
];}
export const tableSetupSteps=buildTableSetupSteps(setupTables,showTableSchema.choices);
export const tableStepById=new Map(tableSetupSteps.map(step=>[step.id,step]));
