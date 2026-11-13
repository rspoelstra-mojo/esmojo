import {createDataverseSetupConnection} from './dataverse-setup-client.js';
import {dataverseChoiceDefinitions as defaultDefinitions} from './dataverse-choice-definitions.js';
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
export function compareChoice(actual,expected,language){
 if(!actual||actual.Name!==expected.name||actual.IsGlobal!==true||actual.OptionSetType!=='Picklist'||actual.IsManaged===true||!guid(actual.MetadataId)||!Array.isArray(actual.Options))return'STRUCTURE';
 if(actual.Options.length!==expected.options.length||new Set(actual.Options.map(row=>row.Value)).size!==actual.Options.length)return'OPTION_COUNT';
 for(const option of expected.options){const found=actual.Options.find(row=>row.Value===option.value);if(!found)return'OPTION_VALUE';
  if(!Array.isArray(found.Label?.LocalizedLabels)||!found.Label.LocalizedLabels.some(row=>row.LanguageCode===language&&row.Label===option.label))return'OPTION_LABEL';
 }
 return null;
}
export function createDataverseChoices({env=process.env,request=fetch,now=Date.now,definitions=defaultDefinitions}={}){
 const definitionFor=name=>definitions.find(row=>row.name===name);
 const {connect,call,json,includeInSolution}=createDataverseSetupConnection({env,request,now});
 async function read(definition,ctx){
  const response=await call("GlobalOptionSetDefinitions(Name='"+definition.name+"')",ctx.headers);
  if(response.status===404)return null;if(!response.ok)throw Error('CHOICE_READ');return json(response);
 }
 return async input=>{
  if(!input||Array.isArray(input)||!['list','create'].includes(input.operation)||Object.keys(input).sort().join(',')!==(input.operation==='list'?'operation':'name,operation')||input.operation==='create'&&!definitionFor(input.name))throw Error('VALIDATION');
  const ctx=await connect();
  if(input.operation==='list')return{solution:ctx.solution,language:ctx.language,choices:definitions.map(row=>({name:row.name,title:row.title,optionCount:row.options.length}))};
  const definition=definitionFor(input.name);let metadata=await read(definition,ctx),created=false;
  if(metadata){const difference=compareChoice(metadata,definition,ctx.language);if(difference)return{name:definition.name,status:'conflict',difference,verified:false};}
  else{
   const label=text=>({LocalizedLabels:[{Label:text,LanguageCode:ctx.language}]});
   const body={'@odata.type':'Microsoft.Dynamics.CRM.OptionSetMetadata',Name:definition.name,DisplayName:label(definition.title),IsGlobal:true,OptionSetType:'Picklist',Options:definition.options.map(row=>({Value:row.value,Label:label(row.label)}))};
   const response=await call('GlobalOptionSetDefinitions',{...ctx.headers,'MSCRM.SolutionUniqueName':ctx.solution},{method:'POST',body,code:'CHOICE_CREATE_UNCONFIRMED'});
   if(!response.ok&&![400,409].includes(response.status))throw Error('CHOICE_CREATE_UNCONFIRMED');
   created=response.ok;metadata=await read(definition,ctx);if(!metadata)throw Error('CHOICE_CREATE_UNCONFIRMED');
   const difference=compareChoice(metadata,definition,ctx.language);if(difference)return{name:definition.name,status:'conflict',difference,verified:false};
  }
  await includeInSolution(metadata,ctx);
  const published=await call('PublishXml',ctx.headers,{method:'POST',body:{ParameterXml:'<importexportxml><optionsets><optionset>'+definition.name+'</optionset></optionsets></importexportxml>'},code:'CHOICE_PUBLISH_UNCONFIRMED'});
  if(!published.ok)throw Error('CHOICE_PUBLISH_UNCONFIRMED');
  const confirmed=await read(definition,ctx);if(compareChoice(confirmed,definition,ctx.language))throw Error('CHOICE_VERIFY_UNCONFIRMED');
  return{name:definition.name,status:'verified',verified:true,created,published:true};
 };
}
