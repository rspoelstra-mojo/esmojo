import {createOnlineReportMailService} from '../server/online-report-mail.js';
import {discoverReportSource} from '../server/report-source.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createOnTrackReportStore} from '../server/ontrack-report/service.js';
import {createWebCatalogueService} from '../server/web-report-catalogue.js';
export const config={maxDuration:300};
export function makeWebReportsSync({identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/web-reports-sync',workflow:'web-reports.yml'}),service=createWebCatalogueService({store:createOnTrackReportStore(),sourceLookup:discoverReportSource}),online=null}={}){
 return async(req,res)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}try{if(req.body?.historicalOnly===true){
    let result;for(let i=0;i<3;i++){result=await service.synchronize(null,{historicalOnly:true});if(!result.validated&&!result.invalid)break;}
    const status=await service.historicalStatus();return res.status(200).json({ok:status.invalid===0,...status});
   }await service.synchronize();if(online)await online.run();return res.status(200).json({ok:true});}catch{return res.status(503).json({error:'Webrapportage-inventarisatie niet bevestigd.'});}};
}
export default isolateFluidApi(makeWebReportsSync({online:createOnlineReportMailService({store:createOnTrackReportStore()})}));
