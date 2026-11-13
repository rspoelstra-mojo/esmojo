import {createNativeShowState} from './dataverse-shows/state.js';
import {createNativeManagementRepository} from './dataverse-shows/management.js';
import {nativeShowsSelected,assertNativeAuthority} from './dataverse-shows/authority.js';
import {createClient} from '@supabase/supabase-js';
import {createHash,createHmac,randomBytes,randomInt,randomUUID,hkdfSync,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
import {upcomingShows} from './mojo-agenda.js';
const fail=code=>{throw Error(code);};
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const validManagementLink=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const digest=value=>createHash('sha256').update(value).digest('hex');
export function createShowManagementRepository({env=process.env,clientFactory=createClient,legacy=false}={}){
 if(!legacy&&nativeShowsSelected(env)){const state=createNativeShowState({env}),native=createNativeManagementRepository({env,state});return Object.fromEntries(Object.entries(native).map(([name,method])=>[name,async(...args)=>{await assertNativeAuthority({env,repository:state.repo});return method(...args);} ]));}
 let client;const db=()=>client||(client=clientFactory(env.VITE_SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}));
 const check=result=>{if(result.error)fail(['42P01','PGRST205','PGRST202'].includes(result.error.code)?'MANAGEMENT_SCHEMA_REQUIRED':'MANAGEMENT_UNAVAILABLE');return result.data;};
 return{
  async get(concertId){return check(await db().from('esmojo_show_management').select('*').eq('concert_id',concertId).maybeSingle());},
  async create(row){check(await db().from('esmojo_show_management').upsert(row,{onConflict:'concert_id',ignoreDuplicates:true}));return this.get(row.concert_id);},
  async attempt(hash){const rows=check(await db().rpc('esmojo_show_management_attempt',{p_hash:hash}));return rows?.[0]||null;},
  async read(id){return check(await db().from('esmojo_show_management').select('id,access_hash,enabled,progress').eq('id',id).maybeSingle());},
 };
}
export function createShowManagementService({env=process.env,shows,repository=createShowManagementRepository({env}),now=Date.now}={}){
 const key=()=>{if(typeof env.SUPABASE_SECRET_KEY!=='string'||env.SUPABASE_SECRET_KEY.length<16)fail('MANAGEMENT_UNAVAILABLE');return Buffer.from(hkdfSync('sha256',env.SUPABASE_SECRET_KEY,'esmojo','show-management-v1',32));};
 const mac=value=>createHmac('sha256',key()).update(value).digest('hex');
 const pinHash=(id,pin)=>mac('pin\n'+id+'\n'+pin);
 function seal(id,value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(id));const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');}
 function unseal(row){try{const bytes=Buffer.from(row.sealed_credentials,'base64url'),decipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));decipher.setAAD(Buffer.from(row.id));decipher.setAuthTag(bytes.subarray(12,28));const value=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));if(!validManagementLink(value.link)||!/^\d{6}$/.test(value.pin)||!same(digest(value.link),row.access_hash)||!same(pinHash(row.id,value.pin),row.pin_hash))fail();return value;}catch{fail('MANAGEMENT_UNAVAILABLE');}}
 async function target(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='concertId,operation'||!['status','create'].includes(body.operation)||typeof body.concertId!=='string'||!body.concertId||body.concertId.length>240)fail('VALIDATION');
  const data=await shows('list'),rows=data.shows||upcomingShows(data.concerts||[],new Date(now())),show=rows.find(row=>row.key===body.concertId);
  if(!show||show.venue!=='Gashouder')fail('FORBIDDEN');return show.key;
 }
 function overview(row){if(!row)return{available:false};if(!row.enabled)fail('FORBIDDEN');const {link,pin}=unseal(row);return{available:true,url:'https://esmojo.nl/showbeheer/#'+link,pin,progress:row.progress};}
 function session(row){const body=Buffer.from(JSON.stringify({scope:'show-management',id:row.id,hash:row.access_hash,expires:now()+8*60*60*1000})).toString('base64url');return body+'.'+mac('session\n'+body);}
 function claims(value){try{if(typeof value!=='string'||value.length>2048)fail();const [body,signature,...rest]=value.split('.');if(rest.length||!same(mac('session\n'+body),signature))fail();const data=JSON.parse(Buffer.from(body,'base64url'));if(data.scope!=='show-management'||data.expires<=now()||data.expires>now()+8*60*60*1000||!validManagementLink(data.hash)||!/^[a-f0-9-]{36}$/.test(data.id))fail();return data;}catch{fail('ACCESS_DENIED');}}
 return{
  async manage(body){const concertId=await target(body);let row=await repository.get(concertId);if(!row&&body.operation==='create'){const id=randomUUID(),link=randomBytes(32).toString('hex'),pin=String(randomInt(0,1000000)).padStart(6,'0');row=await repository.create({id,concert_id:concertId,access_hash:digest(link),pin_hash:pinHash(id,pin),sealed_credentials:seal(id,{link,pin})});if(!row)fail('MANAGEMENT_UNAVAILABLE');}return overview(row);},
  async open({link,pin}){if(!validManagementLink(link)||typeof pin!=='string'||!/^\d{6}$/.test(pin))fail('ACCESS_DENIED');const row=await repository.attempt(digest(link));if(!row||!row.enabled||!same(pinHash(row.id,pin),row.pin_hash))fail('ACCESS_DENIED');return{session:session(row),page:{available:true}};},
  async read(value,link){const data=claims(value);if(!validManagementLink(link)||!same(data.hash,digest(link)))fail('ACCESS_DENIED');const row=await repository.read(data.id);if(!row?.enabled||!same(row.access_hash,data.hash))fail('ACCESS_DENIED');return{available:true};},
 };
}
