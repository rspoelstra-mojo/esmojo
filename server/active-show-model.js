import {productionComplete,operationalComplete,showMeasures} from '../src/lib/show-planning.js';
import {createHash} from 'node:crypto';
import {categoryReady,validateFinalRequest} from '../shared/analysis-finalization.js';
import {validateShowProfile} from './show-profile.js';
import {validateProductionRiskSelection} from '../shared/production-risks.js';
import {validateOperationalReview} from '../shared/operational-risk.js';
import {emptyBarrier,barrierData,barrierSignature,validateBarrierData} from '../shared/barrier-layout.js';
import {validateMeasureRequest,measureDefinitions,measureState} from '../shared/measure-workflow.js';
import {preparationBasis,validateActiveSnapshot} from '../shared/active-show-storage.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fields=['ticket_sales','visitor_origins','domestic_origins'];
export function activeFinalization(s){
 const categories={};for(const key of ['visitors','artist']){const ready=categoryReady(key,s.profile.analyses,s.ticketBasis.ready);categories[key]={ready,completedAt:ready?s.final.categories[key]?.completedAt||null:null};}
 return{categories,ticketsReady:s.ticketBasis.ready,basis:{profileRevision:s.profile.revision,finalRevision:s.final.revision,ticketVersions:Object.fromEntries(fields.map((name,i)=>[name,s.ticketBasis.versions[i]]))}};
}
export function activeRiskView(s){
 const d=s.production,b=d.barrier||emptyBarrier(),production={revision:d.revision,choices:d.choices};
 const assessments={barrier:{revision:b.revision,completed:b.completed,riskLevel:b.riskLevel,riskNote:b.riskNote??null,active:b.completed&&b.riskLevel!=='none'},floor:s.floor};
 const valid=s.riskBasis===preparationBasis(s),base=valid?s.risk:{state:'not-ready',risks:[]};
 const result={state:base.state,risks:base.risks,production,assessments};
 if(base.state==='ready'&&base.source){const saved=d.operationalReviews?.[base.source.revision];result.operational={source:base.source,assessments:saved?.assessments||{}};}
 const implementations={};for(const row of measureDefinitions({venue:s.venue},result).rows){const record=d.measureImplementations?.[row.id];if(record)implementations[row.id]=measureState(row,{...record,attachments:(record.attachments||[]).map(id=>{const entry=d.measureUploads?.[id];if(!entry)throw Error('ATTACHMENT_INVALID');const {uploadId,fileName,mime,size,sha256}=entry;return{uploadId,fileName,mime,size,sha256};})});}
 return{...result,measureImplementations:implementations};
}
export function activeCompletion(s){
 const risks=activeRiskView(s),snapshot={risks},categories=activeFinalization(s).categories;
 return{profile:Boolean(categories.visitors.completedAt&&categories.artist.completedAt&&risks.state!=='not-ready'),production:productionComplete({venue:s.venue},snapshot),operational:operationalComplete(snapshot),measures:showMeasures({venue:s.venue},snapshot).complete};
}
export function activeProfile(s){return{revision:s.profile.revision,analyses:s.profile.analyses,finalization:activeFinalization(s)};}
function measureView(s,id){const row=measureDefinitions({venue:s.venue},activeRiskView(s)).rows.find(r=>r.id===id);if(!row)throw Error('SOURCE_CHANGED');const record=s.production.measureImplementations?.[id];return{record:record?activeRiskView(s).measureImplementations[id]:measureState(row,null),overview:activeRiskView(s)};}
export function reduceActiveShow(original,operation,payload,now=new Date().toISOString()){
 const s=structuredClone(validateActiveSnapshot(original)),d=s.production,actor=payload.actor;let result;
 if(/^(barrier-|measure-|risk-(operational|production)-save)/.test(operation)&&(typeof actor!=='string'||!actor||actor.length>100))throw Error('VALIDATION');
 const history=(field,action,before,after,extras={})=>d.history.push({at:now,actor,field,action,before:before||null,after:after||null,...extras});
 if(operation==='profile-read'||operation==='final-read')return{snapshot:s,result:activeProfile(s)};
 if(operation==='risk-view')return{snapshot:s,result:activeRiskView(s)};
 if(operation==='barrier-read')return{snapshot:s,result:{record:d.barrier||emptyBarrier(),overview:activeRiskView(s)}};
 if(operation==='measure-read')return{snapshot:s,result:measureView(s,payload.measureId)};
 if(operation==='profile-save'){
  const input=validateShowProfile({operation:'save',...payload}).payload;
  const previous=s.profile.analyses[input.questionNumber];
  if(input.revision!==s.profile.revision){if(s.profile.revision===input.revision+1&&previous?.status===input.status&&previous.summary===input.summary)return{snapshot:s,result:activeProfile(s)};throw Error('PROFILE_CONFLICT');}
  const category=input.questionNumber<=4?'visitors':'artist',final=s.final.categories[category];
  if(final){s.final.history.push({...final,category,invalidatedAt:now});delete s.final.categories[category];s.final.revision++;}
  s.profile.analyses[input.questionNumber]={summary:input.summary,status:input.status,updatedAt:now};s.profile.revision++;result=activeProfile(s);
 }else if(operation==='final-complete'){
  const input=validateFinalRequest({operation:'complete',...payload}),current=activeFinalization(s);
  if(!current.categories[input.category].ready)throw Error('FINAL_NOT_READY');
  if(current.categories[input.category].completedAt||input.basis.profileRevision!==current.basis.profileRevision||input.basis.finalRevision!==current.basis.finalRevision||input.category==='visitors'&&!same(input.basis.ticketVersions,current.basis.ticketVersions))throw Error('FINAL_CONFLICT');
  s.final.categories[input.category]={score:input.score,note:input.note.trim(),completedAt:now};s.final.revision++;result=activeProfile(s);
 }else if(operation==='risk-production-save'){
  const {actor,...input}=payload;validateProductionRiskSelection(input);
  if(input.revision!==d.revision){if(d.revision===input.revision+1&&d.choices[input.field]===input.value)return{snapshot:s,result:{revision:d.revision,choices:d.choices}};throw Error('CONFLICT');}
  if(d.choices[input.field]!==input.value){d.history.push({at:now,actor,field:input.field,before:d.choices[input.field]??null,after:input.value});d.choices[input.field]=input.value;d.revision++;}
  result={revision:d.revision,choices:d.choices};
 }else if(operation==='risk-operational-save'){
  const {actor,...values}=payload,input=validateOperationalReview(values);const view=activeRiskView(s);
  if(view.state!=='ready'||(view.operational?.source?.revision!==input.source.revision||view.operational?.source?.sha256!==input.source.sha256)||!view.risks.some(r=>r.id===input.riskId))throw Error('SOURCE_CHANGED');
  d.operationalReviews ||= {};const group=d.operationalReviews[input.source.revision]||={source:input.source,assessments:{},history:[]},before=group.assessments[input.riskId];
  if((before?.revision||0)!==input.revision){if(before?.revision===input.revision+1&&before.riskLevel===input.riskLevel&&before.riskNote===input.riskNote)return{snapshot:s,result:{record:before,overview:view}};throw Error('ASSESSMENT_CONFLICT');}
  const record={revision:input.revision+1,riskLevel:input.riskLevel,riskNote:input.riskNote,completedAt:now};group.history.push({at:now,actor,riskId:input.riskId,before:before||null,after:record});group.assessments[input.riskId]=record;result={record,overview:activeRiskView(s)};
 }else if(['barrier-draft','barrier-complete','barrier-reopen'].includes(operation)){
  const op=operation.slice(8),before=d.barrier||emptyBarrier(),data=op==='reopen'?null:validateBarrierData(payload.data,op==='complete');
  if(data?.barrierType==='custom'||before.barrierType==='custom')throw Error('DRIVE_REQUIRED');
  if(before.completed&&op==='complete'&&same(barrierData(before),data))return{snapshot:s,result:{record:before,overview:activeRiskView(s)}};
  if(before.completed&&op!=='reopen')throw Error('ASSESSMENT_COMPLETED');
  if(payload.revision!==before.revision){if(op==='draft'&&before.revision===payload.revision+1&&same(barrierData(before),data))return{snapshot:s,result:{record:before,overview:activeRiskView(s)}};throw Error('ASSESSMENT_CONFLICT');}
  let record={...before,revision:before.revision+1};
  if(op==='reopen'){if(!before.completed)throw Error('VALIDATION');Object.assign(record,{completed:false,completedAt:null,completedBy:null});}
  else Object.assign(record,{barrierType:data.barrierType,riskLevel:data.riskLevel,notes:null,riskNote:data.riskNote,attachment:null,...(op==='complete'?{completed:true,completedAt:now,completedBy:actor}:{})});
  if(op==='draft'&&same(barrierData(before),barrierData(record)))return{snapshot:s,result:{record:before,overview:activeRiskView(s)}};
  history('barrier_layout',op,before,record);d.barrier=record;d.revision++;
  if(barrierSignature(before)!==barrierSignature(record)){
   const seated=record.barrierType==='seated';s.floor=record.barrierType?{revision:(s.floor?.revision||0)+1,completed:seated,riskLevel:seated?'none':null,note:'',active:false}:null;
  }
  result={record,overview:activeRiskView(s)};
 }else if(operation.startsWith('measure-')){
  const {actor,...inputPayload}=payload,input=validateMeasureRequest({operation:operation.slice(8),...inputPayload});
  if(['upload','remove','download'].includes(input.operation)||input.measureId==='production:floor_pressure')throw Error('DRIVE_REQUIRED');
  let row=measureDefinitions({venue:s.venue},activeRiskView(s)).rows.find(r=>r.id===input.measureId);if(!row)throw Error('SOURCE_CHANGED');
  const current=d.measureImplementations?.[row.id],mutation=createHash('sha256').update(JSON.stringify({actor,input})).digest('hex');
  if(current?.revision===input.revision+1&&current.lastMutation===mutation&&current.basis===row.basis)return{snapshot:s,result:measureView(s,row.id)};
  if(input.revision!==(current?.revision||0))throw Error('ASSESSMENT_CONFLICT');if(input.basis!==row.basis)throw Error('SOURCE_CHANGED');
  const normalized=measureState(row,current),record={revision:input.revision+1,basis:row.basis,originalRiskLevel:row.originalRiskLevel,riskLevelAfter:normalized.riskLevelAfter,briefing:normalized.briefing,briefingChosen:normalized.briefingChosen,completedAt:normalized.completedAt,completedBy:normalized.completedAt?current.completedBy:null,attachments:[...(current?.attachments||[])],lastMutation:mutation};
  if(input.operation==='edit-text'){
   if(normalized.implemented)throw Error('ASSESSMENT_COMPLETED');
   const source=row.sourceType==='operational'?d.operationalReviews?.[row.sourceRevision]?.assessments?.[row.sourceId]:row.sourceId==='barrier_layout'?d.barrier:null;if(!source||source.riskLevel!==row.originalRiskLevel)throw Error('SOURCE_CHANGED');
   const before=structuredClone(source);source.riskNote=input.text;source.revision++;history('measure_text',undefined,before,source,{measureId:row.id});if(row.sourceType==='production')d.revision++;
   row={...row,text:input.text,basis:JSON.stringify([row.id,row.originalRiskLevel,input.text])};record.basis=row.basis;record.riskLevelAfter=null;record.completedAt=null;record.completedBy=null;
  }else if(['draft','complete'].includes(input.operation)){
   if(normalized.implemented&&input.operation==='draft'&&input.data.riskLevelAfter!==record.riskLevelAfter)throw Error('ASSESSMENT_COMPLETED');
   record.riskLevelAfter=input.data.riskLevelAfter;record.briefing=input.data.briefing;record.briefingChosen=typeof input.data.briefing==='boolean';if(!record.briefingChosen){record.completedAt=null;record.completedBy=null;}if(input.operation==='complete'){record.completedAt=now;record.completedBy=actor;}
  }else if(input.operation==='reopen'){if(!normalized.implemented)throw Error('VALIDATION');record.completedAt=null;record.completedBy=null;}else throw Error('VALIDATION');
  d.measureImplementations ||= {};d.measureImplementations[row.id]=record;history('measure_implementation',input.operation,current,record,{measureId:row.id});result=measureView(s,row.id);
 }else throw Error('DRIVE_REQUIRED');
 s.completion=activeCompletion(s);validateActiveSnapshot(s);return{snapshot:s,result};
}
