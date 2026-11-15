import {record,recordKey,canonical,migrationDifferences} from '../show-migration-writer.js';
import {nativeId} from '../dataverse-shows/mutations.js';
export const securityTable='esmojo_technischestatus';
export const technicalKey=(kind,resource)=>recordKey(securityTable,'redis-native/'+kind+'/'+resource);
export function technicalRecord(kind,resource,fields={}){return record('technischestatus','redis-native/'+kind+'/'+resource,'Tijdelijke technische opslag',{doelsoort:kind,resourcecode:resource,...fields});}
export async function technicalOperation(repo,model,previous){const m=await repo.meta(securityTable);return{table:securityTable,id:previous?.[m.PrimaryIdAttribute]||nativeId(model.key),method:'PATCH',payload:model.fields,...previous?{etag:previous['@odata.etag']}:{create:true}};}
export async function proveTechnical(repo,models){await Promise.all(models.map(async model=>{const actual=await repo.byKey(securityTable,model.key);if(!actual||migrationDifferences(model,actual,model.fields).length)throw Error('SECURITY_STORAGE_UNCONFIRMED');}));}
export async function writeTechnical(repo,pairs){const operations=[];for(const [model,previous]of pairs)operations.push(await technicalOperation(repo,model,previous));let uncertain;try{await repo.atomic(operations);}catch(error){uncertain=error;}try{await proveTechnical(repo,pairs.map(([model])=>model));}catch(error){throw uncertain||error;}}
