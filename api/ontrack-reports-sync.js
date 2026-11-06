import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createOnlineReportMailService} from '../server/online-report-mail.js';
import {createOnTrackReportStore,createOnTrackReportService} from '../server/ontrack-report/service.js';
export const config={maxDuration:300};
export function makeOnTrackReportsSyncHandler({identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/ontrack-reports-sync',workflow:'ontrack-reports.yml'}),service=createOnTrackReportService(),online=null}={}){
 return async(req,res)=>{res.setHeader('Cache-Control','no-store, private');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}try{if(online)await online.run();const result=await service.run();return res.status(200).json({ok:result.ok===true,...(result.blocked==='ONTRACK_ICON_MISSING'?{blocked:'ONTRACK_ICON_MISSING'}:{})});}catch{return res.status(503).json({error:'Rapportverwerking is niet bevestigd. Bronnen en eerdere rapporten blijven behouden.'});}};
}
export default isolateFluidApi(makeOnTrackReportsSyncHandler({online:createOnlineReportMailService({store:createOnTrackReportStore()})}));
