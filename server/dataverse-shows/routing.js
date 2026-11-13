import {createNativeShowsRepository} from './repository.js';
import {assertNativeAuthority,nativeShowsSelected} from './authority.js';
import {recordKey} from '../show-migration-writer.js';
export const managedShowsRouting=env=>nativeShowsSelected(env)||(env.VERCEL_ENV==='production'&&Boolean(env.DATAVERSE_TEST_CLIENT_SECRET));
export function createManagedShowsRouting({env=process.env,repository=createNativeShowsRepository({env})}={}){
 return async({legacy,native})=>{
  const row=await repository.byKey('esmojo_integratiestatus',recordKey('esmojo_integratiestatus','native-authority/v1'));
  let policy=null;if(row){try{policy=JSON.parse(row.esmojo_configuratie_json);}catch{throw Error('DATAVERSE_SHOWS_NOT_ACTIVE');}}
  if(policy?.mode==='freeze')throw Error('STORAGE_BUSY');
  if(policy?.mode==='dataverse'||nativeShowsSelected(env)){await assertNativeAuthority({env,repository});return native();}
  if(policy&&policy.mode!=='legacy')throw Error('DATAVERSE_SHOWS_NOT_ACTIVE');
  return legacy();
 };
}
