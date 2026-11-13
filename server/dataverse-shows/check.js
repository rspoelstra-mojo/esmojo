import {randomUUID} from 'node:crypto';
import {createNativeShowState} from './state.js';
import {createNativeCatalogue} from './catalogue.js';
import {executeShowRules} from './rules.js';
import {mapShow} from '../show-migration-map.js';
import {record,recordKey,canonical,digest,choice} from '../show-migration-writer.js';
import {nativeId,recordOperations} from './mutations.js';
import {runtimeContract,runtimeSchema} from './authority.js';
// Deployment diagnostic: native business reads only. The atomic write probe is
// restricted to clearly identified technical Opdracht records; no invented show.
export function createNativeRuntimeCheck({env=process.env,state=createNativeShowState({env}),catalogue=createNativeCatalogue({state})}={}){
 const repo=state.repo;
 async function atomicProbe(){
  const identity='native-runtime-probe/v1',row=record('opdracht',identity,'Technische runtimecontrole',{commandosleutel:digest(identity),opdrachtsoort:'shows-native-probe-v1',resourcecode:runtimeSchema,opdrachtstatus:choice('opdrachtstatus','verified'),resultaat_json:canonical({contract:runtimeContract,schema:runtimeSchema})});
  const operations=await recordOperations(repo,[row]);if(operations.length)await repo.atomic(operations);
  const current=await repo.byKey(row.table,row.key),meta=await repo.meta(row.table);if(!current||current.esmojo_resultaat_json!==row.fields.esmojo_resultaat_json)throw Error('VERIFY');
  const changed=canonical({contract:runtimeContract,schema:runtimeSchema,nonce:randomUUID()});
  await repo.atomic([{table:row.table,id:current[meta.PrimaryIdAttribute],method:'PATCH',etag:current['@odata.etag'],payload:{esmojo_resultaat_json:changed}}]);
  const sentinel=record('opdracht','native-runtime-rollback/v1','Moet ontbreken',{commandosleutel:digest('native-runtime-rollback/v1'),opdrachtsoort:'shows-native-probe-v1',resourcecode:runtimeSchema});
  if(await repo.byKey(sentinel.table,sentinel.key))throw Error('DATAVERSE_SHOWS_UNCONFIRMED');
  let rejected=false;try{await repo.atomic([{table:sentinel.table,id:nativeId(sentinel.key),method:'PATCH',create:true,payload:sentinel.fields},{table:row.table,id:current[meta.PrimaryIdAttribute],method:'PATCH',etag:current['@odata.etag'],payload:{esmojo_resultaat_json:'Must never commit'}}]);}catch(error){if(error.message!=='DATAVERSE_SHOWS_CONFLICT')throw error;rejected=true;}
  if(!rejected||await repo.byKey(sentinel.table,sentinel.key)||(await repo.byKey(row.table,row.key))?.esmojo_resultaat_json!==changed)throw Error('DATAVERSE_SHOWS_UNCONFIRMED');return{atomic:true,conflict:true,rollback:true};
 }
 return async input=>{
  if(!input||Array.isArray(input)||Object.keys(input).some(key=>!['step','catalogue'].includes(key))||!Number.isInteger(input.step)||input.step<0||input.step>10000)throw Error('VALIDATION');
  const rows=await catalogue.primaryShows(),fingerprint=digest(rows),total=rows.length;
  if(input.step===0){if(input.catalogue!==undefined)throw Error('VALIDATION');return{ok:true,total,catalogue:fingerprint,contract:runtimeContract};}
  if(input.catalogue!==fingerprint)throw Error('SOURCE_CHANGED');
  if(input.step===1)return{ok:true,...await atomicProbe()};
  const selected=rows[input.step-2];if(!selected)throw Error('VALIDATION');
  const loaded=await state.load(selected.key);await state.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);
  const payload={concertId:selected.key,actor:'native-runtime-check'};
  for(const operation of ['profile-read','ticket-read','final-read','barrier-read','risk-view','floor-read'])executeShowRules(loaded.source,operation,['ticket-read','barrier-read','floor-read'].includes(operation)?payload:{concertId:selected.key});
  // Downloads prove the native byte path and active document ownership.
  let files=0;for(const file of loaded.source.files){const links=await repo.query('esmojo_documentkoppeling',{filter:'_esmojo_concertreeks_value eq '+loaded.seriesId+' and esmojo_koppelstatus eq '+choice('koppelstatus','active')});const dm=await repo.meta('esmojo_document'),document=await repo.byKey('esmojo_document',file.key);if(!links.some(link=>link._esmojo_document_value===document?.[dm.PrimaryIdAttribute]))continue;await repo.downloadDocument(file.key,{seriesId:loaded.seriesId});files++;}
  return{ok:true,verifiedShows:1,verifiedFiles:files};
 };
}
