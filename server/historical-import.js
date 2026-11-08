import {artistPreparation} from './artist-preparation.js';
import {createHash} from 'node:crypto';
import {calculateReport,parseCsv} from './ontrack-report/data.js';
import {validateReportDay} from './web-report-catalogue.js';
// The batch stays in private Drive. Workflow inputs/results contain no CSV,
// ticket counts, private file IDs or source fingerprints.
export function validateHistoricalEntry(row){
 if(!row||typeof row.csvBase64!=='string'||row.csvBase64.length>2800000||!/^[a-f0-9]{64}$/.test(row.sha256||'')||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))throw Error('IMPORT_INVALID');
 const bytes=Buffer.from(row.csvBase64,'base64');if(createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('SOURCE_CHANGED');
 const rows=parseCsv(bytes);if(rows.length!==row.incidentCount||rows.some(incident=>/schoonmaak/iu.test(incident.Division)))throw Error('IMPORT_INVALID');
 validateReportDay(calculateReport(bytes),row.date);return row.sha256;
}
export function createHistoricalImporter({store}){
 return async({batch,phase})=>{
  if(typeof batch!=='string'||!/^historical-[a-z0-9-]{1,70}\.json$/.test(batch)||!['sample','all'].includes(phase))throw Error('VALIDATION');
  const result=await store('historical-import-read',null,{batch,phase});
  if(!Array.isArray(result.entries)||result.entries.length>2||!Number.isSafeInteger(result.pending)||!Number.isSafeInteger(result.total)||!Number.isSafeInteger(result.complete))throw Error('IMPORT_INVALID');
  for(const entry of result.entries){const sourceHash=validateHistoricalEntry(entry);await store('historical-import-commit',null,{batch,phase,batchHash:result.batchHash,concertId:entry.concertId,sourceHash});}
  return{ok:true,total:result.total,complete:result.complete+result.entries.length,pending:result.pending-result.entries.length};
 };
}

export function createHistoricalImportVerifier({store}){
 return async({batch,phase,offset})=>{
  if(typeof batch!=='string'||!/^historical-[a-z0-9-]{1,70}\.json$/.test(batch)||!['sample','all'].includes(phase)||!Number.isSafeInteger(offset)||offset<0||offset>1000)throw Error('VALIDATION');
  const result=await store('historical-import-verify',null,{batch,phase,offset});
  if(!Array.isArray(result.entries)||result.entries.length>5||result.nextOffset!==offset+result.entries.length||!Number.isSafeInteger(result.total))throw Error('IMPORT_INVALID');
  for(const row of result.entries){validateHistoricalEntry(row);const prep=artistPreparation(row.preparation,row);if(prep?.general.soldTickets!==Number(row.ticket_sales))throw Error('TICKET_CONFLICT');}
  return{ok:true,total:result.total,verified:result.entries.length,nextOffset:result.nextOffset};
 };
}
