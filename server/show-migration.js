import {TASK_AUTHORIZATION_MS} from './task-authorization.js';
import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createDataverseTables} from './dataverse-tables.js';
import {tableSetupSteps,showTableSchema} from './dataverse-table-schema.js';
import {createMigrationSource} from './show-migration-source.js';
import {createMigrationWriter,digest,canonical} from './show-migration-writer.js';
import {mapPeople,mapShow,documentRecord,documentLink} from './show-migration-map.js';
import {migrateFileStep} from './show-migration-files.js';
const contract=digest(showTableSchema);
// Eerst alle sleutels: de vier nog lopende indexen blokkeren iedere datawrite.
const checks=[...tableSetupSteps.filter(s=>s.kind==='key'),...tableSetupSteps.filter(s=>s.kind!=='key')];
export function migrationTokens({env=process.env,now=Date.now}={}){
 function key(){if(typeof env.GOOGLE_DRIVE_SHARED_SECRET!=='string'||env.GOOGLE_DRIVE_SHARED_SECRET.length<32)throw Error('MIGRATION_CONFIG');return createHash('sha256').update('shows-migration-v1\n'+env.GOOGLE_DRIVE_SHARED_SECRET).digest();}
 return{
  seal(value){const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),nonce);cipher.setAAD(Buffer.from(contract));return Buffer.concat([nonce,cipher.update(canonical(value)),cipher.final(),cipher.getAuthTag()]).toString('base64url');},
  open(token,actor,{authorizationExpiresAt}={}){try{if(typeof token!=='string'||token.length>50000)throw Error();const bytes=Buffer.from(token,'base64url');if(bytes.length<29)throw Error();const decipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));decipher.setAAD(Buffer.from(contract));decipher.setAuthTag(bytes.subarray(-16));const state=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]));if(state.version!==1||state.actor!==actor||!Number.isFinite(state.expires))throw Error();
