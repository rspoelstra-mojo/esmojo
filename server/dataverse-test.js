// Eenmalig op expliciete beheerderklik. Geen opslag, logging of recordmutaties.
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function createDataverseTest({env=process.env,request=fetch}={}){
 return async()=>{
  const missing=['DATAVERSE_TEST_TENANT_ID','DATAVERSE_TEST_CLIENT_ID','DATAVERSE_TEST_URL','DATAVERSE_TEST_CLIENT_SECRET'].filter(key=>!env[key]);
  const result={configuration:false,token:false,dataverse:false,code:'CONFIG_MISSING'};
  if(missing.length)return{...result,missing};
  if(!guid(env.DATAVERSE_TEST_TENANT_ID)||!guid(env.DATAVERSE_TEST_CLIENT_ID)||env.DATAVERSE_TEST_URL.replace(/\/$/,'')!=='https://org5bab852a.crm.dynamics.com')return{...result,code:'CONFIG_INVALID'};
  result.configuration=true;const origin='https://org5bab852a.crm.dynamics.com';let response,data;
  try{
   response=await request('https://login.microsoftonline.com/'+env.DATAVERSE_TEST_TENANT_ID+'/oauth2/v2.0/token',{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.DATAVERSE_TEST_CLIENT_ID,client_secret:env.DATAVERSE_TEST_CLIENT_SECRET,scope:origin+'/.default'}).toString()});
   if(response.status===429||response.status>=500)return{...result,code:'MICROSOFT_UNAVAILABLE'};
   if(!response.ok)return{...result,code:'MICROSOFT_AUTH_REJECTED'};
   data=await response.json();if(typeof data.access_token!=='string'||!data.access_token||data.access_token.length>32000||data.token_type?.toLowerCase()!=='bearer')return{...result,code:'MICROSOFT_AUTH_INVALID'};
  }catch{return{...result,code:'MICROSOFT_UNAVAILABLE'};}
  result.token=true;
  try{
   response=await request(origin+'/api/data/v9.2/WhoAmI',{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+data.access_token,Accept:'application/json','OData-MaxVersion':'4.0','OData-Version':'4.0'}});
   if(!response.ok)return{...result,code:response.status===403?'DATAVERSE_FORBIDDEN':response.status===401?'DATAVERSE_AUTH_REJECTED':'DATAVERSE_UNAVAILABLE'};
   const identity=await response.json();if(!guid(identity.UserId)||!guid(identity.OrganizationId)||!guid(identity.BusinessUnitId))return{...result,code:'DATAVERSE_RESPONSE_INVALID'};
   // De technische identiteitsvelden worden alleen gecontroleerd en niet teruggegeven.
   return{...result,dataverse:true,code:'CONNECTION_OK'};
  }catch{return{...result,code:'DATAVERSE_UNAVAILABLE'};}
 };
}
