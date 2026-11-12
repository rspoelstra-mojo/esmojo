// Gedeelde vaste Dataverse-setupverbinding; alleen op geautoriseerde beheeractie.
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const origin='https://org5bab852a.crm.dynamics.com',base=origin+'/api/data/v9.2/';
export function createDataverseSetupConnection({env=process.env,request=fetch,now=Date.now}={}){
 let context=null,pending=null;
 async function call(path,headers,{method='GET',body,code='CHOICE_READ'}={}){
  let response;try{response=await request(base+path,{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{...headers,...(method==='GET'?{Consistency:'Strong'}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}catch{throw Error(code);}
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
 async function includeInSolution(metadata,ctx,componentType=9){
  const query=new URLSearchParams({'$select':'objectid','$filter':`_solutionid_value eq ${ctx.solutionId} and componenttype eq ${componentType} and objectid eq ${metadata.MetadataId}`,'$top':'2'});
  const response=await call('solutioncomponents?'+query,ctx.headers);if(!response.ok)throw Error('CHOICE_COMPONENT');const result=await json(response);
  if(!Array.isArray(result.value)||result.value.length>1||result.value.some(row=>row.objectid?.toLowerCase()!==metadata.MetadataId.toLowerCase()))throw Error('CHOICE_RESPONSE');
  if(!result.value.length){const added=await call('AddSolutionComponent',ctx.headers,{method:'POST',body:{ComponentId:metadata.MetadataId,ComponentType:componentType,SolutionUniqueName:ctx.solution,AddRequiredComponents:false},code:'CHOICE_COMPONENT'});if(!added.ok)throw Error('CHOICE_COMPONENT');}
 }
 return{connect,call,json,includeInSolution};
}
