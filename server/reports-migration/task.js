import {createReportsMigrationSource} from './source.js';
import {createReportsWriter,groupReportEntries} from './writer.js';
import {splitManifest,createReportsManifest} from './manifest.js';
import {documentRows,sourceRows,mailRows,recipientRows,canonicalSources,mapDataset,filePlan,headerRef,datasetRef} from './map.js';
import {migrationType,reportRecord} from './contract.js';
import {reportsSchemaHash,reportsDependenciesContract,reportsTablesContract} from '../reports-schema.js';
import {createDataverseTables} from '../dataverse-tables.js';
import {migrateFileStep} from '../show-migration-files.js';
import {digest,canonical,choice} from '../show-migration-writer.js';
import {metadataProcessing} from '../dataverse-setup-retry.js';
const metadataPlan=[...reportsDependenciesContract.tableSetupSteps.map(step=>({...step,dependency:true})),...reportsTablesContract.tableSetupSteps].sort((a,b)=>Number(b.kind==='key')-Number(a.kind==='key'));
const phases=['schema','inventory','selection','settings','base','datasets','files','verify-base','verify-datasets','commit','audit','finish','complete'];
export function createReportsMigrationTask({env=process.env,now=Date.now,source=createReportsMigrationSource({env}),writer=createReportsWriter({env}),verifyWriter=createReportsWriter({env,readOnly:true}),manifest=createReportsManifest({env,now}),checks=metadataPlan,dependencies=createDataverseTables({env,readOnly:true,contract:reportsDependenciesContract}),tables=createDataverseTables({env,readOnly:true,contract:reportsTablesContract})}={}){
 // At most one private report/dataset in RAM. Durable pages, never this cache,
 // determine identity, source fingerprints and resumption. No rights are cached.
 let inventoryCache=null,bundleCache=null,datasetCache=null;
 const output=(s,label,status='ready',extra={})=>({cursor:JSON.stringify(s),status,...extra,public:{label,total:s.total||0,progress:{phase:s.phase,current:s.reportIndex||0,verifiedRecords:s.records||0,verifiedFiles:s.files||0},...(extra.public||{})}});
 async function inventory(actor){const value=await source.catalogue(actor);if(!value.selection)throw Error('MIGRATION_SOURCE');return{...value,entries:groupReportEntries(value.entries)};}
 async function entryAt(s,actor,expires){const page=await manifest.get(s.run,'page',s.pageIndex,actor,expires);if(!Array.isArray(page)||!page[s.entryIndex])throw Error('TASK_CORRUPT');return{entry:page[s.entryIndex],page};}
 async function bundle(s,entry,actor){const key=s.run+'/'+entry.show.key;if(bundleCache?.key===key){if(s.bundleHash&&s.bundleHash!==bundleCache.hash)throw Error('MIGRATION_SOURCE_CHANGED');s.bundleHash=bundleCache.hash;return bundleCache.value;}const value=await source.bundle(entry,actor),hash=digest(value);if(s.bundleHash&&s.bundleHash!==hash)throw Error('MIGRATION_SOURCE_CHANGED');s.bundleHash=hash;bundleCache={key,value,hash};datasetCache=null;return value;}
 async function dataset(s,b,item,entry,actor){const key=s.run+'/'+b.show.key+'/'+item.source.id;if(datasetCache?.key===key)return datasetCache.value;const bytes=await source.csv(entry,item.source.id,actor,item.sha256),value=mapDataset(b,item,bytes);datasetCache={key,value};return value;}
 async function rowsStep(s,records,indexName,service){
  const first=records[s[indexName]];if(!first)return true;
  const batch=[];for(const row of records.slice(s[indexName],s[indexName]+32)){if(row.table!==first.table||Buffer.byteLength(canonical([...batch,row]))>1800000)break;batch.push(row);}if(!batch.length)throw Error('MIGRATION_MAPPING');
  if(service.attachEmployees)await service.attachEmployees(batch);await service.ensureMany(batch);s[indexName]+=batch.length;if(service===writer)s.records+=batch.length;return s[indexName]===records.length;
 }
 return{title:'Rapportages-migratie',module:'reports',version:1,idempotent:true,
  async step({cursor,actor,runId,authorizationExpiresAt}){
   let s=cursor?JSON.parse(cursor):{version:1,schema:reportsSchemaHash,run:runId,phase:'schema',checkIndex:0,pageIndex:0,entryIndex:0,reportIndex:0,records:0,files:0,total:0};
   if(s.version!==1||s.schema!==reportsSchemaHash||s.run!==runId||!phases.includes(s.phase)||!['checkIndex','pageIndex','entryIndex','reportIndex','records','files','total'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0))throw Error('REPORTS_MIGRATION_CURSOR');
   const reply=label=>output(s,label);
   if(s.phase==='schema'){
    const batch=checks.slice(s.checkIndex,s.checkIndex+4);
    const results=await Promise.all(batch.map(step=>(step.dependency?dependencies:tables)({operation:'apply',stepId:step.id})));
    if(results.some(r=>r.status==='pending'))return output(s,'Wachten totdat de Dataverse-sleutelindex Actief is.','waiting',{delayMs:30000});
    if(results.some(r=>r.status!=='verified'||r.verified!==true))throw Error('REPORTS_SCHEMA_CONFLICT');
    s.checkIndex+=batch.length;if(s.checkIndex===checks.length)s.phase='inventory';
    return reply('Schema en actieve sleutels controleren · '+s.checkIndex+' van '+checks.length);
   }
   if(s.phase==='inventory'){
    if(!inventoryCache||inventoryCache.run!==s.run){const value=await inventory(actor);inventoryCache={run:s.run,value,...splitManifest(value.entries,value.selection)};}
    const value=inventoryCache.value;if(s.inventoryHash&&s.inventoryHash!==value.fingerprint)throw Error('MIGRATION_SOURCE_CHANGED');s.inventoryHash=value.fingerprint;s.total=value.entries.length;s.pageCount=inventoryCache.pages.length;
    if(s.pageIndex<s.pageCount){await manifest.put(s.run,'page',s.pageIndex,inventoryCache.pages[s.pageIndex],actor,authorizationExpiresAt);s.pageIndex++;return reply('Broninventaris veilig vastleggen · '+s.pageIndex+' van '+s.pageCount);}
    s.settingsPages=inventoryCache.settings.length;s.settingsIndex=s.settingsIndex||0;if(s.settingsIndex<s.settingsPages){await manifest.put(s.run,'settings',s.settingsIndex,inventoryCache.settings[s.settingsIndex],actor,authorizationExpiresAt);s.settingsIndex++;return reply('Bestaande bron- en verwerkingshistorie vastleggen · '+s.settingsIndex+' van '+s.settingsPages);}
    await manifest.put(s.run,'selection',0,inventoryCache.selection,actor,authorizationExpiresAt);s.phase='selection';s.selectionIndex=0;s.pageIndex=0;inventoryCache=null;return reply('Broninventaris vastgelegd; bestaande ontvangerselectie controleren.');
   }
   if(s.phase==='selection'){
    const selection=await manifest.get(s.run,'selection',0,actor,authorizationExpiresAt),rows=recipientRows(selection);
    if(await rowsStep(s,rows,'selectionIndex',writer)){s.phase='settings';s.settingsIndex=0;s.baseIndex=0;}return reply('Bestaande ontvangerselectie overzetten; er worden geen mails verzonden.');
   }
   if(s.phase==='settings'){
    const selection=await manifest.get(s.run,'selection',0,actor,authorizationExpiresAt);
    if(s.settingsIndex<s.settingsPages){const text=await manifest.get(s.run,'settings',s.settingsIndex,actor,authorizationExpiresAt),id='reports-settings/'+selection.settingsHash+'/'+s.settingsIndex;
     await writer.ensure(reportRecord('historie',id,'Rapportages · bestaande verwerkingshistorie',{entiteitsoort:'reports-source-settings-v1',mutatiesoort:choice('mutatiesoort','import'),snapshot_json:canonical({version:1,hash:selection.settingsHash,index:s.settingsIndex,total:s.settingsPages,text}),fingerprint:digest(text),schemaversie:1}));s.records++;s.settingsIndex++;return reply('Bestaande verwerkingshistorie kopiëren en teruglezen.');}
    s.phase=s.total?'base':'finish';return reply('Bestaande ontvangers en verwerkingshistorie bevestigd.');
   }
   if(s.phase==='audit'){
    const {entry,page}=await entryAt(s,actor,authorizationExpiresAt),proof=await manifest.get(s.run,'proof',s.auditIndex,actor,authorizationExpiresAt),fresh=await source.bundle(entry,actor);
    if(digest(fresh)!==proof.sourceHash)throw Error('MIGRATION_SOURCE_CHANGED');
    if(!s.verifyCoreDone){await verifyWriter.core(entry);s.verifyCoreDone=true;}const sources=canonicalSources(fresh);await verifyWriter.publish(headerRef(fresh.show),fresh.show.available&&sources.length?datasetRef(fresh,sources[0]):null);
    s.auditIndex++;s.entryIndex++;if(s.entryIndex===page.length){s.pageIndex++;s.entryIndex=0;}if(s.auditIndex===s.total)s.phase='finish';return reply('Onafhankelijke eindcontrole · '+s.auditIndex+' van '+s.total+' rapportages');
   }
   if(s.phase==='finish'){
    const current=await inventory(actor);if(current.fingerprint!==s.inventoryHash||current.entries.length!==s.total)throw Error('MIGRATION_SOURCE_CHANGED');
    s.phase='complete';bundleCache=null;datasetCache=null;return output(s,'Alle bestaande Rapportages-bronnen, gegevens en bestanden zijn gekopieerd en teruggelezen. Originelen en huidige opslagroutes zijn behouden.','complete');
   }
   if(s.phase==='complete')return output(s,'Rapportages-kopie is volledig gecontroleerd; de bestaande websitebron is behouden.','complete');
   const {entry,page}=await entryAt(s,actor,authorizationExpiresAt),b=await bundle(s,entry,actor),sources=canonicalSources(b),base=[...documentRows(b),...sourceRows(b),...mailRows(b).records];
   if(s.phase==='base'){
    if(!s.coreDone){await writer.core(entry);s.coreDone=true;}
    if(await rowsStep(s,base,'baseIndex',writer)){s.phase='datasets';s.sourceIndex=0;s.rowIndex=0;}
    return reply(b.show.name+' · bronnen, bestanden en bestaande verzendhistorie');
   }
   if(s.phase==='datasets'||s.phase==='verify-datasets'){
    const verifying=s.phase==='verify-datasets',item=sources[s.sourceIndex];
    if(!item){s.phase=verifying?'commit':'files';s.fileIndex=0;s.file=null;return reply(b.show.name+' · '+(verifying?'terugleescontrole bevestigd':'incidentgegevens bevestigd'));}
    const plan=await dataset(s,b,item,entry,actor);
    if(await rowsStep(s,plan.records,'rowIndex',verifying?verifyWriter:writer)){s.sourceIndex++;s.rowIndex=0;datasetCache=null;}
    return reply(b.show.name+' · '+(verifying?'incidenten teruglezen':'incidenten overzetten')+' · bron '+Math.min(s.sourceIndex+1,sources.length)+' van '+sources.length);
   }
   if(s.phase==='files'){
    const file=filePlan(b)[s.fileIndex];
    if(!file){s.phase='verify-base';s.verifyIndex=0;return reply(b.show.name+' · alle bestandbytes gecontroleerd; gegevens teruglezen.');}
    const result=await migrateFileStep({file,state:s.file,writer,read:offset=>source.readFile(entry,file,offset,actor),now});s.file=result;
    if(result?.done){await writer.markFileVerified(file);s.file=null;s.fileIndex++;s.files++;}
    return reply(b.show.name+' · '+(file.kind==='csv'?'CSV':'PDF')+' kopiëren en byte voor byte teruglezen');
   }
   if(s.phase==='verify-base'){
    if(!s.verifyCoreDone){await verifyWriter.core(entry);s.verifyCoreDone=true;}
    if(await rowsStep(s,base,'verifyIndex',verifyWriter)){s.phase='verify-datasets';s.sourceIndex=0;s.rowIndex=0;datasetCache=null;}
    return reply(b.show.name+' · bronrelaties en verzendhistorie teruglezen');
   }
   if(s.phase==='commit'){
    const fresh=await source.bundle(entry,actor);if(digest(fresh)!==s.bundleHash)throw Error('MIGRATION_SOURCE_CHANGED');
    for(const item of sources)await writer.markVerified(datasetRef(b,item),'esmojo_versiestatus');
    for(const item of mailRows(b).verified)await writer.markVerified(item.ref,item.field);
    await writer.publish(headerRef(b.show),b.show.available&&sources.length?datasetRef(b,sources[0]):null);
    await manifest.put(s.run,'proof',s.reportIndex,{sourceHash:s.bundleHash,baseHash:digest(base),datasetFingerprints:sources.map(item=>datasetRef(b,item).key),files:filePlan(b).map(file=>({sha256:file.sha256,size:file.size}))},actor,authorizationExpiresAt);
    s.reportIndex++;s.entryIndex++;if(s.entryIndex===page.length){s.pageIndex++;s.entryIndex=0;}s.phase=s.reportIndex===s.total?'audit':'base';if(s.phase==='audit'){s.pageIndex=0;s.entryIndex=0;s.auditIndex=0;}s.baseIndex=0;s.coreDone=false;s.verifyCoreDone=false;s.bundleHash=null;s.file=null;bundleCache=null;datasetCache=null;return reply(b.show.name+' · volledig gecontroleerd');
   }
   throw Error('REPORTS_MIGRATION_CURSOR');
  },
  failure(error){
   const temporary=['DRIVE_UNAVAILABLE','ONTRACK_REPORT_UNAVAILABLE','SETUP_TEMPORARY','SETUP_THROTTLED','STORAGE_BUSY','REPORT_CONFLICT'].includes(error.message),processing=metadataProcessing(error);
   const messages={REPORTS_UNLINKED:'Er staan nog CSV-bestanden zonder eenduidige concertkoppeling in OnTrack. Koppel die eerst via het bestaande rapportagebeheer; er zijn geen bronnen verwijderd.',REPORTS_SCHEMA_CONFLICT:'De bestaande Dataverse-inrichting wijkt af of is niet volledig gereed. Controleer de inrichting voordat je hervat.',MIGRATION_SOURCE_CHANGED:'De bron is tijdens de kopie gewijzigd. De migratie stopt voor controle; bevestigde gegevens en originelen zijn behouden.',SOURCE_CHANGED:'De bron is tijdens de kopie gewijzigd. De migratie stopt voor controle; bevestigde gegevens en originelen zijn behouden.',MIGRATION_CONFLICT:'De bestaande doelgegevens wijken af. Er is niets overschreven; laat dit controleren voordat je hervat.',MIGRATION_MAPPING:'Een bronwaarde past niet eenduidig in het voorbereide model. De migratie stopt voor controle; er is niets afgekapt of afgerond.'};
   return{code:Object.hasOwn(messages,error.message)?error.message:temporary||processing?error.message:'REPORTS_MIGRATION_UNCONFIRMED',error:messages[error.message]||(temporary||processing?'De bron of Dataverse is tijdelijk niet beschikbaar. De server bewaart de voortgang en probeert veilig opnieuw.':'De Rapportages-kopie is gestopt voor controle. Bronnen en bestaande opslagroutes zijn behouden.'),retryable:(temporary||Boolean(processing))&&!(processing?.retryAfterSeconds>300),retryAfterSeconds:Number(error.retryAfterSeconds)||processing?.retryAfterSeconds||0,uncertain:['MIGRATION_UNCONFIRMED','MIGRATION_FILE_UNCONFIRMED'].includes(error.message)};
  }
 };
}
export {migrationType};
