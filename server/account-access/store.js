import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createNativeShowsRepository} from '../dataverse-shows/repository.js';
import {record,recordKey,canonical,choice} from '../show-migration-writer.js';
import {nativeId} from '../dataverse-shows/mutations.js';
import {validateAccountModules} from '../../shared/account-modules.js';
export const accessContract='account-access-v1';
export const validAccountId=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
export function accessFlags(value){
 if(!validAccountId(value?.id)||typeof value.activated!=='boolean'||typeof value.disabled!=='boolean')throw Error('ACCESS_CORRUPT');
 return{id:value.id,activated:value.activated,disabled:value.disabled,modules:validateAccountModules(value.modules)};
}
// Separate domain/key and per-record AAD; no names, roles, mail or tokens here.
export function createAccessStore({env=process.env,repo=createNativeShowsRepository({env})}={}){
 const key=()=>{if(typeof env.GOOGLE_DRIVE_SHARED_SECRET!=='string'||env.GOOGLE_DRIVE_SHARED_SECRET.length<32)throw Error('ACCESS_CONFIG');return createHash('sha256').update('esmojo/account-access/v1\n'+env.GOOGLE_DRIVE_SHARED_SECRET).digest();};
 const identity=id=>id===null?'account-access-policy/v1':validAccountId(id)?'account-access/v1/'+id:(()=>{throw Error('VALIDATION');})();
 function seal(aad,value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(aad));return Buffer.concat([iv,cipher.update(canonical(value)),cipher.final(),cipher.getAuthTag()]).toString('base64url');}
 function open(aad,text){try{if(typeof text!=='string'||text.length>20000)throw Error();const bytes=Buffer.from(text,'base64url'),cipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));cipher.setAAD(Buffer.from(aad));cipher.setAuthTag(bytes.subarray(-16));return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(12,-16)),cipher.final()]));}catch{throw Error('ACCESS_CORRUPT');}}
 function parse(id,row){const name=identity(id);if(!row)return null;
  if(row.esmojo_sleutel!==recordKey('esmojo_integratiestatus',name)||row.esmojo_integratiestatus!==choice('integratiestatus','succeeded'))throw Error('ACCESS_CORRUPT');
  if(row.esmojo_integratiecode!==accessContract||row.esmojo_bronidentiteit!==name)throw Error('ACCESS_CORRUPT');const value=open(name,row.esmojo_configuratie_json);
  if(value.contract!==accessContract||!Number.isSafeInteger(value.generation)||value.generation<1||row.esmojo_revisie!==value.generation)throw Error('ACCESS_CORRUPT');
  if(id===null){if(!['legacy','freeze','dataverse'].includes(value.mode)||typeof value.epoch!=='string'||value.mode==='dataverse'&&(value.verified!==true||value.sourceGuard!==true||!Number.isFinite(value.activatedAt)))throw Error('ACCESS_CORRUPT');}
  else if(accessFlags(value).id!==id)throw Error('ACCESS_CORRUPT');
  return{row,value};
 }
 async function get(id){return parse(id,await repo.byKey('esmojo_integratiestatus',recordKey('esmojo_integratiestatus',identity(id))));}
 async function authorization(id){
  const keys=[null,id].map(value=>recordKey('esmojo_integratiestatus',identity(value)));
  const rows=await repo.query('esmojo_integratiestatus',{filter:keys.map(key=>"esmojo_sleutel eq '"+key+"'").join(' or ')});
  if(rows.length>2||new Set(rows.map(row=>row.esmojo_sleutel)).size!==rows.length||rows.some(row=>!keys.includes(row.esmojo_sleutel)))throw Error('ACCESS_CORRUPT');
  return{policy:parse(null,rows.find(row=>row.esmojo_sleutel===keys[0]))?.value||{mode:'legacy'},account:parse(id,rows.find(row=>row.esmojo_sleutel===keys[1]))};
 }
 async function save(id,previous,value){const name=identity(id),m=await repo.meta('esmojo_integratiestatus'),generation=(previous?.value.generation||0)+1,next={...value,contract:accessContract,generation};
  const model=record('integratiestatus',name,id===null?'Accounttoegang · bronbeleid':'Accounttoegang',{
   integratiecode:accessContract,scopecode:id===null?'policy':'account',integratiestatus:choice('integratiestatus','succeeded'),revisie:generation,configuratie_json:seal(name,next)});
  await repo.atomic([{table:model.table,id:previous?.row[m.PrimaryIdAttribute]||nativeId(model.key),method:'PATCH',payload:model.fields,...(previous?{etag:previous.row['@odata.etag']}:{create:true})}]);
  const confirmed=await get(id);if(!confirmed||canonical(confirmed.value)!==canonical(next))throw Error('ACCESS_UNCONFIRMED');return confirmed;
 }
 async function policy(){return(await get(null))?.value||{mode:'legacy'};}
 return{get,save,policy,authorization,repo};
}
