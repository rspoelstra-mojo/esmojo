import {createNativeShowState} from './state.js';
import {record,reference,recordKey,choice,canonical,digest} from '../show-migration-writer.js';
import {recordOperations} from './mutations.js';
const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),validId=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export function createNativeManagementRepository({env=process.env,state=createNativeShowState({env}),now=Date.now}={}){
 const repo=state.repo;
 async function view(row){
  if(!row)return null;const m=await repo.meta('esmojo_showbeheer'),progressRows=await repo.query('esmojo_zaalbijdrage',{filter:'_esmojo_showbeheer_value eq '+row[m.PrimaryIdAttribute]}),progress={};
  const sections=['staff','environment','policy','reports'];for(const entry of progressRows){const section=sections.find(s=>choice('zaalsectie',s)===entry.esmojo_sectie);if(!section)throw Error('MANAGEMENT_UNAVAILABLE');progress[section]=JSON.parse(entry.esmojo_inhoud_json);}
  return{id:row.esmojo_cryptoaadid,concert_id:row.esmojo_oudconcertid,access_hash:row.esmojo_toegangshash,pin_hash:row.esmojo_pinhash,sealed_credentials:row.esmojo_versleuteldegegevens,enabled:row.esmojo_ingeschakeld,progress,created_at:row.esmojo_vastgelegdop};
 }
 async function source(concertId){const scope=await state.resolve(concertId),identity='drive-series/'+scope.series.esmojo_oudalgemeenconcertid;return{...scope,identity,row:await repo.byKey('esmojo_showbeheer',recordKey('esmojo_showbeheer',identity+'/management'))};}
 return{
  async get(concertId){return view((await source(concertId)).row);},
  async create(value){
   if(!validId(value.id)||!validHash(value.access_hash)||!validHash(value.pin_hash)||typeof value.sealed_credentials!=='string')throw Error('VALIDATION');const scope=await source(value.concert_id);if(scope.row)return view(scope.row);
   const identity=scope.identity+'/management',series={concertreeks:reference('concertreeks',scope.identity)},management=record('showbeheer',identity,'Showbeheer',{oudconcertid:value.concert_id,cryptoaadid:value.id,toegangshash:value.access_hash,pinhash:value.pin_hash,versleuteldegegevens:value.sealed_credentials,ingeschakeld:true,vastgelegdop:new Date(now()).toISOString()},series),rows=[management];
   for(const section of ['staff','environment','policy','reports'])rows.push(record('zaalbijdrage',identity+'/'+section,section,{sectie:choice('zaalsectie',section),sectiestatus:choice('zaalstatus','empty'),inhoud_json:canonical('empty')},{showbeheer:reference('showbeheer',identity)}));
   try{await repo.atomic(await recordOperations(repo,rows));}catch(error){const existing=(await source(value.concert_id)).row;if(!existing)throw error;return view(existing);}return view((await source(value.concert_id)).row);
  },
  async attempt(hash){
   if(!validHash(hash))throw Error('ACCESS_DENIED');
   for(let attempt=0;attempt<5;attempt++){
    const rows=await repo.query('esmojo_showbeheer',{filter:"esmojo_toegangshash eq '"+hash+"'",top:2});if(rows.length!==1||rows[0].esmojo_ingeschakeld!==true)return null;const row=rows[0],id=row.esmojo_cryptoaadid,key=recordKey('esmojo_technischestatus','drive-series/'+(await state.resolve(row.esmojo_oudconcertid)).series.esmojo_oudalgemeenconcertid+'/management/rate-limit'),old=await repo.byKey('esmojo_technischestatus',key),live=Date.parse(old?.esmojo_venstereinde)>now();
    if(live&&(old.esmojo_teller||0)>=10)return null;
    const identity='drive-series/'+(await state.resolve(row.esmojo_oudconcertid)).series.esmojo_oudalgemeenconcertid+'/management',rate=record('technischestatus',identity+'/rate-limit','Showbeheer pogingslimiet',{doelsoort:'show-management-rate-limit',resourcecode:id,teller:live?(old.esmojo_teller||0)+1:1,venstereinde:live?old.esmojo_venstereinde:new Date(now()+15*60000).toISOString()},{showbeheer:reference('showbeheer',identity)}),ops=await recordOperations(repo,[rate]),m=await repo.meta('esmojo_showbeheer');ops.unshift({table:'esmojo_showbeheer',id:row[m.PrimaryIdAttribute],method:'PATCH',etag:row['@odata.etag'],payload:{esmojo_ingeschakeld:true}});
    try{await repo.atomic(ops);return view(row);}catch(error){if(error.message!=='DATAVERSE_SHOWS_CONFLICT')throw error;}
   }throw Error('MANAGEMENT_UNAVAILABLE');
  },
  async read(id){if(!validId(id))throw Error('ACCESS_DENIED');const rows=await repo.query('esmojo_showbeheer',{filter:"esmojo_cryptoaadid eq '"+id+"'",top:2});if(rows.length>1)throw Error('MANAGEMENT_UNAVAILABLE');return view(rows[0]||null);},
 };
}
