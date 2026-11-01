import {parseOperationRecord} from '../src/operations.ts'
import type {ReportShow} from '../src/report-show.ts'
import {requestSheet,SheetError} from './google-sheets.ts'
import {createReportPdf,reportAssets,ReportError} from './report-pdf.ts'
export async function createPusciferPreview(send:typeof requestSheet=requestSheet,builders={assets:reportAssets,render:createReportPdf}){
 const context=await send({action:'report',op:'preview',concert_id:'PUSCIFER_GASHOUDER_05112026'}) as {record:unknown;version:number;show:ReportShow;resource_key:string}
 const record=parseOperationRecord(context.record)
 if(record.concert_id!=='PUSCIFER_GASHOUDER_05112026'||context.show?.artist!=='Puscifer'||context.show.venue!=='Gashouder'||context.show.date!=='2026-11-05'||!Number.isInteger(context.version)||context.version<1)throw new SheetError('De opgeslagen Puscifer-gegevens voor de proef konden niet worden bevestigd.')
 if(!record.manager||!record.workflow.visitors?.fields||!record.workflow.artist?.fields)throw new ReportError('Sla eerst de bezoekers- en artiestanalyse van Puscifer op.')
 const assets=await builders.assets(context.resource_key)
 return builders.render(record,assets,context.version,context.show,{visitorDataProof:true,twoPageProof:true})
}

/** Read-only proof of tighter spacing; does not finalize or replace a stored report. */
export async function createCompactPreview(send:typeof requestSheet=requestSheet,builders={assets:reportAssets,render:createReportPdf}){
 const concertId='BUITEN_WESTEN_GASHOUDER_06112026'
 const context=await send({action:'report',op:'context',concert_id:concertId}) as {record:unknown;version:number;show:ReportShow;resource_key:string}
 const record=parseOperationRecord(context.record)
 if(record.concert_id!==concertId||context.show?.artist!=='Buiten Westen'||context.show.venue!=='Gashouder'||context.show.date!=='2026-11-06'||!Number.isInteger(context.version)||context.version<1)throw new SheetError('De opgeslagen showgegevens voor de proef konden niet worden bevestigd.')
 const assets=await builders.assets(context.resource_key)
 return builders.render(record,assets,context.version,context.show,{visitorDataProof:true,twoPageProof:true,compactProof:true})
}

/** Read-only Overmono proof with additional pages; never replaces the official PDF. */
export async function createFlowPreview(send:typeof requestSheet=requestSheet,builders={assets:reportAssets,render:createReportPdf}){
 const concertId='OVERMONO_GASHOUDER_11112026'
 const context=await send({action:'report',op:'context',concert_id:concertId}) as {record:unknown;version:number;show:ReportShow;resource_key:string}
 const record=parseOperationRecord(context.record)
 if(record.concert_id!==concertId||context.show?.artist!=='Overmono'||context.show.venue!=='Gashouder'||context.show.date!=='2026-11-11'||!Number.isInteger(context.version)||context.version<1)throw new SheetError('De opgeslagen Overmono-gegevens voor de proef konden niet worden bevestigd.')
 const assets=await builders.assets(context.resource_key)
 return builders.render(record,assets,context.version,context.show,{visitorDataProof:true,twoPageProof:true,flowProof:true})
}

/** Read-only two-page Overmono proof; only the analysis prose size adapts. */
export async function createFitTextPreview(send:typeof requestSheet=requestSheet,builders={assets:reportAssets,render:createReportPdf}){
 const concertId='OVERMONO_GASHOUDER_11112026'
 const context=await send({action:'report',op:'context',concert_id:concertId}) as {record:unknown;version:number;show:ReportShow;resource_key:string}
 const record=parseOperationRecord(context.record)
 if(record.concert_id!==concertId||context.show?.artist!=='Overmono'||context.show.venue!=='Gashouder'||context.show.date!=='2026-11-11'||!Number.isInteger(context.version)||context.version<1)throw new SheetError('De opgeslagen Overmono-gegevens voor de proef konden niet worden bevestigd.')
 const assets=await builders.assets(context.resource_key)
 return builders.render(record,assets,context.version,context.show,{visitorDataProof:true,twoPageProof:true,fitText:true})
}
