import {assessmentKeys,assessmentConcert,assessmentRevision} from '../shared/barrier-layout.js';
export function validateFloorRequest(input){
  const fields={read:[],draft:['revision','basis','data'],complete:['revision','basis','data'],reopen:['revision','basis']}[input?.operation];
  if(!fields)throw Error('VALIDATION');assessmentKeys(input,['operation','concertId',...fields]);assessmentConcert(input.concertId);
  if(fields.includes('revision'))assessmentRevision(input.revision);
  if(fields.includes('basis')){assessmentKeys(input.basis,['barrierSignature','ticketVersion']);if(typeof input.basis.barrierSignature!=='string'||input.basis.barrierSignature.length>500)throw Error('VALIDATION');assessmentRevision(input.basis.ticketVersion);}
  if(fields.includes('data')){assessmentKeys(input.data,['rows','riskLevel','note']);if(JSON.stringify(input.data).length>80000)throw Error('VALIDATION');}
  return input;
}
