import {createArtistPerformance} from '../server/artist-performance.js';
import {createReportPerformance} from '../server/reports-performance.js';
import {createNativeRuntimeVerification,runtimeAuditStages} from '../server/native-runtime-verification.js';
import {createArtistRuntimeVerification} from '../server/artist-runtime-verification.js';
import {createIncidentMetricsService} from '../server/incident-metrics.js';
import {createShowsStore} from '../server/shows-store.js';
import {createOnlineReportMailService} from '../server/online-report-mail.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createOnTrackReportStore} from '../server/ontrack-report/service.js';
export const config={maxDuration:300};
export function makeWebReportsSync({identify=(token,{metricsOnly=false}={})=>verifyImportIdentity(token,{audience:metricsOnly?'https://esmojo.nl/api/incident-references-sync':'https://esmojo.nl/api/web-reports-sync',workflow:'web-reports.yml'}),online=null,metrics=null,verifyArtists=createArtistRuntimeVerification(),verifyRuntime=createNativeRuntimeVerification(),reportPerformance=createReportPerformance(),artistPerformance=createArtistPerformance()}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-ESMOJO-Artist-Runtime','13');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1],{metricsOnly:req.query?.incidentMetrics==='1'});}catch{return res.status(403).json({error:'Geen toegang.'});}
  try{
   if(req.query?.incidentMetrics==='1'&&['inventory','prepare','measure','baseline'].includes(req.body?.artistPerformance)&&Object.keys(req.body).join(',')==='artistPerformance')return res.status(200).json(await artistPerformance(req.body.artistPerformance));
   if(req.query?.incidentMetrics==='1'&&['inventory','prepare','measure','baseline'].includes(req.body?.reportPerformance)&&Object.keys(req.body).join(',')==='reportPerformance')return res.status(200).json(await reportPerformance(req.body.reportPerformance));
   if(req.query?.incidentMetrics==='1'&&runtimeAuditStages.includes(req.body?.runtimeVerify)&&Object.keys(req.body).join(',')==='runtimeVerify')return res.status(200).json(await verifyRuntime(req.body.runtimeVerify));
   if(req.query?.incidentMetrics==='1'&&req.body?.artistVerify===true&&Object.keys(req.body).join(',')==='artistVerify')return res.status(200).json(await verifyArtists());
   if(req.query?.incidentMetrics==='1'&&req.body?.incidentRefresh!==true)throw Error('VALIDATION');
   if(req.body?.incidentRefresh===true){if(!metrics||Object.keys(req.body).some(key=>!['incidentRefresh','checkOnly'].includes(key))||req.body.checkOnly!==undefined&&typeof req.body.checkOnly!=='boolean')throw Error('VALIDATION');return res.status(200).json(await metrics.refresh({checkOnly:req.body.checkOnly===true}));}
   if(req.body?.deliverExisting===true&&Object.keys(req.body).join(',')==='deliverExisting'&&online){await online.run();return res.status(200).json({ok:true});}
   return res.status(410).json({ok:false,code:'CSV_INTAKE_DISABLED'});
  }catch(error){const allowed=['ARTIST_OPENING_INVALID','ARTIST_OPENING_LIMIT','ARTIST_OPENING_UNCONFIRMED','ARTIST_OPENING_NOT_PREPARED','REDIS_CREDENTIALS_ACTIVE','BARRIER_DISPLAY_INVALID','BARRIER_DISPLAY_UNCONFIRMED','BARRIER_DISPLAY_LIMIT','BARRIER_DISPLAY_CONFIG','VALIDATION','FORBIDDEN','INCIDENT_REFERENCES_NO_ELIGIBLE_REPORTS','SHOWS_UNAVAILABLE','REPORT_CONFLICT','ONTRACK_REPORT_UNAVAILABLE','ARTIST_READ_UNCONFIRMED','ARTIST_PROFILE','ARTIST_RISK','ARTIST_CATALOGUE','NOT_FOUND','CONCERT_CATALOGUE_CONFLICT','DATAVERSE_SHOWS_CONFLICT','DATAVERSE_SHOWS_RESPONSE','INTEGRATION_RETIRED','INCIDENT_DAILY_CONFLICT','ACCOUNT_CORRUPT','SOURCE_CHANGED','REPORT_UNAVAILABLE','DATAVERSE_SHOWS_NOT_ACTIVE','REPORTS_NOT_ACTIVE','REDIS_AUTHORITY_INVALID','RUNTIME_AUDIT_UNCONFIRMED','REPORT_OPENING_NOT_PREPARED','REPORT_OPENING_LIMIT','REPORT_OPENING_UNCONFIRMED','READ_BATCH_INVALID','READ_BATCH_RESPONSE','READ_BATCH_UNAVAILABLE','TASK_STALE'];return res.status(503).json({error:'De bestaande verwerking kon niet worden bevestigd.',code:allowed.includes(error.workerCode||error.message)?error.workerCode||error.message:'UNCONFIRMED',...error.artistStage?{stage:error.artistStage}:{}});}
 };
}
export default isolateFluidApi(makeWebReportsSync({metrics:createIncidentMetricsService({shows:createShowsStore({active:false})}),online:createOnlineReportMailService({store:createOnTrackReportStore()})}));
