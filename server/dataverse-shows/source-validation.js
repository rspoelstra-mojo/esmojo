import {createNativeShowState} from './state.js';
import {createDataverseSetupConnection} from '../dataverse-setup-client.js';
import {mapPeople,mapShow,documentRecord,documentLink} from '../show-migration-map.js';
import {createMigrationSource} from '../show-migration-source.js';
import {createMigrationWriter,digest,canonical} from '../show-migration-writer.js';
import {migrateFileStep} from '../show-migration-files.js';
import {linkResearch} from '../show-migration.js';
import {newTimetableRows,addNewTimetables} from './timetable-delta.js';
// Schema and unique indexes were proved by the completed copy. This independent
// final check compares every current source field, relationship and file byte;
// it does not replay hundreds of unrelated metadata setup operations per pass.
export function createSourceValidation({env=process.env,source=createMigrationSource({env}),writer=null,nativeState=null,allowNewTimetables=false,connection=createDataverseSetupConnection({env})}={}){
 const limit=maximum=>{let active=0;const pending=[];return async run=>{if(active>=maximum)await new Promise(resolve=>pending.push(resolve));else active++;try{return await run();}finally{const next=pending.shift();if(next)next();else active--;}};};
 const metadata=limit(4),records=limit(8),bounded={...connection,call:(path,...args)=>(path.startsWith('EntityDefinitions(')?metadata:records)(()=>connection.call(path,...args))};
 nativeState ||= createNativeShowState({env,connection:bounded});
 writer ||= createMigrationWriter({env,readOnly:true,connection:bounded});
 const verify=async records=>{for(let n=0;n<records.length;n+=8)await Promise.all(records.slice(n,n+8).map(row=>writer.ensure(row)));};
 async function files(values,show,actor){
  for(const file of values){let progress=null,rounds=0;while(!progress?.done&&rounds++<260)progress=await migrateFileStep({file,state:progress,writer,readOnly:true,read:offset=>source.readFile(file,offset,show,actor)});if(!progress?.done)throw Error('VERIFY');await writer.markFileVerified(file);}
 }
 return async(cursor,actor,{stableSource=false}={})=>{
  const catalogue=await source.catalogue(),people=await source.people(),catalogueHash=digest(catalogue),peopleHash=digest(people);
  if(cursor&&(cursor.catalogueHash!==catalogueHash||cursor.peopleHash!==peopleHash))throw Error('MIGRATION_SOURCE_CHANGED');
  const state=cursor?structuredClone(cursor):{version:1,phase:'people',index:0,records:0,files:0,catalogueHash,peopleHash,total:catalogue.length};
  if(state.phase==='people'){
   const plan=mapPeople(people);plan.files.push(...source.referenceFiles());for(const file of plan.files)plan.records.push(documentRecord(file),documentLink(file,file.links));
   await verify(plan.records);await files(plan.files,null,actor);state.records+=plan.records.length;state.files+=plan.files.length;state.phase='shows';return state;
  }
  const show=catalogue[state.index];if(!show)return{...state,phase:'complete'};
  const {bundle,management}=await source.show(show),plan=mapShow(bundle,people,management),loaded=await nativeState.load(show.concertId);
  try{await nativeState.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);}catch(error){if(error.message==='DATAVERSE_SHOWS_CONFLICT')error.message='MIGRATION_CONFLICT';throw error;}
  // Raw history hashes remain verified by the native loader. Compare current
  // business documents independently: archiving sorts the same production
  // history events, and old expired field leases must never be resurrected.
  const normalized=documents=>{const copy=structuredClone(documents);if(copy['bezoekersdata.json'])copy['bezoekersdata.json'].leases={};const history=copy['productionele-risicos.json']?.history;if(Array.isArray(history))history.sort((a,b)=>(a.at||'').localeCompare(b.at||'')||canonical(a).localeCompare(canonical(b)));return copy;};
  const sourceDocs=normalized(bundle.documents),nativeDocs=normalized(loaded.source.documents);
  if(canonical(sourceDocs)!==canonical(nativeDocs))throw Object.assign(Error('MIGRATION_CONFLICT'),{migration:{table:'esmojo_historie',differences:[{column:'esmojo_snapshot_json',reason:'VALUE_DIFFERENCE'}]}});
  const baseline=loaded.source.activeAudit?loaded.source.activeAudit.revision===loaded.source.activeRevision:loaded.source.activeRevision===0;
  const monotone=baseline&&Number.isSafeInteger(bundle.activeRevision)&&bundle.activeRevision>=loaded.source.activeRevision;
  const archived=monotone&&bundle.marker?.archived===true&&bundle.marker.mode==='archive';
  const active=monotone&&bundle.activeAudit?.revision===bundle.activeRevision;
  const samePreparation=archived||active;
  const additions=allowNewTimetables?newTimetableRows(bundle,loaded,plan):[],addedKeys=new Set(additions.map(row=>row.key));
  const records=plan.records.filter(row=>!['esmojo_historie','esmojo_integratiestatus','esmojo_opdracht'].includes(row.table)&&!addedKeys.has(row.key));
  for(const row of records)if(row.table==='esmojo_concertreeks'){
   row.fields.esmojo_revisie=loaded.source.nativeGeneration||0;
   // This field records the copied provider generation. A terminal archive
   // or an active sync may advance its protocol without changing business content.
   if(samePreparation)row.fields.esmojo_voorbereidingsgeneratie=loaded.source.activeRevision;
  }
  try{await verify(records);}catch(error){error.sourceMode=bundle.marker?.archived?'archived':bundle.activeAudit?'active':'legacy';throw error;}
  if(samePreparation){state.sourceLineage ||= [];state.sourceLineage.push({concertHash:digest(show.concertId),kind:archived?'archived':'active',copiedGeneration:loaded.source.activeRevision,currentGeneration:bundle.activeRevision,proofHash:digest(archived?bundle.marker:bundle.activeAudit)});}
  await files(plan.files,show,actor);for(const link of plan.deferredLinks)await writer.linkEmpty(link.source,link.field,link.target);
  await linkResearch(writer,plan.researchKeys,plan.series,true);
  // Detect a source change during the native verification, not just between rounds.
  // During the drained write freeze, source.show already brackets Supabase
  // revisions and each File block is hash checked. A second full Drive-folder
  // export adds no writer protection and would double the maintenance window.
  if(!stableSource||additions.length){const after=await source.show(show);if(digest(after)!==digest({bundle,management}))throw Error('MIGRATION_SOURCE_CHANGED');}
  if(additions.length){await addNewTimetables(nativeState,loaded,additions);await verify(additions);const confirmed=await nativeState.load(show.concertId);await nativeState.verifyPlan(mapShow(confirmed.source,confirmed.people),confirmed.source.nativeGeneration||0);}
  state.records+=plan.records.length;state.files+=plan.files.length;state.index++;return state;
 };
}
