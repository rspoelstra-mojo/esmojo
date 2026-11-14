import {createTaskStore} from '../background-tasks/store.js';
import {createReportsMigrationSource} from '../reports-migration/source.js';
import {createReportsManifest} from '../reports-migration/manifest.js';
import {createReportsWriter,groupReportEntries} from '../reports-migration/writer.js';
import {documentRows,sourceRows,mailRows,recipientRows,sourceHistoryRows,canonicalSources,mapDataset,filePlan,headerRef,datasetRef} from '../reports-migration/map.js';
import {reportsSchemaHash} from '../reports-schema.js';
import {canonical,digest,choice} from '../show-migration-writer.js';
import {reportRecord} from '../reports-migration/contract.js';
import {migrateFileStep} from '../show-migration-files.js';

export const reportsValidationType='reports-validation-v1';

// A validation inherits the exact original actor, epoch and expiry. It cannot
// silently turn a completed copy into a fresh 48-hour business-data delegation.
export async function ensureReportsValidation({store,tasks,now=Date.now,resumeTechnical=false}){
 const migration=await store.get('reports-migration-v1'),state=migration?.state;
 if(state?.status!=='complete'||state.lease||state.expiresAt<=now())throw Error('VALIDATION_APPROVAL_REQUIRED');
 if(resumeTechnical){
  const prior=await store.get(reportsValidationType),p=prior?.state;
  if(p?.status==='blocked'){
   let cursor;try{cursor=JSON.parse(p.cursor);}catch{throw Error('TASK_CORRUPT');}
   if(p.actor!==state.actor||p.expiresAt!==state.expiresAt||p.lease||p.uncertain||p.handlerVersion!==1||p.public?.code!=='REPORTS_VALIDATION_UNCONFIRMED'||cursor.version!==1||cursor.schema!==reportsSchemaHash||cursor.migration!==state.epoch||cursor.run!==p.epoch||cursor.phase!=='datasets')throw Error('TASK_BUSY');
   return tasks.control({operation:'resume',type:reportsValidationType},state.actor,{authorizationExpiresAt:state.expiresAt,expectedEpoch:p.epoch,expectedSequence:p.sequence});
  }
 }
 return tasks.control({operation:'start',type:reportsValidationType},state.actor,{authorizationExpiresAt:state.expiresAt});
}

