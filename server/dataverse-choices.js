import {dataverseChoiceDefinitions as definitions} from './dataverse-choice-definitions.js';
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const origin='https://org5bab852a.crm.dynamics.com',base=origin+'/api/data/v9.2/';
const definitionFor=name=>definitions.find(row=>row.name===name);
export function compareChoice(actual,expected,language){
 if(!actual||actual.Name!==expected.name||actual.IsGlobal!==true||actual.OptionSetType!=='Picklist'||actual.IsManaged===true||!guid(actual.MetadataId)||!Array.isArray(actual.Options))return'STRUCTURE';
 if(actual.Options.length!==expected.options.length||new Set(actual.Options.map(row=>row.Value)).size!==actual.Options.length)return'OPTION_COUNT';
 for(const option of expected.options){const found=actual.Options.find(row=>row.Value===option.value);if(!found)return'OPTION_VALUE';
  if(!Array.isArray(found.Label?.LocalizedLabels)||!found.Label.LocalizedLabels.some(row=>row.LanguageCode===language&&row.Label===option.label))return'OPTION_LABEL';
 }
 return null;
}
export function createDataverseChoices({env=process.env,request=fetch,now=Date.now}={}){
 let context=null,pending=null;
 async function call(path,headers,{method='GET',body,code='CHOICE_READ'}={}){
  let response;try{response=await request(base+path,{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}catch{throw Error(code);}
  if(response.status===401){context=null;throw Error('CHOICE_AUTH');}
  if(response.status===403)throw Error('CHOICE_FORBIDDEN');
  return response;
 }
 async function json(response,code='CHOICE_RESPONSE'){try{return await response.json();}catch{throw Error(code);}}
 async function connect(){
  if(context&&context.until>now())return context;if(pending)return pending;
  pending=(async()=>{
   if(!guid(env.DATAVERSE_TEST_TENANT_ID)||!guid(env.DATAVERSE_TEST_CLIENT_ID)||!env.DATAVERSE_TEST_CLIENT_SECRET||env.DATAVERSE_TEST_URL?.replace(/\/$/,'')!==origin)throw Error('CHOICE_CONFIG');
   let response;try{response=await request('https://login.microsoftonline.com/'+env.DATAVERSE_TEST_TENANT_ID+'/oauth2/v2.0/token',{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.DATAVERSE_TEST_CLIENT_ID,client_secret:env.DATAVERSE_TEST_CLIENT_SECRET,scope:origin+'/.default'}).toString()});}catch{throw Error('CHOICE_AUTH');}
   if(!response.ok)throw Error('CHOICE_AUTH');const token=await json(response);
   if(token.token_type?.toLowerCase()!=='bearer'||typeof token.access_token!=='string'||!token.access_token||token.access_token.length>32000)throw Error('CHOICE_AUTH');
   const headers={Authorization:'Bearer '+token.access_token,Accept:'application/json','OData-Version':'4.0','OData-MaxVersion':'4.0'};
   response=await call('solutions?'+new URLSearchParams({'$select':'uniquename,solutionid,ismanaged','$expand':'publisherid($select=customizationprefix)','$filter':"uniquename eq 'ESMOJO'",'$top':'2'}),headers);
   if(!response.ok)throw Error('CHOICE_SOLUTION');const result=await json(response),rows=result.value;
   if(!Array.isArray(rows)||rows.length!==1||rows[0].uniquename?.toLowerCase()!=='esmojo'||rows[0].ismanaged!==false||rows[0].publisherid?.customizationprefix!=='esmojo'||!guid(rows[0].solutionid))throw Error('CHOICE_SOLUTION');
   const organization=await call('organizations?$select=languagecode&$top=2',headers);if(!organization.ok)throw Error('CHOICE_LANGUAGE');const org=await json(organization);
   if(!Array.isArray(org.value)||org.value.length!==1||!Number.isInteger(org.value[0].languagecode)||org.value[0].languagecode<1||org.value[0].languagecode>65535)throw Error('CHOICE_LANGUAGE');
   context={headers,solution:rows[0].uniquename,solutionId:rows[0].solutionid,language:org.value[0].languagecode,until:now()+Math.max(0,Math.min(Number(token.expires_in)||0,3600)-60)*1000};return context;
  })().finally(()=>{pending=null;});return pending;
 }
 async function read(definition,ctx){
  const response=await call("GlobalOptionSetDefinitions(Name='"+definition.name+"')",ctx.headers);
  if(response.status===404)return null;if(!response.ok)throw Error('CHOICE_READ');return json(response);
 }
 async function includeInSolution(metadata,ctx){
  const query=new URLSearchParams({'$select':'objectid','$filter':`_solutionid_value eq ${ctx.solutionId} and componenttype eq 9 and objectid eq ${metadata.MetadataId}`,'$top':'2'});
  const response=await call('solutioncomponents?'+query,ctx.headers);if(!response.ok)throw Error('CHOICE_COMPONENT');const result=await json(response);
  if(!Array.isArray(result.value)||result.value.length>1||result.value.some(row=>row.objectid?.toLowerCase()!==metadata.MetadataId.toLowerCase()))throw Error('CHOICE_RESPONSE');
  if(!result.value.length){const added=await call('AddSolutionComponent',ctx.headers,{method:'POST',body:{ComponentId:metadata.MetadataId,ComponentType:9,SolutionUniqueName:ctx.solution,AddRequiredComponents:false},code:'CHOICE_COMPONENT'});if(!added.ok)throw Error('CHOICE_COMPONENT');}
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
