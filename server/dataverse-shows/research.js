import {createNativeShowState} from './state.js';
import {createDataverseResearch} from '../dataverse-research.js';
import {validateResearchRequest,ResearchError} from '../research-validation.js';
import {researchKeyForConcert} from '../../shared/dataverse-shows.js';
import {mapShow} from '../show-migration-map.js';
import {digest,canonical} from '../show-migration-writer.js';
import {assertNativeAuthority} from './authority.js';
// The existing native research table remains the canonical Markdown source.
// Compatibility metadata is scoped provenance, not a second research writer.
export function createNativeResearchStore({env=process.env,state=createNativeShowState({env}),research=createDataverseResearch({env}),authority=()=>assertNativeAuthority({env,repository:state.repo})}={}){
 return async request=>{
  const input=validateResearchRequest(request);await authority();
  if(!['context','read','write'].includes(input.operation))throw new ResearchError('VALIDATION');
  const loaded=await state.load(input.concertId);await state.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);
  const source=loaded.source,selected=source.shows.find(row=>row.concertId===loaded.concert.esmojo_oudconcertid),primary=source.shows.find(row=>row.concertId===source.concertId),pick=row=>Object.fromEntries(['concertId','artist','venue','city','date'].map(key=>[key,row[key]])),common={selected:pick(selected),storage:pick(primary),seriesDates:source.shows.map(row=>row.date).sort()},sourceKey=researchKeyForConcert(primary),native=await research.read(sourceKey);
  if(input.operation==='context')return{...common,completedQuestions:Object.keys(native.researchByNumber).map(Number).sort((a,b)=>a-b)};
  const number=input.questionNumber,filename='onderzoek_'+String(number).padStart(2,'0')+'.json',old=source.documents[filename],current=native.researchByNumber[number];
  if(input.operation==='read'){
   if(!current)throw new ResearchError('NOT_FOUND');
   const document=old&&current.answer===markdown(old)?old:{managedBy:'ESMOJO/Research-v1',schemaVersion:1,classification:'openbaar',status:'concept',concertId:source.concertId,questionNumber:number,question:old?.question||'',answer:current.answer,sources:[],importedAt:current.importedAt};return{...common,filename,document};
  }
  const document={managedBy:'ESMOJO/Research-v1',schemaVersion:1,classification:'openbaar',status:'concept',concertId:source.concertId,questionNumber:number,...input.result},text=markdown(document),command=digest(canonical(input)),receipt=await state.receipt(loaded,command);if(receipt)return receipt;
  if(old&&canonical(old)!==canonical(document)||current&&current.answer!==text)throw new ResearchError('CONFLICT');
  const published=await research.importDrive({sourceKey,number,markdown:text});if(!published.verified)throw new ResearchError('UNAVAILABLE');
  if(old)return{concertId:source.concertId,filename,created:false};
  const next={...source,documents:{...source.documents,[filename]:document}};
  return state.commit(loaded,next,{concertId:source.concertId,filename,created:published.created},command);
 };
}
function markdown(document){
 let text=document.answer.trim();const missing=document.sources.filter(source=>!text.includes(source.url));
 if(missing.length)text+='\n\n## Bronnen\n\n'+missing.map((source,index)=>`[${index+1}] [${source.title.replace(/[\\[\]\r\n]/g,' ')}](${new URL(source.url).href.replaceAll('(','%28').replaceAll(')','%29')})`).join('\n\n');return text;
}
