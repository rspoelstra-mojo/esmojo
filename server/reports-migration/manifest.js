import {createTaskStore} from '../background-tasks/store.js';
import {digest,canonical} from '../show-migration-writer.js';
export function splitManifest(entries,selection){
 const pages=[];let page=[];
 for(const entry of entries){if(Buffer.byteLength(canonical(entry))>38000)throw Error('MIGRATION_SOURCE_LIMIT');if(Buffer.byteLength(canonical([...page,entry]))>40000){pages.push(page);page=[];}page.push(entry);}
 if(page.length||!pages.length)pages.push(page);
 const {settings,...selected}=selection,body=canonical(settings||{}),parts=[];for(let start=0;start<body.length;){let end=Math.min(body.length,start+30000);if(end<body.length&&/[\uD800-\uDBFF]/.test(body[end-1]))end--;parts.push(body.slice(start,end));start=end;}return{pages,selection:{...selected,settingsHash:digest(body),settingsPages:parts.length},settings:parts};
}
// Immutable encrypted manifest pages/proofs, scoped to one user-started epoch.
// They are never registered as executable tasks or returned to the browser.
export function createReportsManifest({env=process.env,store=createTaskStore({env}),now=Date.now}={}){
 const type=(run,kind,index)=>{if(typeof run!=='string'||!/^[a-f0-9-]{36}$/i.test(run)||!['page','selection','settings','proof'].includes(kind)||!Number.isSafeInteger(index)||index<0||index>10000)throw Error('TASK_CORRUPT');return'reports-mig-'+kind+'-'+digest(run).slice(0,32)+'-'+index;};
 return{
  async put(run,kind,index,value,actor,expiresAt){const name=type(run,kind,index),cursor=canonical(value);if(Buffer.byteLength(cursor)>50000)throw Error('MIGRATION_SOURCE_LIMIT');const state={version:1,type:name,actor,epoch:run,handlerVersion:1,status:'complete',sequence:0,expiresAt,nextAt:now(),startedAt:now(),updatedAt:now(),lease:null,cursor,public:{label:'Afgeschermd migratiecontrolepunt'}};
   const row=await store.create(name,'Rapportages · migratiecontrolepunt',state);if(row.state.actor!==actor||row.state.epoch!==run||row.state.expiresAt!==expiresAt||row.state.cursor!==cursor)throw Error('MIGRATION_SOURCE_CHANGED');return value;},
  async get(run,kind,index,actor,expiresAt){const row=await store.get(type(run,kind,index));if(!row||row.state.actor!==actor||row.state.epoch!==run||row.state.expiresAt!==expiresAt||row.state.status!=='complete'||row.state.lease||typeof row.state.cursor!=='string')throw Error('TASK_CORRUPT');try{return JSON.parse(row.state.cursor);}catch{throw Error('TASK_CORRUPT');}},
 };
}
