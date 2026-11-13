import {canonical} from '../show-migration-writer.js';
import {recordOperations} from './mutations.js';
// This is not a general reconciliation path. Only a first published timetable
// for an existing concert can be added; any change/removal of a copied snapshot
// remains a conflict. Imported source history is never overwritten.
export function newTimetableRows(bundle,loaded,plan){
 const current=(bundle.timetables||[]).filter(row=>row.snapshot),copied=loaded.source.timetables||[];
 if(new Set(current.map(row=>row.concertId)).size!==current.length)throw Error('MIGRATION_SOURCE');
 for(const old of copied){const found=current.find(row=>row.concertId===old.concertId);if(!found||canonical(found.snapshot)!==canonical(old.snapshot))throw Error('MIGRATION_CONFLICT');}
 const additions=current.filter(row=>!copied.some(old=>old.concertId===row.concertId));
 const identities=new Set(additions.flatMap(row=>['drive-series/'+bundle.concertId+'/timetable/'+row.concertId,...row.snapshot.entries.map((_,index)=>'timetable/'+row.concertId+'/'+index)]));
 const rows=plan.records.filter(row=>identities.has(row.identity));
 if(rows.length!==identities.size||rows.some(row=>!['esmojo_tijdschemaregel','esmojo_historie'].includes(row.table)))throw Error('MIGRATION_SOURCE');
 return rows;
}
export async function addNewTimetables(state,loaded,rows){
 if(!rows.length)return;
 const operations=await recordOperations(state.repo,rows);
 // Existing equal rows may result from a confirmed retry; an existing different
 // row is never patched, even when its new source value looks plausible.
 if(operations.some(operation=>!operation.create))throw Error('MIGRATION_CONFLICT');
 if(operations.length){
  operations.push({table:'esmojo_concertreeks',id:loaded.seriesId,method:'PATCH',etag:loaded.series['@odata.etag'],payload:{esmojo_revisie:loaded.series.esmojo_revisie}});
  await state.repo.atomic(operations);
 }
 const confirmed=await state.load(loaded.source.concertId);
 return confirmed;
}
