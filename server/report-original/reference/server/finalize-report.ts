import {REPORT_LAYOUT_VERSION,gashouderReportEnabled,reportFileName} from '../src/report-show.ts'
import type {ReportShow} from '../src/report-show.ts'
import {parseOperationRecord} from '../src/operations.ts'
import {requiredReviewFields} from '../src/review-fields.ts'
import {stepAvailable} from '../src/workflow.ts'
import {requestSheet,validateShowIdentity,SheetError} from './google-sheets.ts'
import {createReportPdf,reportAssets,ReportError} from './report-pdf.ts'
export {ReportError}
export function validateFinalReportRequest(value:unknown){
 const identity=validateShowIdentity(value),data=value as Record<string,unknown>
 if(Object.keys(data).some(key=>!['concert_id','legacy_concert_id','setup_key'].includes(key))||!gashouderReportEnabled(identity.concert_id)||data.setup_key!==undefined&&(typeof data.setup_key!=='string'||!/^[a-f0-9]{64}$/.test(data.setup_key)))throw new ReportError('PDF-afronding is beschikbaar voor shows in de Gashouder.')
 return {...identity,...(typeof data.setup_key==='string'?{setup_key:data.setup_key}:{})}
}
export async function finalizeReport(input:ReturnType<typeof validateFinalReportRequest>,send:typeof requestSheet=requestSheet,builders={assets:reportAssets,render:createReportPdf}){
 const context=await send({action:'report',op:'context',concert_id:input.concert_id}) as {record:unknown;revision:string;version:number;existing?:boolean;layout_version?:string;report_scope?:string;resource_key?:string;show?:ReportShow}
 if(context.report_scope!=='showprofile')throw new ReportError('Werk Code.gs bij en publiceer een nieuwe versie om het showprofiel onafhankelijk van de risicostappen af te ronden.')
 if(context.layout_version!==REPORT_LAYOUT_VERSION)throw new ReportError('Werk Code.gs bij en publiceer een nieuwe versie om de nieuwste Showprofiel-PDF te gebruiken.')
 let record:ReturnType<typeof parseOperationRecord>
 try{record=parseOperationRecord(context.record)}catch{throw new SheetError('De opgeslagen analyse kon niet worden ingelezen voor de PDF. Herlaad de show; de ingevulde gegevens zijn behouden.')}
 if(record.concert_id!==input.concert_id||!/^[a-f0-9]{64}$/.test(context.revision)||!Number.isInteger(context.version)||context.version<1)throw new SheetError('De opgeslagen analyse kon niet worden bevestigd.')
 if(!record.manager||!stepAvailable('risk',record.workflow,record.risk_reviews,record.concert_id)||!['visitors','artist'].every(f=>{const factor=f as 'visitors'|'artist';return record.workflow[factor]?.score_review&&requiredReviewFields(factor).every(field=>record.workflow[factor]?.fields?.[field.id]?.completed_at)}))throw new ReportError('Rond eerst alle analyseonderwerpen en scores af. Er is nog geen PDF gemaakt.')
 const date=/_GASHOUDER_(\d{2})(\d{2})(\d{4})(?:_\d{4})?$/.exec(input.concert_id)!
 const show=context.show
 if(!show||typeof show.artist!=='string'||!show.artist.trim()||show.artist.length>150||show.venue!=='Gashouder'||show.date!==`${date[3]}-${date[2]}-${date[1]}`)throw new SheetError('De showgegevens voor de PDF ontbreken. Vernieuw eerst de concertagenda en probeer opnieuw.')
 const file_name=reportFileName(show)
 let committed:unknown
 if(context.existing){committed=await send({action:'report',op:'commit',concert_id:input.concert_id,revision:context.revision,version:context.version,file_name})}
 else{
  const key=context.resource_key||input.setup_key||'',assets=await builders.assets(key)
  let pdf:Buffer
  try{pdf=await builders.render(record,assets,context.version,show,{fitText:true})}catch(cause){if(cause instanceof ReportError)throw cause;console.error('Final report layout failure',{name:cause instanceof Error?cause.name:'UnknownError'});throw new ReportError('De PDF kon niet worden opgebouwd met de opgeslagen analyse (stap: documentopmaak). Je ingevulde gegevens zijn behouden.')}
  if(pdf.length>2*1024*1024)throw new ReportError('De PDF is groter dan de opslaglimiet van 2 MB. Er is niets afgerond.')
  committed=await send({action:'report',op:'commit',concert_id:input.concert_id,revision:context.revision,version:context.version,file_name,pdf_base64:pdf.toString('base64'),...(context.resource_key?{}:{resource_key:key})})
 }
 let result:ReturnType<typeof parseOperationRecord>
 try{result=parseOperationRecord((committed as {record?:unknown}).record)}catch{throw new SheetError('De bevestiging van de opgeslagen PDF kon niet worden ingelezen. De PDF kan al in de showmap staan. Herlaad de show voordat je opnieuw probeert.')}
 if(result.concert_id!==input.concert_id||!result.workflow.risk?.completed_at||result.workflow.risk.report?.revision!==context.revision)throw new SheetError('De PDF-opslag is niet bevestigd. Probeer opnieuw; een al opgeslagen versie wordt hergebruikt.')
 return {record:result}
}
