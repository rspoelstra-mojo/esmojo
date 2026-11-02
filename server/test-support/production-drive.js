import {readFileSync} from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
import vm from 'node:vm';
import {createShowsStore} from '../shows-store.js';
const bytes=Buffer.from('%PDF-1.7\nlocal fixture'),reference={revision:'a'.repeat(64),sha256:createHash('sha256').update(bytes).digest('hex')},result={analysedAt:'2026-11-02T12:00:00Z'};
const secret='only-local-production-test-'.repeat(4),env={GOOGLE_DRIVE_SCRIPT_URL:'https://script.google.com/macros/s/test/exec',GOOGLE_DRIVE_SHARED_SECRET:secret};
const iterator=items=>{let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};};
export function harness(){
  let next=0,writes=0,blocked=false,lastEnvelope;
  const all=new Map(),nonces=new Map();
  class File{
    constructor(folder,name,content,type='application/json'){this.folder=folder;this.name=name;this.content=content;this.type=type;this.id='file'+(++next);all.set(this.id,this);}
    getId(){return this.id;}getName(){return this.name;}getMimeType(){return this.type;}isTrashed(){return this.trashed===true;}setTrashed(value){this.trashed=value;}getDescription(){return this.description;}setDescription(v){this.description=v;}getParents(){return iterator([this.folder]);}
    getBlob(){return{getBytes:()=>[...Buffer.from(this.content)],getDataAsString:()=>this.content.toString()};}
    setContent(content){if(this.name!=='productionele-risicos.json')throw Error('Geen overschrijven toegestaan');this.content=content;writes++;}
    moveTo(folder){this.folder.files=this.folder.files.filter(f=>f!==this);folder.files.push(this);this.folder=folder;}
  }
  class Folder{
    constructor(name,parent,id='folder'+(++next)){this.name=name;this.parent=parent;this.id=id;this.files=[];this.folders=[];all.set(id,this);if(parent)parent.folders.push(this);}
    getId(){return this.id;}getName(){return this.name;}isTrashed(){return false;}getParents(){return iterator(this.parent?[this.parent]:[]);}
    getFoldersByName(name){return iterator(this.folders.filter(f=>f.name===name));}
    getFilesByName(name){return iterator(this.files.filter(f=>f.name===name&&!f.isTrashed()));}
    createFile(blob){writes++;const f=new File(this,blob.name,blob.content,blob.type);this.files.push(f);return f;}
  }
  const root=new Folder('ESMOJO',null,'1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk'),production=new Folder('Productie',root),artist=new Folder('Test',production);
  const folder=new Folder('Test_Gashouder_06112026',artist),concertId=folder.name,laterId='Test_Gashouder_07112026';
  const row={concertId,artist:'Test',venue:'Gashouder',city:'Amsterdam',date:'2026-11-06',folderId:folder.id,generalConcertId:concertId,generalFolderId:folder.id};
  const index={managedBy:'ESMOJO/MOJO-v1',version:1,concerts:[row,{...row,concertId:laterId,date:'2026-11-07'}]};
  const add=(folder,name,content,type)=>{const f=new File(folder,name,typeof content==='object'&&!Buffer.isBuffer(content)?JSON.stringify(content):content,type);folder.files.push(f);return f;};
  const indexFile=add(production,'_esmojo_shows_v1.json',index);
  const pdf=add(folder,'report.pdf',bytes,'application/pdf');
  const register={managedBy:'ESMOJO/ShowProfilePdf-v1',classification:'vertrouwelijk',concertId,nextVersion:2,reports:{[reference.revision]:{fileId:pdf.id,fileName:'report.pdf',version:1,sha256:reference.sha256,layoutVersion:'gashouder-showprofile-v6-confidential-footer',sourceCommit:'eb2fa1a532267d7963f3d2358308c04b3bf8cfe6',sourceUpdatedAt:result.analysedAt}}};
  const registerFile=add(folder,'showprofiel-pdf.json',register);
  const ctx=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},
    Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,b)=>[...createHash(a).update(typeof b==='string'?b:Buffer.from(b)).digest()],computeHmacSha256Signature:(b,k)=>[...createHmac('sha256',k).update(b).digest()],base64Encode:b=>Buffer.from(b).toString('base64'),base64Decode:b=>[...Buffer.from(b,'base64')],newBlob:(content,type,name)=>({content:Array.isArray(content)?Buffer.from(content):content,type,name})},
    LockService:{getUserLock:()=>({tryLock:()=>!blocked,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>nonces.get(k),put:(k,v)=>nonces.set(k,v)})},
    DriveApp:{getFolderById:id=>all.get(id),getFileById:id=>all.get(id)},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})}});
  for(const name of ['Code.gs','Shows.gs','Research.gs','ShowProfile.gs','TicketData.gs','TicketValidators.gs','FinalValidators.gs','AnalysisFinal.gs','ShowProfilePdf.gs','RiskValidators.gs','ProductionRiskValidators.gs','ProductionRisks.gs','BarrierValidators.gs','FloorPressureValidators.gs','BarrierLayout.gs','FloorPressure.gs','ShowProfileRisks.gs'])vm.runInContext(readFileSync(new URL('../../google-apps-script/'+name,import.meta.url),'utf8'),ctx);
  // De PDF-generator en accountflow hebben hun eigen bestaande integratietests.
  // Varieer hier de actuele revisie om races tussen lezen en bewaren te testen.
  const realSnapshot=ctx.esmojoPdfSnapshot_;
  ctx.esmojoPdfSnapshot_=()=>({revision:reference.revision});
  const raw=envelope=>ctx.doPost({postData:{contents:JSON.stringify(envelope)}});
  const shows=createShowsStore({env,request:async(_,options)=>{lastEnvelope=JSON.parse(options.body);return Response.json(raw(lastEnvelope));}});
  return{ctx,folder,production,artist,pdf,registerFile,index,indexFile,realSnapshot,add,concertId,laterId,raw,shows,writes:()=>writes,envelope:()=>lastEnvelope,block:()=>{blocked=true;}};
}
