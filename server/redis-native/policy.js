import {createNativeShowsRepository} from '../dataverse-shows/repository.js';
import {record,recordKey,canonical,choice,digest} from '../show-migration-writer.js';
import {nativeId} from '../dataverse-shows/mutations.js';
export const redisTaskType='redis-retirement-v1';
const identity='redis-native-authority/v1',key=recordKey('esmojo_integratiestatus',identity);
export const managedRedis=env=>env.VERCEL_ENV==='production'||env.REDIS_STORAGE_PROVIDER==='dataverse';
export function createRedisPolicy({env=process.env,repo=createNativeShowsRepository({env})}={}){
 async function read(){const row=await repo.byKey('esmojo_integratiestatus',key);if(!row)return{row:null,value:{mode:'legacy'}};let value;try{value=JSON.parse(row.esmojo_configuratie_json);}catch{throw Error('REDIS_AUTHORITY_INVALID');}if(row.esmojo_integratiecode!==redisTaskType||row.esmojo_scopecode!=='policy'||value.contract!==redisTaskType||!['freeze','dataverse'].includes(value.mode)||value.mode==='dataverse'&&value.verified!==true)throw Error('REDIS_AUTHORITY_INVALID');return{row,value};}
 async function save(previous,value){const next={...value,contract:redisTaskType},model=record('integratiestatus',identity,'Redis-opvolging · autoriteit',{integratiecode:redisTaskType,scopecode:'policy',integratiestatus:choice('integratiestatus','succeeded'),configuratie_json:canonical(next),revisie:(previous?.row?.esmojo_revisie||0)+1}),m=await repo.meta(model.table);try{await repo.atomic([{table:model.table,id:previous?.row?.[m.PrimaryIdAttribute]||nativeId(key),method:'PATCH',payload:model.fields,...previous?.row?{etag:previous.row['@odata.etag']}:{create:true}}]);}catch(error){if(canonical((await read()).value)!==canonical(next))throw error;}const confirmed=await read();if(canonical(confirmed.value)!==canonical(next))throw Error('REDIS_AUTHORITY_UNCONFIRMED');return confirmed;}
 return{read,save,repo};
}
