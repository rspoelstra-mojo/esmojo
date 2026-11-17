import {createHash} from 'node:crypto';
import {createRiskPdf,riskPdfAssets,riskPdfFileName,RISK_PDF_LAYOUT} from './render.js';
import {validMeasureId} from '../../shared/measure-workflow.js';
export const RISK_PDF_MAX_BYTES=2*1024*1024;
// Strikte invoer: alleen concert en maatregel-ID; de server haalt alle inhoud zelf uit de bevestigde gegevens.
export function validateRiskPdfRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='concertId,measureId')throw Error('VALIDATION');
 if(typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)||!validMeasureId(input.measureId))throw Error('VALIDATION');
 return{concertId:input.concertId,measureId:input.measureId};
}
export function createRiskPdfService({shows,render=createRiskPdf,assets=riskPdfAssets}){
 return{async create({concertId,measureId},actor){
  const data=await shows('risk-measure-export',{concertId,measureId,actor});
  let pdf;try{pdf=await render(data,await assets());}catch{throw Error('LAYOUT_ERROR');}
  if(!Buffer.isBuffer(pdf)||pdf.length>RISK_PDF_MAX_BYTES)throw Error('PDF_TOO_LARGE');
  return{fileName:riskPdfFileName(data),layout:RISK_PDF_LAYOUT,pdfBase64:pdf.toString('base64'),sha256:createHash('sha256').update(pdf).digest('hex')};
 }};
}