export function createReportsValidation({env=process.env,now=Date.now,store=createTaskStore({env}),source=createReportsMigrationSource({env}),manifest=createReportsManifest({env,store,now}),writer=createReportsWriter({env,readOnly:true})}={}){
 let bundleCache=null,datasetCache=null;
 const view=s=>({cursor:canonical(s),status:s.phase==='complete'?'complete':'ready',public:{label:s.phase==='complete'?'Rapportages-bronnen, relaties en bestanden opnieuw gecontroleerd.':'Rapportages onafhankelijk teruglezen; bedrijfsgegevens blijven ongewijzigd.',total:s.total,progress:{phase:s.phase,current:s.index,verifiedRecords:s.records,verifiedFiles:s.files}}});
 async function migration(actor,authorizationExpiresAt){
  const row=await store.get('reports-migration-v1'),state=row?.state;
  if(state?.status!=='complete'||state.lease||state.actor!==actor||state.expiresAt!==authorizationExpiresAt||state.expiresAt<=now())throw Error('VALIDATION_APPROVAL_REQUIRED');
  let cursor;try{cursor=JSON.parse(state.cursor);}catch{throw Error('TASK_CORRUPT');}
  if(cursor.phase!=='complete'||cursor.schema!==reportsSchemaHash||cursor.run!==state.epoch||!Number.isSafeInteger(cursor.total)||cursor.total<0)throw Error('TASK_CORRUPT');
  return{state,cursor};
 }
 async function sameInventory(s,actor,expiresAt){
  const fresh=await source.catalogue(actor);
  if(groupReportEntries(fresh.entries).length!==s.total)throw Error('MIGRATION_SOURCE_CHANGED');
  if(fresh.fingerprint===s.inventoryHash)return;
  const selected=await manifest.get(s.migration,'selection',0,actor,expiresAt);
  if(!Number.isSafeInteger(selected.settingsPages)||selected.settingsPages<1||selected.settingsPages>10000)throw Error('TASK_CORRUPT');
  const parts=[];for(let i=0;i<selected.settingsPages;i++)parts.push(await manifest.get(s.migration,'settings',i,actor,expiresAt));
  const text=parts.join('');if(digest(text)!==selected.settingsHash)throw Error('TASK_CORRUPT');
  const settings=JSON.parse(text),present=Object.hasOwn(settings,'pipeline');
  if(!await source.matchesInventory(s.inventoryHash,{present,value:present?settings.pipeline:null},actor))throw Error('MIGRATION_SOURCE_CHANGED');
 }
 async function verifyRows(s,rows){
  if(s.row>=rows.length)return true;
  const first=rows[s.row],batch=[];
  for(const row of rows.slice(s.row,s.row+32)){if(row.table!==first.table||Buffer.byteLength(canonical([...batch,row]))>1800000)break;batch.push(row);}
  if(!batch.length)throw Error('MIGRATION_MAPPING');
  await writer.attachEmployees(batch);
  // ensureMany belongs to a writer whose transport independently rejects every
  // mutation, including when an expected record has disappeared.
  await writer.ensureMany(batch);s.row+=batch.length;s.records+=batch.length;return s.row===rows.length;
 }
 async function datasetCardinality(plan){
  const version=await writer.resolve(plan.version);
  const context=plan.records.find(row=>row.table==='esmojo_rapportcontext');if(!context)throw Error('MIGRATION_MAPPING');
  const contextTarget=await writer.resolve(context);
  for(const table of ['esmojo_rapportincident','esmojo_rapportcontext','esmojo_rapporttekstblok','esmojo_rapporttijdpunt']){
   const m=await writer.meta(table),expected=new Set(plan.records.filter(row=>row.table===table).map(row=>row.key)),seen=new Set();
   const owner=table==='esmojo_rapporttijdpunt'?{field:'_esmojo_rapportcontext_value',id:contextTarget.id}:{field:'_esmojo_rapportversie_value',id:version.id};
   let path=m.EntitySetName+'?'+new URLSearchParams({'$filter':owner.field+' eq '+owner.id,'$select':m.PrimaryIdAttribute+',esmojo_sleutel'}),pages=0;
   while(path){
    if(++pages>50)throw Error('MIGRATION_CONFLICT');let result;
    try{result=await writer.json(path,{headers:{Prefer:'odata.maxpagesize=1000'}});}catch(error){error.reportsValidationStage='cardinality';throw error;}
    if(!Array.isArray(result?.value)||result.value.length>1000)throw Error('MIGRATION_CONFLICT');
    for(const row of result.value){if(!expected.has(row.esmojo_sleutel)||seen.has(row.esmojo_sleutel))throw Error('MIGRATION_CONFLICT');seen.add(row.esmojo_sleutel);}
    path=null;if(result['@odata.nextLink']){const next=new URL(result['@odata.nextLink']);if(next.origin!=='https://org5bab852a.crm.dynamics.com'||next.pathname!=='/api/data/v9.2/'+m.EntitySetName||next.username||next.password||next.hash)throw Error('MIGRATION_CONFLICT');path=m.EntitySetName+next.search;}
   }
   if(seen.size!==expected.size)throw Error('MIGRATION_CONFLICT');
  }
 }
 return{title:'Rapportages-eindvalidatie',module:'reports',version:1,idempotent:true,delegatedOnly:true,
  async step({cursor,actor,runId,authorizationExpiresAt}){
   const copied=await migration(actor,authorizationExpiresAt);
   const s=cursor?JSON.parse(cursor):{version:1,schema:reportsSchemaHash,run:runId,migration:copied.state.epoch,inventoryHash:copied.cursor.inventoryHash,total:copied.cursor.total,page:0,entry:0,index:0,row:0,settings:0,source:0,file:0,fileState:null,records:0,files:0,phase:'inventory'};
   if(s.version!==1||s.schema!==reportsSchemaHash||s.run!==runId||s.migration!==copied.state.epoch||s.inventoryHash!==copied.cursor.inventoryHash||s.total!==copied.cursor.total||!['inventory','selection','settings','base','datasets','files','publish','finish','complete'].includes(s.phase)||!['page','entry','index','row','settings','source','file','records','files'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)||s.index>s.total)throw Error('TASK_CORRUPT');
   if(s.phase==='complete')return view(s);
   if(s.phase==='inventory'){await sameInventory(s,actor,authorizationExpiresAt);s.phase='selection';return view(s);}
   if(s.phase==='selection'){
    const selection=await manifest.get(s.migration,'selection',0,actor,authorizationExpiresAt);
    if(await verifyRows(s,recipientRows(selection))){s.row=0;s.phase='settings';}return view(s);
   }
   if(s.phase==='settings'){
    const selection=await manifest.get(s.migration,'selection',0,actor,authorizationExpiresAt);
    if(!Number.isSafeInteger(selection.settingsPages)||selection.settingsPages<1||selection.settingsPages>10000)throw Error('TASK_CORRUPT');
    if(s.settings<selection.settingsPages){
     const text=await manifest.get(s.migration,'settings',s.settings,actor,authorizationExpiresAt);
     await writer.ensure(reportRecord('historie','reports-settings/'+selection.settingsHash+'/'+s.settings,'Rapportages · bestaande verwerkingshistorie',{entiteitsoort:'reports-source-settings-v1',mutatiesoort:choice('mutatiesoort','import'),snapshot_json:canonical({version:1,hash:selection.settingsHash,index:s.settings,total:selection.settingsPages,text}),fingerprint:digest(text),schemaversie:1}));s.settings++;s.records++;
    }else s.phase=s.total?'base':'finish';return view(s);
   }
   if(s.phase==='finish'){await sameInventory(s,actor,authorizationExpiresAt);bundleCache=null;datasetCache=null;s.phase='complete';return view(s);}
   const page=await manifest.get(s.migration,'page',s.page,actor,authorizationExpiresAt),entry=page?.[s.entry];if(!entry)throw Error('TASK_CORRUPT');
   const cacheKey=s.run+'/'+s.migration+'/'+entry.show.key,proof=await manifest.get(s.migration,'proof',s.index,actor,authorizationExpiresAt);
   let bundle;
   if(bundleCache?.key===cacheKey&&s.phase!=='publish'){if(bundleCache.hash!==proof.sourceHash)throw Error('TASK_CORRUPT');bundle=bundleCache.value;}
   else{bundle=await source.bundle(entry,actor);bundleCache={key:cacheKey,value:bundle,hash:digest(bundle)};datasetCache=null;}
   if(digest(bundle)!==proof.sourceHash)throw Error('MIGRATION_SOURCE_CHANGED');
   const sources=canonicalSources(bundle),base=[...sourceHistoryRows(bundle),...documentRows(bundle),...sourceRows(bundle),...mailRows(bundle).records];
   if(digest(base)!==proof.baseHash||canonical(sources.map(item=>datasetRef(bundle,item).key))!==canonical(proof.datasetFingerprints)||canonical(filePlan(bundle).map(file=>({sha256:file.sha256,size:file.size})))!==canonical(proof.files))throw Error('TASK_CORRUPT');
   if(s.phase==='base'){
    await writer.core(entry);
    if(await verifyRows(s,base)){s.phase='datasets';s.row=0;}return view(s);
   }
   if(s.phase==='datasets'){
    const item=sources[s.source];if(!item){s.phase='files';s.row=0;return view(s);}
    const key=cacheKey+'/'+item.source.id+'/'+item.sha256;let plan;
    if(datasetCache?.key===key)plan=datasetCache.value;
    else{const bytes=await source.csv(entry,item.source.id,actor,item.sha256);plan=mapDataset(bundle,item,bytes);datasetCache={key,value:plan};}
    if(await verifyRows(s,plan.records)){await datasetCardinality(plan);await writer.markVerified(plan.version,'esmojo_versiestatus');s.source++;s.row=0;datasetCache=null;}return view(s);
   }
   if(s.phase==='files'){
    const file=filePlan(bundle)[s.file];if(!file){s.phase='publish';return view(s);}
    s.fileState=await migrateFileStep({file,state:s.fileState,writer,read:offset=>source.readFile(entry,file,offset,actor),now,readOnly:true});
    if(s.fileState?.done){await writer.markFileVerified(file);s.fileState=null;s.file++;s.files++;}return view(s);
   }
   if(s.phase==='publish'){
    for(const item of mailRows(bundle).verified)await writer.markVerified(item.ref,item.field);
    await writer.publish(headerRef(bundle.show),bundle.show.available&&sources.length?datasetRef(bundle,sources[0]):null);
    s.index++;s.entry++;if(s.entry===page.length){s.page++;s.entry=0;}s.phase=s.index===s.total?'finish':'base';s.row=0;s.source=0;s.file=0;bundleCache=null;datasetCache=null;return view(s);
   }
   throw Error('TASK_CORRUPT');
  },
  failure(error){
   const allowed=['MIGRATION_CONFLICT','MIGRATION_DEPENDENCY','MIGRATION_SOURCE_CHANGED','MIGRATION_MAPPING','MIGRATION_REJECTED','TASK_CORRUPT','VALIDATION_APPROVAL_REQUIRED','FORBIDDEN'];
   const temporary=['ONTRACK_REPORT_UNAVAILABLE','SETUP_TEMPORARY','SETUP_THROTTLED','MIGRATION_UNCONFIRMED'].includes(error.message);
   const http=error.migrationRead?.status,readCode=Number.isInteger(http)&&http>=400&&http<=599?(error.reportsValidationStage==='cardinality'?'REPORTS_COUNT_HTTP_':'REPORTS_READ_HTTP_')+http:null;
   return{code:readCode||(allowed.includes(error.message)||temporary?error.message:error instanceof TypeError?'REPORTS_VALIDATION_RUNTIME_TYPE':error instanceof RangeError?'REPORTS_VALIDATION_RUNTIME_RANGE':'REPORTS_VALIDATION_UNCONFIRMED'),retryable:temporary,error:temporary?'De read-only controle wacht op de bron of Dataverse; voortgang is behouden.':'De Rapportages-eindvalidatie is gestopt. Bron en doel zijn niet aangepast; inhoudelijke controle is nodig.'};
  }
 };
}
