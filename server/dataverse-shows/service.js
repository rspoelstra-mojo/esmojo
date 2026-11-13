import {tableByName} from '../dataverse-table-schema.js';
import {publicShowPhoto} from '../../shared/public-show-photo.js';
import {createRelatedShows} from './related.js';
import {digest,recordKey} from '../show-migration-writer.js';
import {mapShow} from '../show-migration-map.js';
import {showPlanning} from './planning.js';
export {showPlanning} from './planning.js';
import {barrierReferenceManifest} from '../../shared/barrier-reference-manifest.js';
import {createNativeShowState} from './state.js';
import {executeShowRules} from './rules.js';
import {documentReferences} from './files.js';
import {createNativeCatalogue} from './catalogue.js';
const operations=new Set(['show-open','profile-read','profile-save','final-read','final-complete','ticket-read','ticket-reserve','ticket-renew','ticket-release','ticket-review','ticket-reopen','risk-view','risk-status','risk-read','risk-save','risk-pdf','risk-production-save','risk-operational-save','barrier-read','barrier-draft','barrier-complete','barrier-reopen','barrier-upload','barrier-remove-upload','barrier-download','floor-read','floor-draft','floor-complete','floor-reopen','measure-read','measure-draft','measure-complete','measure-reopen','measure-edit-text','measure-upload','measure-remove','measure-download','report-status','report-reserve','report-commit','report-fail','report-download']);
const readOnly=operation=>['show-open','profile-read','final-read','ticket-read','barrier-read','measure-read','risk-view','risk-status','risk-read','risk-pdf','barrier-download','measure-download','report-status','report-download'].includes(operation);
const technical=operation=>['ticket-reserve','ticket-renew','ticket-release'].includes(operation);
export const nativeShowOperations=Object.freeze([...operations]);
export function createNativeShowsService({env=process.env,state=createNativeShowState({env}),catalogue,execute=executeShowRules,diagnostic=false}={}){
 const publicCatalogue=catalogue||createNativeCatalogue({env,state});
 const service=async(operation,payload={})=>{
  const trustedProfile=payload.__actor;payload={...payload};delete payload.__actor;
  if(publicCatalogue.handles(operation))return publicCatalogue.request(operation,payload);
  if(operation==='reference-read'){
   if(!Object.hasOwn(barrierReferenceManifest,payload.type||'')||typeof payload.actor!=='string')throw Error('VALIDATION');
   const file=await state.repo.downloadDocument(recordKey('esmojo_document','reference/'+payload.type),{referenceType:payload.type});return{type:payload.type,mime:'image/png',sha256:file.sha256,base64:file.bytes.toString('base64')};
  }
  if(operation==='risk-pending'){
   const rows=await publicCatalogue.primaryShows(),candidates=rows.filter(row=>!payload.after||row.key>payload.after).slice(0,3),pending=[];
   for(const show of candidates){const status=await service('risk-status',{concertId:show.key});if(status.state==='ready'&&!status.analysis?.exists)pending.push(status);}
   return{pending,scanned:candidates.length,classification:'vertrouwelijk',nextAfter:rows.some(row=>row.key>(candidates.at(-1)?.key||payload.after||''))?candidates.at(-1)?.key||null:null};
  }
  if(!operations.has(operation))throw Error('VALIDATION');
  if(operation==='show-open'&&state.loadOpening){
   const fast=await state.loadOpening(payload.concertId);
   if(fast)try{const output=execute(fast.source,operation,{...payload,concertId:fast.concert.esmojo_oudconcertid},new Map());if(!output.changed)return{...output.result,...photoFor(fast.source)};}catch(error){if(error.message!=='DOCUMENT_BYTES_REQUIRED')throw error;}
  }
  if(trustedProfile&&!readOnly(operation))await state.syncActor(trustedProfile);
  const loaded=await state.load(payload.concertId),command=digest(JSON.stringify({operation,payload,...(operation==='show-open'?{generation:loaded.source.nativeGeneration||0}:{})}));
  if(!readOnly(operation)&&!technical(operation)){const receipt=await state.receipt(loaded,command);if(receipt)return receipt;}
  const verified=await state.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);
  const binary=new Map();let output;
  for(let tries=0;tries<101;tries++){
   try{const clean={...payload,concertId:loaded.concert.esmojo_oudconcertid};delete clean.__actor;output=execute(loaded.source,operation,clean,binary);break;}
   catch(error){if(error.message!=='DOCUMENT_BYTES_REQUIRED'||binary.has(error.fileId))throw error;const file=loaded.source.files.find(file=>file.fileId===error.fileId);if(!file)throw Error('ATTACHMENT_INVALID');const downloaded=await state.repo.downloadDocument(file.key,{seriesId:loaded.seriesId});binary.set(file.fileId,downloaded.bytes);}
  }
  if(!output)throw Error('REPORT_UNAVAILABLE');
  if(!output.changed){if(operation==='show-open'&&!diagnostic&&state.cacheOpening)try{await state.cacheOpening(loaded,verified);}catch{/* A failed derived cache never replaces authoritative native reads. */}return operation==='show-open'?{...output.result,...photoFor(loaded.source)}:output.result;}
  if(diagnostic)throw Error('READ_REQUIRES_WRITE');
  if(operation==='show-open'&&trustedProfile)await state.syncActor(trustedProfile);
  const next={...loaded.source,documents:output.documents,files:[...loaded.source.files]},references=documentReferences(output.documents);
  for(const file of output.files){const ref=references.find(ref=>ref.fileId===file.fileId);if(!ref||ref.sha256!==file.sha256)throw Error('ATTACHMENT_INVALID');next.files.push({...file,...ref,identity:'drive-file/'+file.fileId,name:ref.fileName||file.name,size:file.size,mime:file.mime,bytes:file.bytes,version:ref.version||1});}
  if(technical(operation))return state.commitLease(loaded,next,output.result);
  const planning=showPlanning(next),result={...output.result,homePlanning:planning};next.planning=planning;
  return state.commit(loaded,next,result,command);
 };
 service.prepareRead=()=>Promise.all([...tableByName.keys()].map(table=>state.repo.meta(table))).then(()=>undefined);
 service.related=createRelatedShows({state,catalogue:publicCatalogue});
 service.provider='dataverse';service.activeStorage={alerts:async()=>[],verify:async()=>({enabled:false,provider:'dataverse',archiveDisabled:true}),run:async()=>({enabled:false,mirrored:0,archived:0,failed:0})};return service;
}

function photoFor(source){const imageUrl=source.photo?.imageUrl,sourceUrl=source.shows.find(row=>row.concertId===source.concertId)?.sourceUrl||source.shows[0]?.sourceUrl;const photo=publicShowPhoto({imageUrl,sourceUrl});return photo?{photo}:{};}
