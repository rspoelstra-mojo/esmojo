import {createOnTrackReportStore} from '../ontrack-report/service.js';
import {createNativeShowState} from '../dataverse-shows/state.js';
import {assertNativeAuthority,nativeShowsSelected} from '../dataverse-shows/authority.js';
import {createManagedShowsRouting,managedShowsRouting} from '../dataverse-shows/routing.js';
import {mapShow} from '../show-migration-map.js';
import {digest} from '../show-migration-writer.js';
// The bridge only exports fixed report sources; no arbitrary URL/Drive-ID route.
export function createReportsMigrationSource({env=process.env,store=createOnTrackReportStore({env}),nativeState=createNativeShowState({env})}={}){
 const route=createManagedShowsRouting({env,repository:nativeState.repo});
 const scoped=entry=>({show:entry.show,sources:entry.sources});
 async function readNativeGeneral(entry){
  if(!nativeShowsSelected(env)&&!managedShowsRouting(env))return null;
  let loaded;try{loaded=await nativeState.load(entry.show.key);}catch(error){if(error.message==='NOT_FOUND')return null;throw error;}await nativeState.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);const fields=JSON.parse(loaded.source.documents['bezoekersdata.json']?.workflow_json||'{"visitors":{"fields":{}}}').visitors.fields;
  const assigned=loaded.people.assignments.filter(row=>row.concertId===entry.show.key&&row.role==='event-safety-manager');if(assigned.length>1)throw Error('MIGRATION_CONFLICT');const person=loaded.people.profiles.find(row=>row.id===assigned[0]?.userId);
  return{contacts:{productionManager:null,eventSafetyManager:person?[person.firstName,person.lastName].filter(Boolean).join(' '):null,tscProjectLead:null},tickets:{sales:fields.ticket_sales?.completed_at?fields.ticket_sales.content:null,origins:fields.visitor_origins?.completed_at?fields.visitor_origins.content:null,shows:loaded.source.shows.map(s=>({date:s.date,time:s.time||'Niet vermeld'}))}};
 }
 async function nativeGeneral(entry){if(nativeShowsSelected(env)){await assertNativeAuthority({env,repository:nativeState.repo});return readNativeGeneral(entry);}if(!managedShowsRouting(env))return null;return route({legacy:async()=>null,native:()=>readNativeGeneral(entry)});}
 return{
  probe:actor=>store('reports-migration-probe',actor),
  async catalogue(actor){const value=await store('reports-migration-catalogue',actor);if(value?.version!==1||!Array.isArray(value.entries)||value.entries.length>10000||!/^[a-f0-9]{64}$/.test(value.fingerprint)||!Number.isSafeInteger(value.unlinked)||value.unlinked<0)throw Error('MIGRATION_SOURCE');if(value.unlinked)throw Error('REPORTS_UNLINKED');return value;},
  async bundle(entry,actor){const value=await store('reports-migration-bundle',actor,{entry:scoped(entry)});if(value?.version!==1||value.show?.key!==entry.show.key||!Array.isArray(value.sources)||!Array.isArray(value.groups)||!Array.isArray(value.files))throw Error('MIGRATION_SOURCE');const general=await nativeGeneral(entry);if(general)value.general=general;return value;},
  async csv(entry,sourceId,actor,expected){const value=await store('reports-migration-csv',actor,{entry:scoped(entry),sourceId});if(value?.version!==1||value.sourceId!==sourceId||typeof value.csvBase64!=='string'||value.csvBase64.length>2800000)throw Error('MIGRATION_SOURCE');const bytes=Buffer.from(value.csvBase64,'base64');if(digest(bytes)!==value.sha256||value.sha256!==expected)throw Error('MIGRATION_SOURCE_CHANGED');return bytes;},
  readFile(entry,file,offset,actor){return store('reports-migration-file',actor,{entry:scoped(entry),fileId:file.fileId,offset});},
 };
}
