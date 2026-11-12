import {createShowInventory} from './show-inventory.js';
import {createHash} from 'node:crypto';
import {createShowsStore} from './shows-store.js';
import {createResearchStore} from './research-store.js';
import {createDataverseResearch} from './dataverse-research.js';
import {researchKeyForConcert} from '../shared/dataverse-shows.js';
const hash=text=>createHash('sha256').update(text).digest('hex');
export function researchMarkdown(document){
 if(!document||typeof document.answer!=='string'||!document.answer.trim()||document.answer.length>30000||!Array.isArray(document.sources)||document.sources.length>40)throw Error('SOURCE_INVALID');
 let text=document.answer.trim();
 const missing=document.sources.filter(source=>{
  if(typeof source?.title!=='string'||source.title.length>300||typeof source.url!=='string'||source.url.length>2048)throw Error('SOURCE_INVALID');
  const url=new URL(source.url);if(url.protocol!=='https:'||url.username||url.password)throw Error('SOURCE_INVALID');
  return !text.includes(source.url);
 });
 if(missing.length)text+='\n\n## Bronnen\n\n'+missing.map((source,i)=>`[${i+1}] [${source.title.replace(/[\\[\]\r\n]/g,' ')}](${new URL(source.url).href.replaceAll('(','%28').replaceAll(')','%29')})`).join('\n\n');
 return text;
}
export function createDataTransition({env=process.env,shows=createShowsStore({env,active:false}),research=createResearchStore({env}),dataverse=createDataverseResearch({env}),inspection=createShowInventory({env,shows})}={}){
 return async function transition(input){
  if(!input||Array.isArray(input))throw Error('VALIDATION');
  if(['inventory-list','inventory-show'].includes(input.operation))return inspection(input);
  const operation=input.operation,expected={list:['operation'],inventory:['operation','concertId'],preview:['operation','concertId','number'],import:['operation','concertId','number','checksum'],'bulk-import':['operation','concertId','number']}[operation];
  if(!expected||Object.keys(input).sort().join(',')!==expected.sort().join(','))throw Error('VALIDATION');
  if(operation==='list'){
   const data=await shows('migration-list');
   return{shows:data.concerts.map(row=>({concertId:row.concertId,name:row.artist,venue:row.venue,date:row.date})).sort((a,b)=>a.name.localeCompare(b.name)||a.date.localeCompare(b.date))};
  }
  if(operation==='inventory'){
   if(typeof input.concertId!=='string'||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId))throw Error('VALIDATION');
   const data=await research({operation:'context',concertId:input.concertId});
   const numbers=data.completedQuestions;if(!Array.isArray(numbers)||numbers.length>11||numbers.some(n=>!Number.isInteger(n)||n<1||n>11)||new Set(numbers).size!==numbers.length)throw Error('SOURCE_INVALID');
   return{numbers};
  }
  if(typeof input.concertId!=='string'||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)||!Number.isInteger(input.number)||input.number<1||input.number>11||operation==='import'&&!/^[a-f0-9]{64}$/.test(input.checksum||''))throw Error('VALIDATION');
  let source;
  try{source=await research({operation:'read',concertId:input.concertId,questionNumber:input.number});}
  catch(error){if(error.message==='NOT_FOUND'&&['preview','bulk-import'].includes(operation))return{number:input.number,status:'missing'};throw error;}
  const {document,storage}=source;
  const sourceKey=researchKeyForConcert(storage||{});if(!sourceKey)throw Error('SOURCE_INVALID');
  if(document.concertId!==storage.concertId||document.questionNumber!==input.number||document.classification!=='openbaar'||document.managedBy!=='ESMOJO/Research-v1')throw Error('SOURCE_INVALID');
  const markdown=researchMarkdown(document),checksum=hash(sourceKey+'\n'+input.number+'\n'+markdown);
  if(operation==='preview')return{number:input.number,status:'ready',sourceKey,markdown,checksum};
  if(operation==='bulk-import'){
   try{return{number:input.number,status:'verified',...await dataverse.importDrive({sourceKey,number:input.number,markdown})};}
   catch(error){if(error.message==='CONFLICT')return{number:input.number,status:'conflict'};throw error;}
  }
  if(checksum!==input.checksum)throw Error('SOURCE_CHANGED');
  return{number:input.number,status:'verified',...await dataverse.importDrive({sourceKey,number:input.number,markdown})};
 };
}
