import {randomUUID} from 'node:crypto';
import {archiveAfterShow,validateActiveSnapshot} from '../../shared/active-show-storage.js';
// Alleen lokale synthetische tests; dezelfde CAS-/leasevoorwaarden als de SQL-RPCs.
export function memoryActiveRepository({now=Date.now}={}){
 const rows=new Map(),receipts=new Map(),copy=value=>value?structuredClone(value):value;
 const matches=row=>{const current=rows.get(row.concert_id);return current&&current.revision===row.revision&&current.lease===row.lease;};
 return{
  rows,receipts,enabled:async()=>true,
  async get(id){return copy([...rows.values()].find(row=>row.aliases.includes(id))||null);},
  async seed(snapshot){validateActiveSnapshot(snapshot);if(!rows.has(snapshot.concertId))rows.set(snapshot.concertId,{concert_id:snapshot.concertId,aliases:snapshot.aliases,archive_after:archiveAfterShow(snapshot.dates),snapshot:copy(snapshot),revision:0,lease:null,lease_until:null,pending:true,archive_error:false,external_command:null});return this.get(snapshot.concertId);},
  async claim(id){const row=rows.get(id);if(!row||row.lease&&Date.parse(row.lease_until)>now())return null;row.lease=randomUUID();row.lease_until=new Date(now()+15*60000).toISOString();return copy(row);},
  async intent(row,command){if(!matches(row))throw Error('ACTIVE_STORAGE_CONFLICT');Object.assign(rows.get(row.concert_id),{external_command:command,external_started:new Date(now()).toISOString()});},
  async commit(row,snapshot,command=null,result=null){if(!matches(row))throw Error('ACTIVE_STORAGE_CONFLICT');validateActiveSnapshot(snapshot);const saved={...rows.get(row.concert_id),snapshot:copy(snapshot),aliases:snapshot.aliases,archive_after:archiveAfterShow(snapshot.dates),revision:row.revision+1,lease:null,lease_until:null,external_command:null,external_started:null,pending:true,archive_error:false};rows.set(saved.concert_id,saved);if(command)receipts.set(saved.concert_id+'|'+command,{result:copy(result)});return copy(saved);},
  async receipt(id,command){return copy(receipts.get(id+'|'+command));},
  async release(row,{mirrored=false,error=false}={}){if(!matches(row))return false;Object.assign(rows.get(row.concert_id),{lease:null,lease_until:null,archive_error:error,...(mirrored?{pending:false}:{})});return true;},
  async error(row){if(matches(row))rows.get(row.concert_id).archive_error=true;},
  async purge(row){if(!matches(row)||Date.parse(row.archive_after)>now())throw Error('ACTIVE_STORAGE_CONFLICT');rows.delete(row.concert_id);for(const key of receipts.keys())if(key.startsWith(row.concert_id+'|'))receipts.delete(key);},
  async all(){return copy([...rows.values()].sort((a,b)=>a.archive_after.localeCompare(b.archive_after)));},
  document(){return copy([...rows.values()][0]?.snapshot.production);},
 };
}
