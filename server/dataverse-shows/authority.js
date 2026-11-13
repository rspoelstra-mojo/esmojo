import {createNativeShowsRepository} from './repository.js';
import {showTableSchema} from '../dataverse-table-schema.js';
import {recordKey,digest,choice} from '../show-migration-writer.js';
export const runtimeContract='shows-native-runtime-v1';
export const runtimeSchema=digest(showTableSchema);
export function nativeShowsSelected(env=process.env){
 const provider=env.SHOWS_STORAGE_PROVIDER||'legacy';
 if(!['legacy','dataverse'].includes(provider))throw Error('SHOWS_CONFIG');
 return provider==='dataverse';
}
// Deployment alone cannot switch the source of truth. The controlled cutover
// must first publish the verified authority record. Never fall back on failure.
export async function assertNativeAuthority({env=process.env,repository=createNativeShowsRepository({env})}={}){
 const row=await repository.byKey('esmojo_integratiestatus',recordKey('esmojo_integratiestatus','native-authority/v1'));
 let value;try{value=JSON.parse(row?.esmojo_configuratie_json);}catch{throw Error('DATAVERSE_SHOWS_NOT_ACTIVE');}
 if(row?.esmojo_integratiestatus!==choice('integratiestatus','succeeded')||row.esmojo_integratiecode!==runtimeContract||value?.mode!=='dataverse'||value.contract!==runtimeContract||value.schema!==runtimeSchema||value.validation?.status!=='completed'||!/^\w[\w-]{15,100}$/.test(value.validation.taskId||'')||value.legacyWritersStopped!==true||value.deltaVerified!==true||!Number.isFinite(Date.parse(value.activatedAt)))throw Error('DATAVERSE_SHOWS_NOT_ACTIVE');
 return value;
}
