import {readFileSync} from 'node:fs';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import vm from 'node:vm';
// Alleen vertrouwde, meegebouwde bestaande businessregels. Geen gebruikerscode,
// geen Apps Script-call en geen netwerk/Google Drive-object in deze context.
const files=['Code.gs','Shows.gs','Research.gs','ShowProfile.gs','TicketData.gs','TicketValidators.gs','FinalValidators.gs','AnalysisFinal.gs','ShowProfilePdf.gs','RiskValidators.gs','ProductionRiskValidators.gs','ProductionRisks.gs','MeasureValidators.gs','MeasureImplementations.gs','BarrierValidators.gs','FloorPressureValidators.gs','BarrierLayout.gs','FloorPressure.gs','OperationalRiskValidators.gs','OperationalRisks.gs','ShowProfileRisks.gs','ShowOpen.gs'];
let sources;
const iterator=values=>{let index=0;return{hasNext:()=>index<values.length,next:()=>values[index++]};};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function executeShowRules(source,operation,payload={},binary=new Map()){
 const original=JSON.stringify(source.documents||{}),documents=structuredClone(source.documents||{}),objects=new Map(),created=[],removed=new Set();
 class File{
  constructor(id,name,type,content,folder){Object.assign(this,{id,name,type,content,folder});objects.set(id,this);}
  getId(){return this.id;}getName(){return this.name;}getMimeType(){return this.type;}getSize(){return typeof this.content==='string'?Buffer.byteLength(this.content):this.content.length;}
  isTrashed(){return removed.has(this.id);}setTrashed(value){if(value)removed.add(this.id);else removed.delete(this.id);return this;}
  getParents(){return iterator([this.folder]);}getDescription(){return this.description||'';}setDescription(value){this.description=value;return this;}
  getBlob(){const content=this.content;if(content===undefined)throw Object.assign(Error('DOCUMENT_BYTES_REQUIRED'),{fileId:this.id});return blob(content,this.type,this.name);}
  setContent(value){if(this.type!=='application/json')throw Error('VALIDATION');this.content=value;documents[this.name]=JSON.parse(value);return this;}
 }
 const blob=(content,type,name)=>({content,type,name,getBytes:()=>[...Buffer.from(content)],getDataAsString:()=>Buffer.from(content).toString('utf8'),getContentType:()=>type,getName:()=>name});
 class Folder{
  constructor(id){this.id=id;this.files=[];objects.set(id,this);}getId(){return this.id;}isTrashed(){return false;}getName(){return source.concertId;}getParents(){return iterator([]);}
  getFiles(){return iterator(this.files.filter(file=>!file.isTrashed()));}getFilesByName(name){return iterator(this.files.filter(file=>file.name===name&&!file.isTrashed()));}
  createFile(value){const id='native-'+randomUUID(),content=Array.isArray(value.content)?Buffer.from(value.content):value.content,file=new File(id,value.name,value.type,content,this);this.files.push(file);if(value.type==='application/json')documents[value.name]=JSON.parse(Buffer.from(content).toString('utf8'));else created.push(file);return file;}
 }
 const folder=new Folder('native-series/'+source.concertId);
 for(const [name,value]of Object.entries(documents)){const file=new File('json/'+name,name,'application/json',JSON.stringify(value),folder);folder.files.push(file);}
 for(const value of source.files||[]){const physical=value.kind==='barrier-attachment'?'Barrieropstelling_'+value.uploadId+(value.mime==='image/png'?'.png':'.pdf'):value.kind==='measure-attachment'?'Maatregel_'+value.uploadId+({ 'image/png':'.png','image/jpeg':'.jpg','application/pdf':'.pdf'}[value.mime]||''):value.name;const file=new File(value.fileId,physical,value.mime,binary.get(value.fileId),folder);file.description=value.kind==='barrier-attachment'?'ESMOJO/BarrierAttachment-v1':value.kind==='measure-attachment'?'ESMOJO/MeasureAttachment-v1':'';file.getSize=()=>value.size;folder.files.push(file);}
 const shows=source.shows,primary=shows.find(show=>show.concertId===source.concertId)||shows[0],selected=shows.find(show=>show.concertId===payload.concertId)||primary;
 const target={folder,primary,selected,seriesShows:shows};
 if(!shows.some(show=>show.concertId===(payload.concertId||source.concertId)))throw Error('NOT_FOUND');
 const context=vm.createContext({Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(algorithm,value)=>[...createHash(algorithm).update(typeof value==='string'?value:Buffer.from(value)).digest()],computeHmacSha256Signature:(value,key)=>[...createHmac('sha256',key).update(value).digest()],base64Encode:value=>Buffer.from(value).toString('base64'),base64Decode:value=>[...Buffer.from(value,'base64')],newBlob:blob,getUuid:randomUUID},DriveApp:{getFileById:id=>{const file=objects.get(id);if(!(file instanceof File))throw Error('NOT_FOUND');return file;},getFolderById:id=>{if(id===folder.id)return folder;throw Error('FORBIDDEN');}},PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},LockService:{getUserLock:()=>({tryLock:()=>true,releaseLock(){}})}});
 sources??=files.map(name=>readFileSync(new URL('../../google-apps-script/'+name,import.meta.url),'utf8'));
 for(let index=0;index<sources.length;index++)vm.runInContext(sources[index],context,{filename:files[index],timeout:1000});
 // Account, MFA and module authorization already happened at the Node API gate.
 context.esmojoHomeActor_=actor=>{if(typeof actor!=='string'||!actor||actor.length>100)throw Error('VALIDATION');};
 context.esmojoResearchTarget_=id=>{if(!shows.some(show=>show.concertId===id))throw Error('NOT_FOUND');return{...target,selected:shows.find(show=>show.concertId===id)};};
 const request={...payload,operation};
 const handlers={'show-open':'esmojoOpenShow_','profile-read':'esmojoShowProfile_','profile-save':'esmojoShowProfile_','final-read':'esmojoAnalysisFinal_','final-complete':'esmojoAnalysisFinal_'};
 const name=handlers[operation]||(operation.startsWith('ticket-')?'esmojoTicketData_':operation.startsWith('barrier-')?'esmojoBarrierLayout_':operation.startsWith('floor-')?'esmojoFloorPressure_':operation.startsWith('measure-')?'esmojoMeasureImplementation_':operation.startsWith('risk-')?'esmojoShowProfileRisks_':operation.startsWith('report-')?'esmojoShowProfilePdf_':null);
 if(!name)throw Error('VALIDATION');
 context.__request=request;context.__target=target;
 const result=vm.runInContext(`${name}(__request,__target)`,context,{timeout:3000});
 const resultDocuments={};for(const file of folder.files.filter(file=>file.type==='application/json'&&!file.isTrashed()))resultDocuments[file.name]=JSON.parse(Buffer.from(file.content).toString('utf8'));
 const changed=original!==JSON.stringify(resultDocuments)||created.length>0||removed.size>0;
 const newFiles=created.filter(file=>!file.isTrashed()).map(file=>({fileId:file.id,name:file.name,mime:file.type,size:Buffer.byteLength(file.content),sha256:hash(Buffer.from(file.content)),bytes:Buffer.from(file.content)}));
 return{result:structuredClone(result),documents:resultDocuments,files:newFiles,removed:[...removed],changed};
}
