import {matchReportIntakeConcert} from './report-intake-concert.js';
const guid=value=>typeof value==='string'&&/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const etag=value=>typeof value==='string'&&/^W\/"\d+"$/.test(value);
const fields=['esmojo_sleutel','esmojo_bestandsnaam','esmojo_bronid','esmojo_bronversie','esmojo_status','esmojo_bestand'];
const same=(a,b)=>fields.every(k=>a[k]===b[k]);
// Fixed intake scope: never alter files or status and never replace a different link.
// A lost PATCH acknowledgement is resolved only by an independent full readback.
export function createReportIntakeLink({repository,catalogue,authorize}){
 if(!repository||!catalogue||typeof authorize!=='function')throw Error('VALIDATION');
 return async function link(actor,id){
  if(!guid(id))throw Error('VALIDATION');await authorize(actor);
  const row=await repository.read(id);if(!row||row.esmojo_rapportontvangstid!==id||!etag(row['@odata.etag'])||typeof row.esmojo_bestandsnaam!=='string'||!row.esmojo_bestand)throw Error('INTAKE_UNAVAILABLE');
  const result=matchReportIntakeConcert(row.esmojo_bestandsnaam,(await catalogue.all()).concerts);
  if(result.status!=='matched')return{status:result.status};if(!guid(result.recordId)||typeof result.concertId!=='string'||!result.concertId)throw Error('INTAKE_CONFLICT');
  const old=row._esmojo_concert_value;if(old&&old!==result.recordId)throw Error('INTAKE_CONFLICT');
  if(old===result.recordId)return{status:'linked',concertId:result.concertId};
  let uncertain;try{await repository.link(id,result.recordId,row['@odata.etag']);}catch(error){uncertain=error;}
  const confirmed=await repository.read(id);if(!confirmed||!same(row,confirmed)||confirmed._esmojo_concert_value!==result.recordId)throw uncertain||Error('INTAKE_UNCONFIRMED');
  return{status:'linked',concertId:result.concertId};
 };
}
