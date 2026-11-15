import {digest} from '../show-migration-writer.js';
// Bootstrap existing processing counters from the immutable migration history.
// Never call Drive to fill missing runtime state; missing/ambiguous proof blocks.
export async function originalReportSettings(repo){
 const rows=await repo.query('esmojo_historie',{filter:"esmojo_entiteitsoort eq 'reports-source-settings-v1'"}),parts=[];let hash=null,total=null;
 for(const row of rows){let entry;try{entry=JSON.parse(row.esmojo_snapshot_json);}catch{throw Error('REPORT_CONFLICT');}
  if(entry?.version!==1||!Number.isSafeInteger(entry.index)||entry.index<0||!Number.isSafeInteger(entry.total)||entry.total<1||entry.total>10000||entry.index>=entry.total||typeof entry.text!=='string'||digest(entry.text)!==row.esmojo_fingerprint||!(/^[a-f0-9]{64}$/).test(entry.hash||'')||hash!==null&&hash!==entry.hash||total!==null&&total!==entry.total||parts[entry.index]!==undefined)throw Error('REPORT_CONFLICT');
  hash=entry.hash;total=entry.total;parts[entry.index]=entry.text;
 }
 if(total===null||rows.length!==total||parts.length!==total||parts.some(part=>typeof part!=='string')||digest(parts.join(''))!==hash)throw Error('REPORT_CONFLICT');
 let settings;try{settings=JSON.parse(parts.join(''));}catch{throw Error('REPORT_CONFLICT');}
 if(settings?.version!==1||!Number.isSafeInteger(settings.revision)||settings.revision<0||!Array.isArray(settings.sources))throw Error('REPORT_CONFLICT');return settings;
}
