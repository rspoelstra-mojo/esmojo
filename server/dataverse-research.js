import {dataversePilot as pilot,isDataversePilot} from '../shared/dataverse-pilot.js';

const table='esmojo_onderzoeksresultaat';
const columns=['esmojo_showsleutel','esmojo_vraagnummer','esmojo_markdowninhoud','esmojo_bronbibliotheekid','esmojo_bronbestanditemnummer','esmojo_bronversie','esmojo_bronbestandpad','createdon'];
const name=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,127}$/i.test(value);
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const version=value=>typeof value==='string'&&/^\d{1,8}\.\d{1,8}$/.test(value)?value.split('.').map(Number):null;
const compare=(a,b)=>a[0]-b[0]||a[1]-b[1];

// Geen persistente inhoudscache: alleen token en schema in tijdelijk servergeheugen.
export function createDataverseResearch({env=process.env,request=fetch,now=Date.now}={}){
 let session=null,pending=null;
 const origin='https://org5bab852a.crm.dynamics.com',base=origin+'/api/data/v9.2/';
 async function connect(){
  if(session&&session.until>now())return session;
  if(pending)return pending;
  pending=(async()=>{
   if(!guid(env.DATAVERSE_TEST_TENANT_ID)||!guid(env.DATAVERSE_TEST_CLIENT_ID)||!env.DATAVERSE_TEST_CLIENT_SECRET||env.DATAVERSE_TEST_URL?.replace(/\/$/,'')!==origin)throw Error('DATAVERSE_CONFIG');
   const response=await request('https://login.microsoftonline.com/'+env.DATAVERSE_TEST_TENANT_ID+'/oauth2/v2.0/token',{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.DATAVERSE_TEST_CLIENT_ID,client_secret:env.DATAVERSE_TEST_CLIENT_SECRET,scope:origin+'/.default'}).toString()});
   if(!response.ok)throw Error('DATAVERSE_AUTH');
   const token=await response.json();if(token.token_type?.toLowerCase()!=='bearer'||typeof token.access_token!=='string'||!token.access_token||token.access_token.length>32000)throw Error('DATAVERSE_AUTH');
   const headers={Authorization:'Bearer '+token.access_token,Accept:'application/json','OData-Version':'4.0','OData-MaxVersion':'4.0',Prefer:'odata.maxpagesize=50'};
   const meta=await get(base+"EntityDefinitions(LogicalName='"+table+"')?$select=LogicalName,EntitySetName",headers);
   if(meta.LogicalName!==table||!name(meta.EntitySetName))throw Error('DATAVERSE_SCHEMA');
   session={headers,entity:meta.EntitySetName,until:now()+Math.max(0,Math.min(Number(token.expires_in)||0,3600)-60)*1000};return session;
  })().finally(()=>{pending=null;});return pending;
 }
 async function get(url,headers){
  const response=await request(url,{method:'GET',headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok){if(response.status===401)session=null;throw Error('DATAVERSE_READ');}
  return response.json();
 }
 async function read(){
  const {headers,entity}=await connect();
  const params=new URLSearchParams({'$select':columns.join(','),'$filter':`esmojo_showsleutel eq '${pilot.sourceKey}' and esmojo_bronbibliotheekid eq '${pilot.libraryId}'`,'$top':'501'});
  let url=base+entity+'?'+params,rows=[],pages=0;
  while(url){
   if(++pages>11)throw Error('DATAVERSE_LIMIT');
   const data=await get(url,headers);
   if(!Array.isArray(data.value)||rows.length+data.value.length>500)throw Error('DATAVERSE_LIMIT');
   rows.push(...data.value);url=data['@odata.nextLink'];
   if(url){const next=new URL(url);if(next.origin!==origin||next.pathname!=='/api/data/v9.2/'+entity||next.username||next.password||next.hash)throw Error('DATAVERSE_RESPONSE');}
  }
  const selected=new Map();let bytes=0;
  for(const row of rows){
   const number=row.esmojo_vraagnummer,v=version(row.esmojo_bronversie),text=row.esmojo_markdowninhoud;
   if(row.esmojo_showsleutel!==pilot.sourceKey||row.esmojo_bronbibliotheekid!==pilot.libraryId||!Number.isInteger(number)||number<1||number>11||!v||!Number.isSafeInteger(row.esmojo_bronbestanditemnummer)||row.esmojo_bronbestanditemnummer<1||typeof text!=='string'||!text.trim()||text.length>1048576||!Number.isFinite(Date.parse(row.createdon)))throw Error('DATAVERSE_RESPONSE');
   const path=row.esmojo_bronbestandpad;
   if(typeof path!=='string'||!path.replace(/^\//,'').startsWith('Shared Documents/General/NIEUWE_SHOW_RESULTAAT/'+pilot.sourceKey+'/')||!path.endsWith('.md'))throw Error('DATAVERSE_RESPONSE');
   bytes+=Buffer.byteLength(text);if(bytes>2*1024*1024)throw Error('DATAVERSE_LIMIT');
   const old=selected.get(number);
   // Versies zijn alleen binnen hetzelfde bronbestand vergelijkbaar.
   if(old&&old.esmojo_bronbestanditemnummer!==row.esmojo_bronbestanditemnummer)throw Error('DATAVERSE_AMBIGUOUS');
   if(old&&compare(v,version(old.esmojo_bronversie))===0)throw Error('DATAVERSE_AMBIGUOUS');
   if(!old||compare(v,version(old.esmojo_bronversie))>0)selected.set(number,row);
  }
  const researchByNumber={},researchErrors={};
  for(let number=1;number<=11;number++){
   const row=selected.get(number);
   if(!row){researchErrors[number]='Dit onderzoeksresultaat is nog niet beschikbaar in Dataverse.';continue;}
   researchByNumber[number]={questionNumber:number,answer:row.esmojo_markdowninhoud,sources:[],source:'dataverse',status:'ai-concept',sourceVersion:row.esmojo_bronversie,importedAt:row.createdon};
  }
  return{researchByNumber,researchErrors};
 }
 return{
  applies:isDataversePilot,
  async diagnose(){
   const result={environment:origin,table,configuration:false,tableRead:false,sampleRows:0,showMatches:0,libraryMatches:0,combinedMatches:0,normalizedMatches:0};
   try{
    // Een nieuwe aanmelding/schema-read voor de bewuste diagnoseklik.
    session=null;const {headers,entity}=await connect();result.configuration=true;
    const params=new URLSearchParams({'$select':'esmojo_showsleutel,esmojo_bronbibliotheekid','$top':'50'});
    const data=await get(base+entity+'?'+params,headers);
    if(!Array.isArray(data.value)||data.value.length>50)throw Error('DATAVERSE_RESPONSE');
    result.tableRead=true;result.sampleRows=data.value.length;result.moreRows=Boolean(data['@odata.nextLink']);
    for(const row of data.value){
     const show=row.esmojo_showsleutel,library=row.esmojo_bronbibliotheekid;
     if(show===pilot.sourceKey)result.showMatches++;
     if(library===pilot.libraryId)result.libraryMatches++;
     if(show===pilot.sourceKey&&library===pilot.libraryId)result.combinedMatches++;
     if(typeof show==='string'&&typeof library==='string'&&show.trim()===pilot.sourceKey&&library.trim().toLowerCase()===pilot.libraryId)result.normalizedMatches++;
    }
    return{...result,code:result.combinedMatches?'RESEARCH_MATCH_FOUND':result.normalizedMatches?'RESEARCH_WHITESPACE':result.sampleRows?'RESEARCH_KEYS_DIFFER':'RESEARCH_NO_VISIBLE_ROWS'};
   }catch(error){return{...result,code:['DATAVERSE_CONFIG','DATAVERSE_AUTH','DATAVERSE_SCHEMA','DATAVERSE_READ','DATAVERSE_RESPONSE'].includes(error.message)?error.message:'RESEARCH_UNAVAILABLE'};}
  },
  async load(concertId){
   if(!isDataversePilot(concertId))return null;
   try{return await read();}catch{
    // Geen stille terugval naar oude Drive-resultaten of ruwe providerfouten.
    return{researchByNumber:{},researchErrors:Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,'Dataverse-onderzoek kon niet worden geladen. Vernieuw de pagina of controleer de apprechten en tabelconfiguratie.']))};
   }
  },
  merge(profile,results,number){return results?{...profile,...results,...(number===undefined?{}:{research:results.researchByNumber[number]||null})}:profile;},
 };
}
