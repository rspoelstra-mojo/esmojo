import {randomBytes} from 'node:crypto';
import {nativeConnection} from './dataverse-shows/connection.js';
const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,127}$/i.test(value);
const attribute=value=>identifier(value)||typeof value==='string'&&/^_[a-z][a-z0-9_]{0,119}_value$/i.test(value);
// Internal read-only transport; callers supply only server-built schema queries.
// There is deliberately no HTTP endpoint accepting these paths/descriptors.
export function createDataverseReadBatch({env=process.env,connection=nativeConnection(env),meta,allowedTables}={}){
 return async queries=>{
  if(!Array.isArray(queries)||!queries.length||queries.length>30)throw Error('READ_BATCH_INVALID');
  const planned=await Promise.all(queries.map(async query=>{if(!allowedTables.has(query.table)||typeof query.filter!=='string'||query.filter.length>4000||query.select&&(!Array.isArray(query.select)||query.select.some(c=>!attribute(c))))throw Error('READ_BATCH_INVALID');const m=query.nativeMetadata||await meta(query.table);if(m.LogicalName!==query.table||!identifier(m.EntitySetName)||!identifier(m.PrimaryIdAttribute))throw Error('READ_BATCH_INVALID');return{...query,primary:m.PrimaryIdAttribute,set:m.EntitySetName,path:m.EntitySetName+'?'+new URLSearchParams({...query.filter?{'$filter':query.filter}:{},...query.select?{'$select':[...new Set([m.PrimaryIdAttribute,...query.select])].join(',')}:{}}),rows:[]};}));
  let pending=[...planned];for(let round=0;pending.length;round++){
   if(round>=50)throw Error('READ_BATCH_LIMIT');const boundary='batch_'+randomBytes(16).toString('hex'),lines=[];
   for(let i=0;i<pending.length;i++)lines.push('--'+boundary,'Content-Type: application/http','Content-Transfer-Encoding: binary','Content-ID: '+(i+1),'','GET /api/data/v9.2/'+pending[i].path+' HTTP/1.1','Accept: application/json','Consistency: Strong','Prefer: odata.maxpagesize=1000','','');lines.push('--'+boundary+'--','');
   const ctx=await connection.connect(),response=await connection.call('$batch',ctx.headers,{method:'POST',multipart:{boundary,body:lines.join('\r\n')},code:'READ_BATCH_UNAVAILABLE',timeoutMs:60000});if(!response.ok)throw Error('READ_BATCH_UNAVAILABLE');const match=/boundary="?([a-z0-9_.-]+)"?/i.exec(response.headers.get('content-type')||'');if(!match)throw Error('READ_BATCH_RESPONSE');const parts=(await response.text()).split('--'+match[1]).filter(part=>/HTTP\/1\.[01] /.test(part));if(parts.length!==pending.length)throw Error('READ_BATCH_RESPONSE');const next=[];
   for(let i=0;i<parts.length;i++){const payload=parts[i].slice(parts[i].indexOf('HTTP/1.')),split=payload.indexOf('\r\n\r\n');if(!/^HTTP\/1\.[01] 200\b/.test(payload)||split<0)throw Error('READ_BATCH_UNAVAILABLE');let data;try{data=JSON.parse(payload.slice(split+4).trim());}catch{throw Error('READ_BATCH_RESPONSE');}const query=pending[i];if(!Array.isArray(data.value)||data.value.length>1000)throw Error('READ_BATCH_RESPONSE');query.rows.push(...data.value);if(query.rows.length>50000)throw Error('READ_BATCH_LIMIT');if(data['@odata.nextLink']){const url=new URL(data['@odata.nextLink']);if(url.origin!=='https://org5bab852a.crm.dynamics.com'||url.pathname!=='/api/data/v9.2/'+query.set||url.username||url.password||url.hash)throw Error('READ_BATCH_RESPONSE');query.path=query.set+url.search;next.push(query);}}
   pending=next;
  }
  return planned.map(query=>{const ids=new Set();for(const row of query.rows){const id=row[query.primary];if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id)||ids.has(id)||!/^W\/"[0-9]+"$/.test(row['@odata.etag']||''))throw Error('READ_BATCH_RESPONSE');ids.add(id);}return query.rows;});
 };
}
