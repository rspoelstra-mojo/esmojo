import {createShowsStore} from './shows-store.js';
import {createActiveRepository} from './active-show-store.js';
import {createShowManagementRepository} from './show-management.js';
import {createDataverseResearch} from './dataverse-research.js';
import {researchShow} from './dataverse-shows.js';
import {researchKeyForConcert} from '../shared/dataverse-shows.js';
import {validateActiveSnapshot} from '../shared/active-show-storage.js';
import {barrierReferenceManifest} from '../shared/barrier-reference-manifest.js';
import {digest} from './show-migration-writer.js';
const clone=value=>JSON.parse(JSON.stringify(value));
export function createMigrationSource({env=process.env,drive=createShowsStore({env,active:false}),active=createActiveRepository({env}),management=createShowManagementRepository({env}),research=createDataverseResearch({env})}={}){
 async function activeRows(){const rows=await (active.migrationIdentities?active.migrationIdentities():active.all());if(!Array.isArray(rows)||rows.length>1000)throw Error('MIGRATION_SOURCE_LIMIT');if(rows.length&&active.enabled&&!await active.enabled())throw Error('MIGRATION_ORPHAN');return rows;}
 return{
  async catalogue(){
   const source=await drive('migration-v1-catalogue');if(source?.version!==1||!Array.isArray(source.shows)||source.shows.length>10000)throw Error('MIGRATION_SOURCE');
   const shows=source.shows.map(row=>({...row,source:'drive'})),keys=await research.sourceKeys();
   const active=await activeRows();if(active.some(row=>!shows.some(show=>row.aliases?.includes(show.concertId))))throw Error('MIGRATION_ORPHAN');
   const identities=keys.length?await drive('research-identities',{sourceKeys:keys.slice(0,500)}):{concerts:[]};if(keys.length>500)throw Error('MIGRATION_SOURCE_LIMIT');
   for(const key of keys)if(!shows.some(row=>researchKeyForConcert(row)===key||row.memberShows?.some(member=>researchKeyForConcert(member)===key))){const show=researchShow(key,identities.concerts);if(!show)throw Error('MIGRATION_SOURCE');shows.push({concertId:show.key,artist:show.name,venue:show.venue,city:show.city,date:show.dates[0],source:'dataverse',sourceKey:key});}
   return shows.sort((a,b)=>a.concertId.localeCompare(b.concertId));
  },
  async people(){const source=await drive('migration-v1-people');if(source?.version!==1)throw Error('MIGRATION_SOURCE');return source;},
  referenceFiles(){return Object.entries(barrierReferenceManifest).map(([type,value])=>({fileId:'reference/'+type,identity:'reference/'+type,name:value.fileName,mime:'image/png',size:value.size,sha256:value.sha256,kind:'barrier-reference',version:1,links:{},type}));},
  async show(show){
   if(show.source==='dataverse')return{bundle:{version:1,concertId:show.concertId,shows:[{...show,time:'Niet vermeld'}],documents:{},files:[],unknown:[],timetables:[]},management:null};
   const before=await active.get(show.concertId);if(before&&(before.external_command||before.lease&&Date.parse(before.lease_until)>Date.now()))throw Error('STORAGE_BUSY');
   const bundle=await drive('migration-v1-show',{concertId:show.concertId});if(bundle?.version!==1||bundle.concertId!==show.concertId)throw Error('MIGRATION_SOURCE');
   const after=await active.get(show.concertId);if(after&&(after.external_command||after.lease&&Date.parse(after.lease_until)>Date.now()))throw Error('STORAGE_BUSY');if(Boolean(before)!==Boolean(after)||before&&before.revision!==after.revision)throw Error('MIGRATION_SOURCE_CHANGED');
   if(bundle.marker&&!bundle.marker.archived&&!after)throw Error('MIGRATION_ORPHAN');
   if(after){
    const receipts=await active.migrationReceipts(after.concert_id);if(!Array.isArray(receipts)||receipts.length>200)throw Error('MIGRATION_SOURCE_LIMIT');bundle.receipts=receipts;
    const snapshot=validateActiveSnapshot(after.snapshot),original=clone(bundle.documents['productionele-risicos.json']||{}),floorHistory=(original.history||[]).filter(row=>row.field==='floor_pressure'||row.field==='measure_text'&&row.measureId==='production:floor_pressure');
    // Bestandsreferenties moeten al in de gecontroleerde Drive-ledger staan.
    if(after.pending)throw Error('STORAGE_BUSY');
    bundle.documents['showprofiel.json']=clone(snapshot.profile);bundle.documents['analyseafronding.json']=clone(snapshot.final);
    bundle.documents['productionele-risicos.json']={...clone(snapshot.production),floorPressure:original.floorPressure||null,history:[...(snapshot.production.history||[]),...floorHistory]};
    bundle.activeRevision=after.revision;bundle.activeAudit={revision:after.revision,concertId:after.concert_id,snapshot:clone(snapshot)};
   }
   const row=await management.get(show.concertId);
   return{bundle,management:row?{id:row.id,concert_id:row.concert_id,access_hash:row.access_hash,pin_hash:row.pin_hash,sealed_credentials:row.sealed_credentials,enabled:row.enabled,progress:row.progress,attempt_count:row.attempt_count,attempt_until:row.attempt_until,created_at:row.created_at}:null};
  },
  async readFile(file,offset,show,actor){
   if(file.bytes){const bytes=file.bytes;return{size:bytes.length,sha256:digest(bytes),offset,base64:bytes.subarray(offset,offset+1048576).toString('base64')};}
   if(file.type){const value=await drive('reference-read',{type:file.type,actor}),bytes=Buffer.from(value.base64,'base64');if(digest(bytes)!==file.sha256)throw Error('MIGRATION_SOURCE_CHANGED');return{size:bytes.length,sha256:file.sha256,offset,base64:bytes.subarray(offset,offset+1048576).toString('base64')};}
   return drive('migration-v1-file',{concertId:show.concertId,fileId:file.fileId,offset});
  }
 };
}