// De geauthenticeerde achtergrondtaak levert haar vaste absolute eindtijd.
// Deze derde serverparameter kan nooit uit de browserpayload komen.
if(authorizationExpiresAt!==undefined){
 if(!Number.isFinite(authorizationExpiresAt)||authorizationExpiresAt<=now()||authorizationExpiresAt>now()+TASK_AUTHORIZATION_MS||state.expires>authorizationExpiresAt)throw Error();
 state.expires=authorizationExpiresAt;
}
if(state.expires<=now()||state.expires>now()+TASK_AUTHORIZATION_MS)throw Error();return state;}catch{throw Error('MIGRATION_TOKEN');}}
 };
}
export function createShowMigration({env=process.env,now=Date.now,source=createMigrationSource({env}),writerFactory=()=>createMigrationWriter({env}),verify=createDataverseTables({env,readOnly:true}),tokens=migrationTokens({env,now})}={}){
 return async function migrate(input,actor,{authorizationExpiresAt}={}){
  if(!input||Array.isArray(input)||typeof actor!=='string'||!actor||!['start','advance'].includes(input.operation)||Object.keys(input).sort().join(',')!==(input.operation==='start'?'operation':'operation,token'))throw Error('VALIDATION');
  if(authorizationExpiresAt!==undefined&&(!Number.isFinite(authorizationExpiresAt)||authorizationExpiresAt<=now()||authorizationExpiresAt>now()+TASK_AUTHORIZATION_MS))throw Error('MIGRATION_TOKEN');
  let state=input.operation==='start'?{version:1,actor,expires:authorizationExpiresAt??now()+TASK_AUTHORIZATION_MS,stage:'schema',index:0,verifiedRecords:0,verifiedFiles:0}:tokens.open(input.token,actor,{authorizationExpiresAt});
  const response=(extra={})=>({status:'running',token:tokens.seal(state),progress:{phase:state.stage,current:state.index,verifiedRecords:state.verifiedRecords,verifiedFiles:state.verifiedFiles},...extra});
  if(state.stage==='schema'){
   const step=checks[state.index];
   if(step){const result=await verify({operation:'apply',stepId:step.id});if(result.status==='pending')return response({status:'blocked',reason:'KEY_INDEX_PENDING',label:step.title});if(result.status!=='verified'||result.verified!==true)return response({status:'blocked',reason:'SCHEMA_CONFLICT',label:step.title});state.index++;return response({label:step.title,total:checks.length});}
   const catalogue=await source.catalogue();state.catalogueHash=digest(catalogue);state.showCount=catalogue.length;state.stage='people';state.index=0;return response({label:'Schema bevestigd; medewerkers en gedeelde bestanden voorbereiden.'});
  }
  // Brongegevens en cryptografische continuatietokens blijven volledig server-side.
  const people=await source.people(),peoplePlan=mapPeople(people),references=source.referenceFiles();
  peoplePlan.files.push(...references);for(const file of peoplePlan.files)peoplePlan.records.push(documentRecord(file),documentLink(file,file.links));
  const peopleHash=digest(people);if(state.peopleHash&&state.peopleHash!==peopleHash)throw Error('MIGRATION_SOURCE_CHANGED');state.peopleHash=peopleHash;
  const writer=writerFactory();
  if(state.stage==='people'){
   for(let n=0;n<8&&state.index<peoplePlan.records.length;n++,state.index++){await writer.ensure(peoplePlan.records[state.index]);state.verifiedRecords++;}
   if(state.index===peoplePlan.records.length){state.stage='people-files';state.index=0;}
   return response({label:'Medewerkers, rechten en documentmetadata',total:peoplePlan.records.length});
  }
  if(state.stage==='people-files'){
   const file=peoplePlan.files[state.index];if(file){const result=await migrateFileStep({file,state:state.file,writer,read:offset=>source.readFile(file,offset,null,actor)});state.file=result;if(result?.done){await writer.markFileVerified(file);state.file=null;state.index++;state.verifiedFiles++;}return response({label:'Gedeeld bestand overzetten en teruglezen',total:peoplePlan.files.length});}
   state.stage='shows';state.index=0;state.recordIndex=0;state.fileIndex=0;return response({label:'Shows voorbereiden'});
  }
  if(state.stage==='shows'){
   const catalogue=await source.catalogue();if(digest(catalogue)!==state.catalogueHash)throw Error('MIGRATION_SOURCE_CHANGED');
   const show=catalogue[state.index];
   if(!show){state.stage='complete';return response({status:'complete',total:state.showCount,label:'Alle geselecteerde Shows-bronnen zijn overgezet en gecontroleerd. Originelen zijn behouden.'});}
   const {bundle,management}=await source.show(show),fingerprint=digest({bundle,management}),plan=mapShow(bundle,people,management);
   if(state.showHash&&state.showHash!==fingerprint)throw Error('MIGRATION_SOURCE_CHANGED');state.showHash=fingerprint;
   const records=plan.records.filter(row=>row.table!=='esmojo_integratiestatus');
   for(let n=0;n<8&&state.recordIndex<records.length;n++,state.recordIndex++){await writer.ensure(records[state.recordIndex]);state.verifiedRecords++;}
   if(state.recordIndex<records.length)return response({label:show.artist+' · gegevens en relaties',total:state.showCount});
   const file=plan.files[state.fileIndex];
   if(file){const result=await migrateFileStep({file,state:state.file,writer,read:offset=>source.readFile(file,offset,show,actor)});state.file=result;if(result?.done){await writer.markFileVerified(file);state.file=null;state.fileIndex++;state.verifiedFiles++;}return response({label:show.artist+' · bestand overzetten en teruglezen',total:state.showCount});}
   // Bestaande Markdown en bronnen behouden; alleen de lege reeksrelatie aanvullen.
   for(const link of plan.deferredLinks)await writer.linkEmpty(link.source,link.field,link.target);
   await linkResearch(writer,plan.researchKeys,plan.series);
   for(const row of plan.records.filter(row=>row.table==='esmojo_integratiestatus')){await writer.ensure(row);state.verifiedRecords++;}
   state.index++;state.recordIndex=0;state.fileIndex=0;state.showHash=null;return response({label:show.artist+' · gecontroleerd',total:state.showCount});
  }
  if(state.stage==='complete')return response({status:'complete',total:state.showCount});
  throw Error('MIGRATION_TOKEN');
 };
}
async function linkResearch(writer,keys,series){
 const metadata=await writer.meta('esmojo_onderzoeksresultaat'),target=await writer.resolve(series),nav=metadata.ManyToOneRelationships.find(row=>row.ReferencingAttribute==='esmojo_concertreeks')?.ReferencingEntityNavigationPropertyName;
 if(typeof nav!=='string'||!/^[a-z][a-z0-9_]+$/i.test(nav))throw Error('MIGRATION_SCHEMA');
 for(const key of keys){const filter="esmojo_showsleutel eq '"+key.replaceAll("'","''")+"' and (esmojo_bronbibliotheekid eq '8d4b3512-7f82-4d51-a98a-a0c67d629184' or esmojo_bronbibliotheekid eq '9c30d516-2487-48fe-bbd8-40fcee494bea')";
  const result=await writer.json(metadata.EntitySetName+'?'+new URLSearchParams({'$select':metadata.PrimaryIdAttribute+',_esmojo_concertreeks_value','$filter':filter,'$top':'100'}));if(!Array.isArray(result?.value)||result['@odata.nextLink'])throw Error('MIGRATION_SOURCE_LIMIT');
  for(const row of result.value){if(row._esmojo_concertreeks_value===target.id)continue;if(row._esmojo_concertreeks_value)throw Error('MIGRATION_CONFLICT');const id=row[metadata.PrimaryIdAttribute];if(!/^[a-f0-9-]{36}$/i.test(id)||!row['@odata.etag'])throw Error('MIGRATION_SCHEMA');const response=await writer.call(metadata.EntitySetName+'('+id+')',{method:'PATCH',body:{[nav+'@odata.bind']:'/'+target.set+'('+target.id+')'},headers:{'If-Match':row['@odata.etag']}});if(!response.ok)throw Error('MIGRATION_UNCONFIRMED');const actual=await writer.json(metadata.EntitySetName+'('+id+')?$select=_esmojo_concertreeks_value');if(actual?._esmojo_concertreeks_value!==target.id)throw Error('MIGRATION_UNCONFIRMED');}
 }
}
