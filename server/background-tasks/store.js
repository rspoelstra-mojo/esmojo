import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createDataverseSetupConnection} from '../dataverse-setup-client.js';
import {record,recordKey,choice} from '../show-migration-writer.js';
const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,127}$/i.test(value);
const statuses={ready:'pending',waiting:'pending',running:'running',complete:'verified',blocked:'conflict'};
export function taskCipher({env=process.env}={}){
 function key(){if(typeof env.GOOGLE_DRIVE_SHARED_SECRET!=='string'||env.GOOGLE_DRIVE_SHARED_SECRET.length<32)throw Error('TASK_CONFIG');return createHash('sha256').update('esmojo/background-tasks/v1\n'+env.GOOGLE_DRIVE_SHARED_SECRET).digest();}
 return{
  seal(type,state){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(type));return JSON.stringify({version:1,sealed:Buffer.concat([iv,cipher.update(JSON.stringify(state)),cipher.final(),cipher.getAuthTag()]).toString('base64url')});},
  open(type,text){try{if(typeof text!=='string'||text.length>120000)throw Error();const envelope=JSON.parse(text);if(envelope.version!==1||typeof envelope.sealed!=='string')throw Error();const bytes=Buffer.from(envelope.sealed,'base64url'),decipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));decipher.setAAD(Buffer.from(type));decipher.setAuthTag(bytes.subarray(-16));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]));}catch{throw Error('TASK_CORRUPT');}}
 };
}
export function createTaskStore({env=process.env,connection=createDataverseSetupConnection({env}),cipher=taskCipher({env})}={}){
 let metadata=null;
 async function call(path,{headers={},...options}={}){const ctx=await connection.connect();return connection.call(path,{...ctx.headers,...headers},{...options,code:'TASK_UNCONFIRMED',timeoutMs:45000});}
 async function meta(){
  if(metadata)return metadata;
  const response=await call("EntityDefinitions(LogicalName='esmojo_opdracht')?$select=LogicalName,EntitySetName,PrimaryIdAttribute&$expand=Keys($select=SchemaName,KeyAttributes,EntityKeyIndexStatus)");if(!response.ok)throw Error('TASK_SCHEMA');const value=await response.json();
  if(value.LogicalName!=='esmojo_opdracht'||!identifier(value.EntitySetName)||!identifier(value.PrimaryIdAttribute)||!Array.isArray(value.Keys))throw Error('TASK_SCHEMA');
  for(const [name,column]of [['esmojo_ak_opdracht_sleutel','esmojo_sleutel'],['esmojo_ak_opdracht_commando','esmojo_commandosleutel']])if(!value.Keys.some(key=>key.SchemaName?.toLowerCase()===name&&key.KeyAttributes?.length===1&&key.KeyAttributes[0]===column&&['Active',2].includes(key.EntityKeyIndexStatus)))throw Error('TASK_SCHEMA');metadata=value;return value;
 }
 function parse(type,row,m){
  if(!row||row.esmojo_opdrachtsoort!=='background-task-v1'||row.esmojo_resourcecode!==type||row.esmojo_sleutel!==recordKey('esmojo_opdracht','background-task/'+type)||typeof row['@odata.etag']!=='string'||!/^[a-f0-9-]{36}$/i.test(row[m.PrimaryIdAttribute]||''))throw Error('TASK_CORRUPT');
  const state=cipher.open(type,row.esmojo_payload_json);if(state?.version!==1||state.type!==type||typeof state.actor!=='string'||typeof state.epoch!=='string'||!Object.hasOwn(statuses,state.status)||!Number.isInteger(state.sequence)||state.sequence<0||!Number.isFinite(state.expiresAt)||!Number.isFinite(state.nextAt))throw Error('TASK_CORRUPT');
  if((state.lease?.id||null)!==(row.esmojo_leaseid||null)||state.lease&&Date.parse(row.esmojo_leaseverlooptop)!==state.lease.until)throw Error('TASK_CORRUPT');
  return{id:row[m.PrimaryIdAttribute],etag:row['@odata.etag'],state};
 }
 async function get(type){
  const m=await meta(),key=recordKey('esmojo_opdracht','background-task/'+type),response=await call(m.EntitySetName+'?'+new URLSearchParams({'$filter':"esmojo_sleutel eq '"+key+"'",'$top':'2','$select':[m.PrimaryIdAttribute,'esmojo_sleutel','esmojo_opdrachtsoort','esmojo_resourcecode','esmojo_payload_json','esmojo_leaseid','esmojo_leaseverlooptop'].join(',')}));if(!response.ok)throw Error('TASK_UNCONFIRMED');const result=await response.json();if(!Array.isArray(result.value)||result.value.length>1||result['@odata.nextLink'])throw Error('TASK_CORRUPT');return result.value.length?parse(type,result.value[0],m):null;
 }
 function payload(type,state){return{esmojo_payload_json:cipher.seal(type,state),esmojo_resultaat_json:JSON.stringify(state.public||{}),esmojo_revisie:state.sequence,esmojo_opdrachtstatus:choice('opdrachtstatus',state.lease&&state.status==='ready'?'running':statuses[state.status]),esmojo_pogingen:state.attempts||0,esmojo_leaseid:state.lease?.id||null,esmojo_leaseverlooptop:state.lease?new Date(state.lease.until).toISOString():null,esmojo_gestartop:new Date(state.startedAt).toISOString(),esmojo_bevestigdop:state.status==='complete'?new Date(state.updatedAt).toISOString():null,esmojo_foutcode:state.public?.code||null};}
 async function create(type,title,state){
  const m=await meta(),identity='background-task/'+type,key=recordKey('esmojo_opdracht',identity),hex=key,id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32),base=record('opdracht',identity,title,{commandosleutel:key,opdrachtsoort:'background-task-v1',resourcecode:type});
  const response=await call(m.EntitySetName+'('+id+')',{method:'PATCH',headers:{'If-None-Match':'*'},body:{...base.fields,...payload(type,state)}});if(!response.ok&&![409,412].includes(response.status))throw Error('TASK_UNCONFIRMED');const result=await get(type);if(!result)throw Error('TASK_UNCONFIRMED');return result;
 }
 async function save(row,state){
  const m=await meta(),response=await call(m.EntitySetName+'('+row.id+')',{method:'PATCH',headers:{'If-Match':row.etag},body:payload(state.type,state)});if(response.status===412)throw Error('TASK_STALE');if(!response.ok)throw Error('TASK_UNCONFIRMED');const result=await get(state.type);if(!result)throw Error('TASK_UNCONFIRMED');return result;
 }
 async function claimRunner(lease,now){
  const type='runner-lock';let row=await get(type);
  if(!row)row=await create(type,'Achtergrondtaken · uitvoeringsslot',{version:1,type,actor:'internal-worker',epoch:lease.id,handlerVersion:1,status:'ready',cursor:null,sequence:0,attempts:0,startedAt:now,updatedAt:now,expiresAt:now+24*3600000,nextAt:now,lease:null,public:{label:'Technisch uitvoeringsslot'}});
  if(row.state.lease?.until>now)return null;
  try{const result=await save(row,{...row.state,lease,sequence:row.state.sequence+1,updatedAt:now});return result.state.lease?.id===lease.id?result:null;}catch(error){if(error.message==='TASK_STALE')return null;throw error;}
 }
 async function releaseRunner(row,leaseId,now){const current=await get('runner-lock');if(current?.state.lease?.id===leaseId)await save(current,{...current.state,lease:null,sequence:current.state.sequence+1,updatedAt:now});}
 return{get,create,save,claimRunner,releaseRunner};
}
