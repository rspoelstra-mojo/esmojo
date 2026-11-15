import {digest} from '../show-migration-writer.js';
import {groupReportEntries} from '../reports-migration/writer.js';
import {reportChoice} from '../reports-migration/contract.js';
const text=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function createNativeReportIngest({intake,processing,dependencies,publication,repository:repo,operational,authorize,now=Date.now}){
 const auth=actor=>()=>authorize(actor,{worker:actor===null});
 async function inventory(){const list=await intake.list();return[...list.files,...list.historical];}
 async function candidates(){
  const [files,stored]=await Promise.all([inventory(),repo.query('esmojo_rapportbron')]),sources=[],processingRows=await processing.readMany(files.map(file=>file.id));
  for(const file of files){
   const previous=processingRows.get(file.id);let saved=null;
   const matches=stored.filter(row=>row.esmojo_externebronid===file.id).sort((a,b)=>b.esmojo_brongewijzigdop.localeCompare(a.esmojo_brongewijzigdop));
   for(const row of matches){let value;try{value=JSON.parse(row.esmojo_herkomst_json);}catch{throw Error('REPORT_CONFLICT');}if(value.source?.name===file.name&&value.source.modifiedAt===file.modifiedAt&&value.source.size===file.size){saved=value;break;}}
   const source=previous.value||{id:file.id,name:file.name,receivedAt:file.receivedAt||file.modifiedAt,modifiedAt:file.modifiedAt,linkRevision:0,status:'unlinked'};
   if(saved&&source.showKey&&saved.source.show.key!==source.showKey)saved=null;
   const own=source.web?.bundle?.sources?.[0];if(own&&own.source.name===file.name&&own.source.modifiedAt===file.modifiedAt&&own.source.size===file.size&&(!source.showKey||source.showKey===own.source.show.key))saved={source:own.source,validation:own.validation,previousValidation:own.previousValidation};
   let show;try{show=saved?.source.show||await dependencies.resolve(file,source);}catch(error){if(error.message!=='REPORT_CATALOG')throw error;sources.push({file,previous,source,show:null,context:null,state:'unlinked'});continue;}
   const metadata={id:file.id,name:file.name,modifiedAt:file.modifiedAt,mime:file.mime,size:file.size,show,validationVersion:'csv-web-v2'},context=own&&saved?.source===own.source?source.web.context:saved?.source.context||digest(metadata),web=source.web?.context===context?source.web:null;
   sources.push({file,previous,source,show,metadata:{...metadata,context},context,state:web?.state||saved?.validation?.state||'pending',mojo:web?.bundle?.sources[0]?.validation?.mojo||saved?.validation?.mojo||null,web});
  }return sources;
 }
 async function scan(actor,{historicalOnly=false}={}){
  await authorize(actor,{worker:actor===null});const all=await candidates();return{jobs:all.filter(row=>row.show&&(!historicalOnly||row.show.origin==='historical')&&(row.state==='pending'||row.state==='preparing'||actor===null&&row.state==='valid'&&!row.mojo?.checked)).slice(0,5).map(row=>({sourceId:row.file.id,context:row.context})),unlinked:all.filter(row=>!row.show).length};
 }
 async function selected(actor,input){await authorize(actor,{worker:actor===null});if(typeof input?.sourceId!=='string'||!/^[-\w]{1,200}$/.test(input.sourceId)||!text(input.context))throw Error('VALIDATION');const found=(await candidates()).find(row=>row.file.id===input.sourceId&&row.context===input.context);if(!found?.show)throw Error('SOURCE_CHANGED');return found;}
 async function source(actor,input){
  const found=await selected(actor,input);if(found.file.size<1||found.file.size>2*1024*1024)return{state:'invalid',errorCode:found.file.size>2*1024*1024?'CSV_TOO_LARGE':'CSV_EMPTY'};
  const read=await intake.read(found.file);return{show:found.show,context:found.context,sourceHash:read.sha256,csvBase64:read.bytes.toString('base64'),modifiedAt:found.file.modifiedAt};
 }
 async function commit(actor,input){
  if(!['valid','invalid'].includes(input?.state)||input.state==='valid'&&!text(input.sourceHash)||input.errorCode!==null&&typeof input.errorCode!=='string')throw Error('VALIDATION');
  return operational.exclusive(auth(actor),async(state,{markWrite})=>{
   const found=await selected(actor,input),read=input.state==='valid'?await intake.read(found.file):null;
   if(read&&read.sha256!==input.sourceHash)throw Error('SOURCE_CHANGED');let value={...found.source};
   if(input.state==='invalid'){value.web={context:found.context,state:'invalid',errorCode:input.errorCode};await markWrite();await processing.write(found.previous.row,value);return{ok:true};}
   let job=found.web?.bundle?found.web:null;
   if(!job){
    const context=await dependencies.context(found.show),item={source:{...found.metadata,context:digest({metadata:found.metadata,mojo:input.mojo})},sha256:read.sha256,validation:{state:'valid',sourceHash:read.sha256,context:digest({metadata:found.metadata,mojo:input.mojo}),validatedAt:new Date(now()).toISOString(),errorCode:null,mojo:input.mojo},previousValidation:null},bundle={version:1,show:found.show,sources:[item],groups:[],files:[{fileId:found.file.id,name:found.file.name,mime:found.file.mime,size:found.file.size,modifiedAt:found.file.modifiedAt,sha256:read.sha256,kind:'csv'}],...context},entry=groupReportEntries([{...dependencies.entry(found.show),sources:[{id:found.file.id,name:found.file.name,modifiedAt:found.file.modifiedAt,size:found.file.size}]}])[0];
    job={context:found.context,state:'preparing',bundle,entry,cursor:null};value.web=job;await markWrite();found.previous.row=await processing.write(found.previous.row,value);
   }
   const deadline=now()+100000;
   for(let n=0;n<30&&now()<deadline;n++){
    await authorize(actor,{worker:actor===null});await markWrite();job.cursor=await publication.advance({entry:job.entry,bundle:job.bundle,bytes:read.bytes,cursor:job.cursor});
    if(job.cursor.phase==='complete')job.state='valid';value.web=job;found.previous.row=await processing.write(found.previous.row,value);if(job.state==='valid')break;
   }
   return{ok:true,state:job.state==='valid'?'ready':'processing'};
  });
 }
 async function historicalStatus(){await authorize(null,{worker:true});const all=(await candidates()).filter(row=>row.show?.origin==='historical');return{registered:all.length,validated:all.filter(row=>row.state==='valid').length,invalid:all.filter(row=>row.state==='invalid').length,available:all.filter(row=>row.state==='valid').map(row=>row.show.key)};}
 return{scan,source,commit,historicalStatus,candidates};
}
