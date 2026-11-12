import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createShowsStore} from './shows-store.js';
import {validateActiveSnapshot} from '../shared/active-show-storage.js';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
export const inventoryFingerprint=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const count=value=>value&&typeof value==='object'?Object.keys(value).length:0;
const missing=error=>['42P01','PGRST205'].includes(error?.code);
export function createInventoryDatabase({env=process.env,clientFactory=createClient}={}){
 let client;const db=()=>client||=clientFactory(env.VITE_SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const check=result=>{if(result.error)throw Error('DATABASE_UNAVAILABLE');return result.data;};
 async function control(){const result=await db().from('esmojo_storage_control').select('enabled,version').eq('id',1).maybeSingle();if(missing(result.error))return{state:'schema-missing',enabled:null};const row=check(result);return row?.version===1?{state:'available',enabled:row.enabled===true}:{state:'schema-missing',enabled:null};}
 return{
  async catalogue(){
   const state=await control();if(state.state!=='available')return{...state,rows:[]};
   let rows=[];for(let offset=0;offset<10000;offset+=500){const page=check(await db().from('esmojo_active_shows').select('concert_id,aliases').order('concert_id').range(offset,offset+499));rows.push(...page);if(page.length<500)return{...state,rows};}
   throw Error('INVENTORY_LIMIT');
  },
  async read(id){
   const state=await control();if(state.state!=='available')return{...state,row:null,receipts:null,management:null};
   const rows=check(await db().from('esmojo_active_shows').select('concert_id,aliases,snapshot,revision,pending,archive_error,lease,lease_until,external_command,external_started,updated_at').contains('aliases',[id]).limit(2));
   if(rows.length>1)throw Error('CONFLICT');const row=rows[0]||null;
   const managementResult=await db().from('esmojo_show_management').select('enabled,progress').eq('concert_id',row?.concert_id||id).maybeSingle();
   const management=missing(managementResult.error)?{state:'schema-missing'}:(check(managementResult),{state:'available',exists:Boolean(managementResult.data),enabled:managementResult.data?.enabled===true,sections:count(managementResult.data?.progress)});
   let receipts=0;if(row){const result=await db().from('esmojo_show_receipts').select('command',{head:true,count:'exact'}).eq('concert_id',row.concert_id);check(result);receipts=result.count;}
   return{...state,row,receipts,management};
  },
  async revision(id){return check(await db().from('esmojo_active_shows').select('revision').eq('concert_id',id).maybeSingle())?.revision??null;},
 };
}
export function createShowInventory({env=process.env,shows=createShowsStore({env,active:false}),database=createInventoryDatabase({env}),now=Date.now}={}){
 return async input=>{
  if(!input||Array.isArray(input)||!['inventory-list','inventory-show'].includes(input.operation)||Object.keys(input).sort().join(',')!==(input.operation==='inventory-list'?'operation':'concertId,operation'))throw Error('VALIDATION');
  if(input.operation==='inventory-list'){
   const [source,db]=await Promise.allSettled([shows('migration-list'),database.catalogue()]);
   if(source.status!=='fulfilled')throw Error('INVENTORY_SOURCE');
   const rows=source.value.concerts,ids=new Set(rows.map(row=>row.concertId));
   return{shows:rows.map(row=>({concertId:row.concertId,name:row.artist,venue:row.venue,date:row.date})),database:db.status==='fulfilled'?{state:db.value.state,enabled:db.value.enabled,activeShows:db.value.rows.length,unmatched:db.value.rows.filter(row=>!row.aliases.some(id=>ids.has(id))).map(row=>row.concert_id)}:{state:'unavailable',enabled:null,activeShows:null,unmatched:[]},environment:{dataverseConfigured:Boolean(env.DATAVERSE_TEST_TENANT_ID&&env.DATAVERSE_TEST_CLIENT_ID&&env.DATAVERSE_TEST_CLIENT_SECRET&&env.DATAVERSE_TEST_URL),dataverseTargetValid:env.DATAVERSE_TEST_URL?.replace(/\/$/,'')==='https://org5bab852a.crm.dynamics.com'},coverage:['indexed-show-folders','active-supabase','show-management'],notCovered:['shared-account-and-reference-files','unindexed-folders','trash-and-file-versions','binary-content-integrity'],writers:[{name:'AI-onderzoek',source:'Drive via bestaande onderzoeksroute; SharePoint-import schrijft Dataverse'},{name:'Actieve voorbereiding',source:'Supabase met Drive-spiegeling en archivering'},{name:'Bezoekers en documenten',source:'Drive via bestaande showroutes'}]};
  }
  const id=input.concertId;if(typeof id!=='string'||!id||id.length>240||/[\x00-\x1f/\\]/.test(id))throw Error('VALIDATION');
  const [source,dbResult]=await Promise.allSettled([shows('migration-scan',{concertId:id}),database.read(id)]);
  const issues=[],drive=source.status==='fulfilled'?source.value:null,db=dbResult.status==='fulfilled'?dbResult.value:null;
  if(!drive)issues.push('DRIVE_UNAVAILABLE');else issues.push(...drive.issues);
  if(!db||db.state!=='available')issues.push('SUPABASE_UNAVAILABLE');
  const row=db?.row;let snapshot=null;
  if(row)try{snapshot=validateActiveSnapshot(row.snapshot);}catch{issues.push('INVALID_ACTIVE_SNAPSHOT');}
  let changed=false;if(row){try{changed=await database.revision(row.concert_id)!==row.revision;}catch{changed=true;}if(changed)issues.push('DATABASE_CHANGED');}
  if(row?.pending)issues.push('MIRROR_PENDING');if(row?.archive_error)issues.push('ARCHIVE_ERROR');if(row?.external_command)issues.push('EXTERNAL_COMMAND');
  if(row?.lease)issues.push(Date.parse(row.lease_until)>now()?'ACTIVE_LEASE':'EXPIRED_LEASE');
  if(drive?.unknown)issues.push('UNKNOWN_FILES');if(drive?.nestedFolders)issues.push('NESTED_FOLDERS');if(drive&&drive.folders!==drive.expectedFolders)issues.push('FOLDER_COVERAGE');
  if(drive?.datasets.tickets.leases)issues.push('TICKET_LEASES');
  if(drive?.marker&&!row&&!drive.marker.archived)issues.push('ACTIVE_MARKER_WITHOUT_DATABASE');
  if(row&&db.enabled!==true)issues.push('DATABASE_DISABLED_WITH_ROWS');
  if(row&&drive?.marker?.archived)issues.push('ARCHIVED_MARKER_WITH_DATABASE');
  const resources=['profile','final','production'].map(key=>{
   const active=snapshot?.[key],source=drive?.datasets[key],matches=active&&source?.exists?inventoryFingerprint(active)===source.fingerprint:null;
   if(matches===false)issues.push('DIFFERENT_'+key.toUpperCase());
   return{kind:key,owner:!db||db.state!=='available'||row&&!snapshot||changed||drive?.changed?'unknown':row?db.enabled===true?'supabase':'blocked':drive?.marker&&!drive.marker.archived?'blocked':'drive',driveRevision:source?.revision??null,databaseRevision:active?.revision??null,matches,databaseItems:active?count(active[key==='profile'?'analyses':key==='final'?'categories':'choices']):null};
  });
  // Metadata only: no analysis text, ticket values, credentials, commands or file IDs.
  return{version:1,concertId:id,checkedAt:new Date(now()).toISOString(),drive,database:{state:db?.state||'unavailable',enabled:db?.enabled??null,exists:Boolean(row),revision:row?.revision??null,pending:row?.pending===true,archiveError:row?.archive_error===true,externalCommand:Boolean(row?.external_command),lease:Boolean(row?.lease),receipts:db?.receipts??null,management:db?.management??null,changed},resources,issues:[...new Set(issues)]};
 };
}
