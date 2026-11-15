import {createIncidentMetricsService} from '../server/incident-metrics.js';
import {createShowsStore} from '../server/shows-store.js';
import {createOnlineReportMailService} from '../server/online-report-mail.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createOnTrackReportStore} from '../server/ontrack-report/service.js';
export const config={maxDuration:300};
export function makeWebReportsSync({identify=(token,{metricsOnly=false}={})=>verifyImportIdentity(token,{audience:metricsOnly?'https://esmojo.nl/api/incident-references-sync':'https://esmojo.nl/api/web-reports-sync',workflow:'web-reports.yml'}),online=null,metrics=null}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1],{metricsOnly:req.query?.incidentMetrics==='1'});}catch{return res.status(403).json({error:'Geen toegang.'});}
  try{
   if(req.query?.incidentMetrics==='1'&&req.body?.incidentRefresh!==true)throw Error('VALIDATION');
   if(req.body?.incidentRefresh===true){if(!metrics||Object.keys(req.body).some(key=>!['incidentRefresh','checkOnly'].includes(key))||req.body.checkOnly!==undefined&&typeof req.body.checkOnly!=='boolean')throw Error('VALIDATION');return res.status(200).json(await metrics.refresh({checkOnly:req.body.checkOnly===true}));}
   if(req.body?.deliverExisting===true&&Object.keys(req.body).join(',')==='deliverExisting'&&online){await online.run();return res.status(200).json({ok:true});}
   return res.status(410).json({ok:false,code:'CSV_INTAKE_DISABLED'});
  }catch(error){const allowed=['VALIDATION','FORBIDDEN','INCIDENT_REFERENCES_NO_ELIGIBLE_REPORTS','SHOWS_UNAVAILABLE','REPORT_CONFLICT','ONTRACK_REPORT_UNAVAILABLE'];return res.status(503).json({error:'De bestaande verwerking kon niet worden bevestigd.',code:allowed.includes(error.workerCode||error.message)?error.workerCode||error.message:'UNCONFIRMED'});}
 };
}
export default isolateFluidApi(makeWebReportsSync({metrics:createIncidentMetricsService({shows:createShowsStore({active:false})}),online:createOnlineReportMailService({store:createOnTrackReportStore()})}));
