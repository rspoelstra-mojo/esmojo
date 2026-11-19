import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createOnlineReportMailService} from '../server/online-report-mail.js';
import {createOnTrackReportStore} from '../server/ontrack-report/service.js';
export const config={maxDuration:300};
// Alleen de showrapportagemail (elke 15 minuten via ontrack-reports.yml), plus twee vaste beheeracties op de technische
// coördinatie van Rapportages: `inspect` (alleen lezen) en `recover` (heft een blijvende onzekerheidsfence op wanneer
// dat veilig is). De oude OnTrack-/Drive-PDF-verwerking is uitgefaseerd. Bij een fout alleen een vast codewoord;
// nooit providerberichten, ontvangers of inhoud.
const actions=new Set(['inspect','recover']);
export function makeOnTrackReportsSyncHandler({identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/ontrack-reports-sync',workflow:'ontrack-reports.yml'}),online=null,coordinator=null}={}){
 return async(req,res)=>{res.setHeader('Cache-Control','no-store, private');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}
  const body=req.body,plain=body!==null&&typeof body==='object'&&!Array.isArray(body),keys=plain?Object.keys(body):[],empty=body===undefined||body===null||plain&&!keys.length,action=plain&&keys.length===1&&keys[0]==='coordinator'&&actions.has(body.coordinator)?body.coordinator:null;
  if(!empty&&!action)return res.status(400).json({ok:false,code:'VALIDATION'});
  try{
   if(action){if(!coordinator)throw Error('MAIL_DELIVERY_UNAVAILABLE');return res.status(200).json({ok:true,...await coordinator(action)});}
   if(!online)throw Error('MAIL_DELIVERY_UNAVAILABLE');const result=await online.run();return res.status(200).json({ok:true,sent:Number.isSafeInteger(result?.sent)?result.sent:0});
  }catch(error){return res.status(503).json({ok:false,code:/^[A-Z][A-Z0-9_]{2,59}$/.test(error?.message||'')?error.message:'MAIL_DELIVERY_UNCONFIRMED'});}};
}
const store=createOnTrackReportStore();
export default isolateFluidApi(makeOnTrackReportsSyncHandler({online:createOnlineReportMailService({store}),coordinator:action=>store('coordinator-'+action,null)}));
