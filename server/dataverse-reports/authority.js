import {createNativeReportsRepository} from './repository.js';
import {createReportsWriter} from '../reports-migration/writer.js';
import {taskCipher} from '../background-tasks/store.js';
import {reportRecord,reportChoice} from '../reports-migration/contract.js';
import {reportsSchemaHash} from '../reports-schema.js';
import {digest,canonical,recordKey,migrationDifferences} from '../show-migration-writer.js';
import {reportsRecordContract} from '../reports-migration/contract.js';
export const reportsRuntimeContract='reports-native-runtime-v1';
export const reportsCoverage=Object.freeze(['web-menu','web-read','web-scan','web-source','web-commit','web-historical-status','scan','pipeline','reserve','commit','fail','link','retry','download','send','online-sync','online-reserve','online-commit','online-fail','delivery-reserve','delivery-commit','delivery-fail','pdf-alerts','email-history','email-open','timetable-candidates','timetable-read','timetable-save','email-context','ontrack-status','ontrack-recipients','artist-catalogue','artist-profile','artist-show','incident-read','incident-source','incident-counts']);
export const reportsCoverageHash=digest({contract:reportsRuntimeContract,operations:reportsCoverage,schema:reportsSchemaHash});
export const reportsAuthorityKey=recordKey('esmojo_integratiestatus','reports-native-authority/v1');
export const reportsFinalValidationType='reports-final-validation-v1';
export const reportsPrecheckType='reports-validation-v1';
const fastMode=value=>value.activationMode==='confirmed-copy-v1';
const activationFacts=value=>value.coverage===reportsCoverageHash&&value.legacyWritersStopped===true&&value.validation?.status==='completed'&&(fastMode(value)?value.validation.type===reportsPrecheckType&&value.writeStopSkipped===true&&value.finalComparisonSkipped===true&&value.inventoryVerified===true&&value.deltaVerified===false:value.deltaVerified===true);
export const managedReportsRouting=env=>env.REPORTS_STORAGE_PROVIDER==='dataverse'||env.VERCEL_ENV==='production'&&Boolean(env.DATAVERSE_TEST_CLIENT_SECRET);
export function createReportsAuthority({env=process.env,repository=createNativeReportsRepository({env}),writer=createReportsWriter({env}),now=Date.now}={}){
 const repo=repository;
 async function read(){const row=await repo.byKey('esmojo_integratiestatus',reportsAuthorityKey);if(!row)return{row:null,value:{mode:'legacy'}};let value;try{value=JSON.parse(row.esmojo_configuratie_json);}catch{throw Error('REPORTS_AUTHORITY_INVALID');}if(value?.version!==1||value.contract!==reportsRuntimeContract||value.schema!==reportsSchemaHash||!['legacy','freeze','dataverse'].includes(value.mode)||value.mode!=='legacy'&&!/^[a-f0-9-]{36}$/i.test(value.epoch||''))throw Error('REPORTS_AUTHORITY_INVALID');return{row,value};}
 async function set(value,{etag=null}={}){
  if(!value||!['legacy','freeze','dataverse'].includes(value.mode)||value.mode!=='legacy'&&(!/^[a-f0-9-]{36}$/i.test(value.epoch||'')||!Number.isFinite(value.drainUntil)))throw Error('VALIDATION');
  const observed=await read();
  if(value.mode==='dataverse'&&observed.value.mode!=='dataverse'&&(!activationFacts(value)||(fastMode(value)?observed.value.mode!=='legacy':observed.value.mode!=='freeze'||value.epoch!==observed.value.epoch||now()<observed.value.drainUntil)))throw Error('REPORT_CONFLICT');if(observed.value.mode==='dataverse'&&(value.mode!=='dataverse'||value.epoch!==observed.value.epoch)||observed.row&&observed.row['@odata.etag']!==etag||!observed.row&&etag)throw Error('REPORT_CONFLICT');
  const fields={integratiecode:reportsRuntimeContract,scopecode:'reports',integratiestatus:reportChoice('integratiestatus',value.mode==='dataverse'?'succeeded':value.mode==='freeze'?'running':'idle'),configuratie_json:canonical({...value,version:1,contract:reportsRuntimeContract,schema:reportsSchemaHash}),revisie:(observed.row?.esmojo_revisie??-1)+1},expected=reportRecord('integratiestatus','reports-native-authority/v1','Rapportages-opslagautoriteit',fields);
  if(!observed.row)await writer.ensure(expected);
  else{const metadata=await writer.meta(expected.table),id=await repo.idOf(expected.table,observed.row);try{await writer.call(metadata.EntitySetName+'('+id+')',{method:'PATCH',headers:{'If-Match':etag},body:expected.fields});}catch{/* Independent readback is mandatory, never replay this CAS. */}}
  const result=await read();if(!result.row||migrationDifferences(expected,result.row,expected.fields,reportsRecordContract).length)throw Error('REPORT_WRITE_UNCONFIRMED');return result;
 }
 async function assert(observed){
  const current=observed||await read(),value=current.value;
  if(current.row?.esmojo_integratiestatus!==reportChoice('integratiestatus','succeeded')||value.mode!=='dataverse'||!activationFacts(value)||!Number.isFinite(Date.parse(value.activatedAt)))throw Error('REPORTS_NOT_ACTIVE');
  const proofType=fastMode(value)?reportsPrecheckType:reportsFinalValidationType,task=await repo.byKey('esmojo_opdracht',recordKey('esmojo_opdracht','background-task/'+proofType)),m=await repo.meta('esmojo_opdracht');let proof;try{proof=taskCipher({env}).open(proofType,task?.esmojo_payload_json);}catch{throw Error('REPORTS_NOT_ACTIVE');}
  let cursor;try{cursor=typeof proof.cursor==='string'?JSON.parse(proof.cursor):proof.cursor;}catch{throw Error('REPORTS_NOT_ACTIVE');}
  if(task[m.PrimaryIdAttribute]!==value.validation.taskId||task.esmojo_opdrachtsoort!=='background-task-v1'||task.esmojo_resourcecode!==proofType||task.esmojo_opdrachtstatus!==reportChoice('opdrachtstatus','verified')||proof.type!==proofType||proof.status!=='complete'||proof.lease||proof.epoch!==value.validation.epoch||proof.sequence!==value.validation.sequence||cursor?.phase!=='complete'||cursor.schema!==reportsSchemaHash||cursor.run!==proof.epoch||(!fastMode(value)&&proof.epoch!==value.epoch)||(fastMode(value)&&cursor.migration!==value.migrationEpoch)||Date.parse(value.activatedAt)>proof.expiresAt)throw Error('REPORTS_NOT_ACTIVE');return value;
 }
 return{read,set,assert};
}
