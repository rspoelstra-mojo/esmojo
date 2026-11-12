import {dataversePilot as pilot} from '../shared/dataverse-pilot.js';
import {RESEARCH_LIBRARY,parseResearchKey,researchKeyForId,isDataverseShowId} from '../shared/dataverse-shows.js';

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
 async function query(params,{limit=500}={}){
  const {headers,entity}=await connect();let url=base+entity+'?'+new URLSearchParams(params),rows=[],pages=0;
  while(url){
   if(++pages>Math.ceil(limit/50)+1)throw Error('DATAVERSE_LIMIT');
   const data=await get(url,params.fetchXml?{...headers,Prefer:'odata.maxpagesize=5000'}:headers);
   if(!Array.isArray(data.value)||rows.length+data.value.length>limit)throw Error('DATAVERSE_LIMIT');
   rows.push(...data.value);url=data['@odata.nextLink'];
   if(url){const next=new URL(url);if(next.origin!==origin||next.pathname!=='/api/data/v9.2/'+entity||next.username||next.password||next.hash)throw Error('DATAVERSE_RESPONSE');}
  }
  return rows;
 }
 const configured=()=>Boolean(env.DATAVERSE_TEST_CLIENT_SECRET);
 async function sourceKeys(){
  if(!configured())return[];
  const xml='<fetch aggregate="true"><entity name="'+table+'"><attribute name="esmojo_showsleutel" alias="show_key" groupby="true"/><filter><condition attribute="esmojo_bronbibliotheekid" operator="eq" value="'+RESEARCH_LIBRARY+'"/></filter></entity></fetch>';
  const rows=await query({fetchXml:xml},{limit:5000});
  return [...new Set(rows.map(row=>parseResearchKey(row.show_key??row.showKey)?.sourceKey).filter(Boolean))];
 }
 async function read(sourceKey){
  const escaped=sourceKey.replaceAll("'","''");
  const rows=await query({'$select':columns.join(','),'$filter':`contains(esmojo_showsleutel,'${escaped}') and esmojo_bronbibliotheekid eq '${RESEARCH_LIBRARY}'`,'$top':'501'});
  const selected=new Map();let bytes=0;
  for(const row of rows){
   if(typeof row.esmojo_showsleutel!=='string'||row.esmojo_showsleutel.trim()!==sourceKey)continue;
   const number=row.esmojo_vraagnummer,v=version(row.esmojo_bronversie),text=row.esmojo_markdowninhoud;
   if(row.esmojo_bronbibliotheekid!==RESEARCH_LIBRARY||!Number.isInteger(number)||number<1||number>11||!v||!Number.isSafeInteger(row.esmojo_bronbestanditemnummer)||row.esmojo_bronbestanditemnummer<1||typeof text!=='string'||!text.trim()||text.length>1048576||!Number.isFinite(Date.parse(row.createdon)))throw Error('DATAVERSE_RESPONSE');
   const path=row.esmojo_bronbestandpad;
   if(typeof path!=='string'||!path.replace(/^\//,'').startsWith('Shared Documents/General/NIEUWE_SHOW_RESULTAAT/'+sourceKey+'/')||!path.endsWith('.md'))throw Error('DATAVERSE_RESPONSE');
   bytes+=Buffer.byteLength(text);if(bytes>2*1024*1024)throw Error('DATAVERSE_LIMIT');
   const old=selected.get(number);
   // Versies zijn alleen binnen hetzelfde bronbestand vergelijkbaar.
   if(old&&old.esmojo_bronbestanditemnummer!==row.esmojo_bronbestanditemnummer){
    const newer=Date.parse(row.createdon)-Date.parse(old.createdon);if(!newer)throw Error('DATAVERSE_AMBIGUOUS');if(newer>0)selected.set(number,row);continue;
   }
   if(old&&compare(v,version(old.esmojo_bronversie))===0)throw Error('DATAVERSE_AMBIGUOUS');
   if(!old||compare(v,version(old.esmojo_bronversie))>0)selected.set(number,row);
  }
  const researchByNumber={},researchErrors={};
  for(let number=1;number<=11;number++){
   const row=selected.get(number);
   if(!row){researchErrors[number]='Dit onderzoeksresultaat is nog niet beschikbaar in Dataverse.';continue;}
   researchByNumber[number]={questionNumber:number,answer:row.esmojo_markdowninhoud,sources:[],source:'dataverse',status:'ai-concept',sourceVersion:row.esmojo_bronversie,importedAt:row.createdon};
  }
  return{researchByNumber,researchErrors,...(selected.size?{}:{empty:true})};
 }
 return{
  applies:id=>Boolean(researchKeyForId(id)),
  configured,
  sourceKeys,
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
   const key=researchKeyForId(concertId);if(!key||!configured()&&!isDataverseShowId(concertId))return null;
   try{const result=await read(key);if(result.empty&&!isDataverseShowId(concertId))return null;delete result.empty;return result;}catch{
    if(!isDataverseShowId(concertId))return null;
    // Geen stille terugval naar oude Drive-resultaten of ruwe providerfouten.
    return{researchByNumber:{},researchErrors:Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,'Dataverse-onderzoek kon niet worden geladen. Vernieuw de pagina of controleer de apprechten en tabelconfiguratie.']))};
   }
  },
  merge(profile,results,number){return results?{...profile,...results,...(number===undefined?{}:{research:results.researchByNumber[number]||null})}:profile;},
 };
}
