import {documentRows,sourceRows,mapDataset,filePlan,headerRef,datasetRef} from '../reports-migration/map.js';
import {reportChoice,parserContract,calculationContract} from '../reports-migration/contract.js';
import {migrateFileStep} from '../show-migration-files.js';
import {digest,canonical} from '../show-migration-writer.js';
// Bounded, resumable create-only dataset preparation, followed by one CAS of the
// available version. The caller persists this cursor under its fenced lease.
// CSV bytes are never part of the cursor. A changed source is a conflict.
export function createNativeReportPublication({writer,repository:repo,mutations,now=Date.now}){
 async function expectedPlan(bundle,item,bytes,versionNumber){
  const plan=mapDataset(bundle,item,bytes),version=plan.records[0],actual=await repo.byKey('esmojo_rapportversie',plan.version.key);
  if(actual){
   if(actual.esmojo_versiefingerprint!==version.fields.esmojo_versiefingerprint||actual.esmojo_inhoudsha256!==item.sha256||actual.esmojo_contexthash!==version.fields.esmojo_contexthash||actual.esmojo_parsercontract!==parserContract||actual.esmojo_rekencontract!==calculationContract||!Number.isSafeInteger(actual.esmojo_versienummer)||!actual._esmojo_gekozenbron_value)throw Error('REPORT_CONFLICT');
   const anchor=await repo.byId('esmojo_rapportbron',actual._esmojo_gekozenbron_value);
   version.fields.esmojo_versienummer=actual.esmojo_versienummer;version.fields.esmojo_gegenereerdop=actual.esmojo_gegenereerdop;
   version.links.esmojo_gekozenbron={table:'esmojo_rapportbron',key:anchor.esmojo_sleutel};
  }else version.fields.esmojo_versienummer=versionNumber;
  plan.existingVerified=actual?.esmojo_versiestatus===reportChoice('bronstatus','verified');return plan;
 }
 async function advance({entry,bundle,item=bundle?.sources?.[0],bytes,cursor=null}){
  if(!entry?.show||!bundle||bundle.show.key!==entry.show.key||bundle.sources.length!==1||item!==bundle.sources[0]||!Buffer.isBuffer(bytes)||digest(bytes)!==item.sha256||bundle.files.length!==1)throw Error('VALIDATION');
  const proof=digest({entry,bundle}),header=await repo.byKey('esmojo_rapportage',headerRef(bundle.show).key);
  let state=cursor?structuredClone(cursor):null;
  if(!state){
   if(!header)await writer.core(entry);
   const current=header||await repo.byKey('esmojo_rapportage',headerRef(bundle.show).key),versions=await repo.children('esmojo_rapportversie','esmojo_rapportage',await repo.idOf('esmojo_rapportage',current));
   const previous=Math.max(0,...versions.map(row=>row.esmojo_versienummer));if(!Number.isSafeInteger(previous)||previous<0)throw Error('REPORT_CONFLICT');
   state={version:1,proof,phase:'base',row:0,fileState:null,number:previous+1,expected:{key:current.esmojo_sleutel,etag:current['@odata.etag'],generation:current.esmojo_publicatiegeneratie,current:current._esmojo_actueleversie_value||null}};
  }
  if(state.version!==1||state.proof!==proof||!['base','dataset','file','verified','publish','complete'].includes(state.phase)||!Number.isSafeInteger(state.row)||state.row<0||!Number.isSafeInteger(state.number)||state.number<1)throw Error('REPORT_CONFLICT');
  if(state.phase==='complete')return state;
  const plan=state.phase==='base'?null:await expectedPlan(bundle,item,bytes,state.number);
  if(state.phase==='base'||state.phase==='dataset'){
   const records=state.phase==='base'?[...documentRows(bundle),...sourceRows(bundle)]:plan.records;
   if(state.row<records.length){const batch=[],first=records[state.row];for(const row of records.slice(state.row,state.row+32)){if(row.table!==first.table||Buffer.byteLength(canonical([...batch,row]))>1800000)break;batch.push(row);}if(!batch.length)throw Error('REPORT_CONFLICT');if(plan?.existingVerified){const inspected=await writer.inspectMany(batch);if(inspected.missing)throw Error('REPORT_CONFLICT');}else await writer.ensureMany(batch);state.row+=batch.length;}
   if(state.row===records.length){state.row=0;state.phase=state.phase==='base'?'dataset':'file';}return state;
  }
  if(state.phase==='file'){
   const file=filePlan(bundle)[0],doc=await repo.byKey('esmojo_document',documentRows(bundle)[0].key);if(doc?.esmojo_documentstatus===reportChoice('bronstatus','verified')&&!doc.esmojo_bestand)throw Error('REPORT_CONFLICT');state.fileState=await migrateFileStep({file,state:state.fileState,writer,now,read:async offset=>({size:bytes.length,sha256:item.sha256,offset,base64:bytes.subarray(offset,Math.min(offset+1048576,bytes.length)).toString('base64')})});
   if(state.fileState?.done){await writer.markFileVerified(file);state.fileState=null;state.phase='verified';}return state;
  }
  if(state.phase==='verified'){
   const version=await repo.byKey('esmojo_rapportversie',plan.version.key);if(!version)throw Error('REPORT_CONFLICT');
   // Verify complete child identity sets; extra native rows are conflicts too.
   const id=await repo.idOf('esmojo_rapportversie',version),context=await writer.resolve(plan.records.find(row=>row.table==='esmojo_rapportcontext'));
   for(const table of ['esmojo_rapportincident','esmojo_rapportcontext','esmojo_rapporttekstblok','esmojo_rapporttijdpunt']){
    const actual=await repo.children(table,table==='esmojo_rapporttijdpunt'?'esmojo_rapportcontext':'esmojo_rapportversie',table==='esmojo_rapporttijdpunt'?context.id:id),expected=plan.records.filter(row=>row.table===table).map(row=>row.key).sort();if(canonical(actual.map(row=>row.esmojo_sleutel).sort())!==canonical(expected))throw Error('REPORT_CONFLICT');
   }
   await writer.markVerified(plan.version,'esmojo_versiestatus');state.phase='publish';return state;
  }
  if(state.phase==='publish'){
   const target=await repo.byKey('esmojo_rapportversie',datasetRef(bundle,item).key),current=await repo.byKey('esmojo_rapportage',state.expected.key),id=await repo.idOf('esmojo_rapportversie',target);
   if(target.esmojo_versiestatus!==reportChoice('bronstatus','verified')||target._esmojo_rapportage_value!==await repo.idOf('esmojo_rapportage',current))throw Error('REPORT_CONFLICT');
   if(current._esmojo_actueleversie_value===id&&current.esmojo_beschikbaar===true){state.phase='complete';return state;}
   if(current._esmojo_actueleversie_value){const previous=await repo.byId('esmojo_rapportversie',current._esmojo_actueleversie_value),anchor=await repo.byId('esmojo_rapportbron',previous._esmojo_gekozenbron_value);let provenance;try{provenance=JSON.parse(anchor.esmojo_herkomst_json);}catch{throw Error('REPORT_CONFLICT');}const date=provenance.source?.modifiedAt,id=provenance.source?.id;if(typeof date!=='string'||typeof id!=='string')throw Error('REPORT_CONFLICT');if(item.source.modifiedAt<date||item.source.modifiedAt===date&&item.source.id.localeCompare(id)>0){state.phase='complete';return state;}}
   if(current['@odata.etag']!==state.expected.etag||current.esmojo_publicatiegeneratie!==state.expected.generation||(current._esmojo_actueleversie_value||null)!==state.expected.current)throw Error('REPORT_CONFLICT');
   await mutations.atomic([{table:'esmojo_rapportage',key:current.esmojo_sleutel,etag:current['@odata.etag'],fields:{esmojo_beschikbaar:true,esmojo_publicatiegeneratie:state.expected.generation+1},links:{esmojo_actueleversie:plan.version}}]);state.phase='complete';return state;
  }
  throw Error('REPORT_CONFLICT');
 }
 return{advance};
}
