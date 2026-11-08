import {createIncidentMetricsService} from '../server/incident-metrics.js';
import {createShowsStore} from '../server/shows-store.js';
import {createHistoricalImporter,createHistoricalImportVerifier} from '../server/historical-import.js';
import {createOnlineReportMailService} from '../server/online-report-mail.js';
import {discoverReportSource} from '../server/report-source.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createOnTrackReportStore} from '../server/ontrack-report/service.js';
import {createWebCatalogueService} from '../server/web-report-catalogue.js';
export const config={maxDuration:300};
export function makeWebReportsSync({identify=(token,{metricsOnly=false}={})=>verifyImportIdentity(token,{audience:metricsOnly?'https://esmojo.nl/api/incident-references-sync':'https://esmojo.nl/api/web-reports-sync',workflow:'web-reports.yml'}),service=createWebCatalogueService({store:createOnTrackReportStore(),sourceLookup:discoverReportSource}),online=null,metrics=null,verifier=createHistoricalImportVerifier({store:createOnTrackReportStore()}),importer=createHistoricalImporter({store:createOnTrackReportStore()})}={}){
 return async(req,res)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1],{metricsOnly:req.query?.incidentMetrics==='1'});}catch{return res.status(403).json({error:'Geen toegang.'});}try{if(req.query?.incidentMetrics==='1'&&req.body?.incidentRefresh!==true)throw Error('VALIDATION');if(req.body?.incidentRefresh===true){
    if(!metrics||Object.keys(req.body).some(key=>!['incidentRefresh','checkOnly'].includes(key))||req.body.checkOnly!==undefined&&typeof req.body.checkOnly!=='boolean')throw Error('VALIDATION');
    return res.status(200).json(await metrics.refresh({checkOnly:req.body.checkOnly===true}));
   }if(req.body?.historicalVerify===true){
    if(Object.keys(req.body).some(key=>!['historicalVerify','batch','phase','offset'].includes(key)))throw Error('VALIDATION');
    return res.status(200).json(await verifier({batch:req.body.batch,phase:req.body.phase,offset:req.body.offset}));
   }if(req.body?.historicalImport===true){
    if(Object.keys(req.body).some(key=>!['historicalImport','batch','phase'].includes(key)))throw Error('VALIDATION');
    return res.status(200).json(await importer({batch:req.body.batch,phase:req.body.phase}));
   }if(req.body?.historicalOnly===true){
    // Eén bestaande batch houdt de Drive-rondreizen ruim binnen de verzoeklimiet.
    await service.synchronize(null,{historicalOnly:true});
    const status=await service.historicalStatus();return res.status(200).json({ok:status.invalid===0,...status});
   }await service.synchronize();if(online)await online.run();return res.status(200).json({ok:true});}catch(error){
   const worker=req.body?.incidentRefresh===true||req.body?.historicalOnly===true||req.body?.historicalImport===true||req.body?.historicalVerify===true;
   const codes=['DUPLICATE_CONCERT','INVALID_TOTAL','INVALID_CONCERT','SHOWS_UNAVAILABLE','SHOWS_CONFIG','BUSY','DRIVE_TIMEOUT','DRIVE_CONNECTION','DRIVE_HTTP','DRIVE_RESPONSE','FORBIDDEN','VALIDATION','REPORT_CONFLICT','REPORT_CATALOG','SOURCE_MISSING','SOURCE_CHANGED','REPORT_UNAVAILABLE','NOT_FOUND','ONTRACK_REPORT_UNAVAILABLE'];
   const stages=['incident-read','incident-source','incident-counts','web-scan','web-source','web-commit','web-historical-status','historical-import-read','historical-import-commit','historical-import-verify'];
   const code=codes.includes(error.workerCode||error.message)?error.workerCode||error.message:'UNCONFIRMED',stage=stages.includes(error.workerOperation)?error.workerOperation:'UNKNOWN';
   return res.status(503).json({error:'Webrapportage-inventarisatie niet bevestigd.',...(worker?{code,stage}:{})});
  }};
}
export default isolateFluidApi(makeWebReportsSync({metrics:createIncidentMetricsService({shows:createShowsStore({active:false})}),online:createOnlineReportMailService({store:createOnTrackReportStore()})}));
