import {createDataverseSetupConnection} from '../dataverse-setup-client.js';
import {mapPeople,mapShow,documentRecord,documentLink} from '../show-migration-map.js';
import {createMigrationSource} from '../show-migration-source.js';
import {createMigrationWriter,digest} from '../show-migration-writer.js';
import {migrateFileStep} from '../show-migration-files.js';
import {linkResearch} from '../show-migration.js';
// Schema and unique indexes were proved by the completed copy. This independent
// final check compares every current source field, relationship and file byte;
// it does not replay hundreds of unrelated metadata setup operations per pass.
export function createSourceValidation({env=process.env,source=createMigrationSource({env}),writer=null,connection=createDataverseSetupConnection({env})}={}){
 const limit=maximum=>{let active=0;const pending=[];return async run=>{if(active>=maximum)await new Promise(resolve=>pending.push(resolve));else active++;try{return await run();}finally{const next=pending.shift();if(next)next();else active--;}};};
 const metadata=limit(4),records=limit(8),bounded={...connection,call:(path,...args)=>(path.startsWith('EntityDefinitions(')?metadata:records)(()=>connection.call(path,...args))};
 writer ||= createMigrationWriter({env,readOnly:true,connection:bounded});
 const verify=async records=>{for(let n=0;n<records.length;n+=8)await Promise.all(records.slice(n,n+8).map(row=>writer.ensure(row)));};
 async function files(values,show,actor){
  for(const file of values){let progress=null,rounds=0;while(!progress?.done&&rounds++<260)progress=await migrateFileStep({file,state:progress,writer,readOnly:true,read:offset=>source.readFile(file,offset,show,actor)});if(!progress?.done)throw Error('VERIFY');await writer.markFileVerified(file);}
 }
 return async(cursor,actor)=>{
  const catalogue=await source.catalogue(),people=await source.people(),catalogueHash=digest(catalogue),peopleHash=digest(people);
  if(cursor&&(cursor.catalogueHash!==catalogueHash||cursor.peopleHash!==peopleHash))throw Error('MIGRATION_SOURCE_CHANGED');
  const state=cursor?structuredClone(cursor):{version:1,phase:'people',index:0,records:0,files:0,catalogueHash,peopleHash,total:catalogue.length};
  if(state.phase==='people'){
   const plan=mapPeople(people);plan.files.push(...source.referenceFiles());for(const file of plan.files)plan.records.push(documentRecord(file),documentLink(file,file.links));
   await verify(plan.records);await files(plan.files,null,actor);state.records+=plan.records.length;state.files+=plan.files.length;state.phase='shows';return state;
  }
  const show=catalogue[state.index];if(!show)return{...state,phase:'complete'};
  const {bundle,management}=await source.show(show),plan=mapShow(bundle,people,management);await verify(plan.records);
  await files(plan.files,show,actor);for(const link of plan.deferredLinks)await writer.linkEmpty(link.source,link.field,link.target);
  await linkResearch(writer,plan.researchKeys,plan.series,true);
  // Detect a source change during the native verification, not just between rounds.
  const after=await source.show(show);if(digest(after)!==digest({bundle,management}))throw Error('MIGRATION_SOURCE_CHANGED');
  state.records+=plan.records.length;state.files+=plan.files.length;state.index++;return state;
 };
}
