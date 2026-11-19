import {randomUUID} from 'node:crypto';
import {createTaskStore,taskCipher} from '../background-tasks/store.js';
// Encrypted technical coordination only. This is not a background authorization
// grant: the caller authorizes every action independently, including after wait.
// Business content and recipient selection stay in their typed Reports rows.
export function createReportsStateStore({env=process.env,connection}={}){const base=taskCipher({env}),cipher={seal:(type,state)=>base.seal('reports-runtime/'+type,state),open:(type,text)=>base.open('reports-runtime/'+type,text)};return createTaskStore({env,...(connection?{connection}:{}),cipher,recordKind:'reports-runtime-state-v1',namespace:'reports-runtime'});}
const type='reports-runtime-coordination-v1',leaseMs=15*60000;
export function createReportsOperationalStore({env=process.env,store=createReportsStateStore({env}),now=Date.now}={}){
 async function initial(){
  let row=await store.get(type);if(row)return row;
  const at=now();return store.create(type,'Rapportages · technische coördinatie',{version:1,type,actor:'reports-runtime-internal',epoch:randomUUID(),handlerVersion:1,status:'ready',cursor:{version:1,revision:null,pipeline:null},sequence:0,attempts:0,startedAt:at,updatedAt:at,expiresAt:at+24*3600000,nextAt:at,lease:null,public:{label:'Technische Rapportages-coördinatie'}});
 }
 async function read(){const row=await store.get(type);if(row?.state.uncertain)throw Error('REPORT_WRITE_UNCONFIRMED');if(row?.state.lease?.until>now())throw Error('REPORT_BUSY');return row?structuredClone(row.state.cursor):null;}
 async function exclusive(authorize,operation){
  await authorize();let row=await initial();if(row.state.cursor?.version!==1||row.state.uncertain)throw Error('REPORT_WRITE_UNCONFIRMED');if(row.state.lease?.until>now())throw Error('REPORT_BUSY');
  const lease={id:randomUUID(),until:Math.ceil((now()+leaseMs)/1000)*1000};
  try{row=await store.save(row,{...row.state,lease,sequence:row.state.sequence+1,updatedAt:now()});}catch(error){if(error.message==='TASK_STALE')throw Error('REPORT_BUSY');throw error;}
  if(row.state.lease?.id!==lease.id)throw Error('REPORT_BUSY');
  const state=structuredClone(row.state.cursor);let writing=false;
  try{
   await authorize();const value=await operation(state,{async markWrite(){if(writing)return;const current=await store.get(type);if(current?.state.lease?.id!==lease.id||current.state.lease.until<=now())throw Error('REPORT_WRITE_UNCONFIRMED');await store.save(current,{...current.state,uncertain:true,sequence:current.state.sequence+1,updatedAt:now()});writing=true;}});
   const current=await store.get(type);if(current?.state.lease?.id!==lease.id||current.state.lease.until<=now())throw Error('REPORT_WRITE_UNCONFIRMED');
   await store.save(current,{...current.state,cursor:state,lease:null,uncertain:false,sequence:current.state.sequence+1,updatedAt:now()});return value;
  }catch(error){
   const current=await store.get(type).catch(()=>null);
   if(current?.state.lease?.id===lease.id){
    // Any uncertain business write freezes this coordinator, including after
    // lease expiry. A later operation cannot silently acquire a second writer.
    const uncertain=writing||['REPORT_WRITE_UNCONFIRMED','MIGRATION_UNCONFIRMED','TASK_UNCONFIRMED'].includes(error.message);
    await store.save(current,{...current.state,lease:uncertain?current.state.lease:null,uncertain,sequence:current.state.sequence+1,updatedAt:now()}).catch(()=>{});
   }throw error;
  }
 }
 // Alleen vaste, niet-gevoelige velden; nooit inhoud, ontvangers of providerberichten.
 async function inspect(){
  const row=await store.get(type);if(!row)return{state:'absent'};const s=row.state,leaseActive=Boolean(s.lease&&s.lease.until>now());
  return{state:s.uncertain===true?'frozen':'open',uncertain:s.uncertain===true,leaseActive,leaseUntil:Number.isFinite(s.lease?.until)?new Date(s.lease.until).toISOString():null,updatedAt:Number.isFinite(s.updatedAt)?new Date(s.updatedAt).toISOString():null,sequence:Number.isSafeInteger(s.sequence)?s.sequence:null,cursorVersion:s.cursor?.version??null};
 }
 // Heft uitsluitend de blijvende onzekerheidsfence op wanneer die vaststaat en veilig is: geen actieve lease, minstens
 // de volledige leasetijd verstreken sinds de laatste wijziging en een leesbare, geldige coördinatorstatus. Zakelijke
 // schrijfacties zijn voorwaardelijk (ETag/changeset) en afleveringen hebben vaste providersleutels; daarom kan een
 // herhaling daarna geen dubbele schrijver of dubbele mail opleveren. Eén conditionele write; geen zakelijke wijziging.
 async function recover(){
  const row=await store.get(type);if(!row)return{recovered:false,reason:'ABSENT'};const s=row.state;
  if(s.uncertain!==true)return{recovered:false,reason:'NOT_FROZEN'};
  if(s.lease?.until>now()||!Number.isFinite(s.updatedAt)||now()-s.updatedAt<leaseMs)throw Error('REPORT_BUSY');
  if(s.cursor?.version!==1)throw Error('REPORT_WRITE_UNCONFIRMED');
  try{await store.save(row,{...s,uncertain:false,lease:null,sequence:s.sequence+1,updatedAt:now()});}catch(error){if(error.message==='TASK_STALE')throw Error('REPORT_BUSY');throw error;}
  return{recovered:true};
 }
 return{read,exclusive,inspect,recover};
}
