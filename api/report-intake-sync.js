import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createReportIntakePublisher} from '../server/report-intake/publish.js';
import {createReportIntakeRepository} from '../server/report-intake/repository.js';
import {createReportsWriter} from '../server/reports-migration/writer.js';
import {createConcertCatalogue} from '../server/concert-catalogue.js';
import {createShowsStore} from '../server/shows-store.js';
import {getMojoArtistPhotoResult} from '../server/mojo-photo.js';
import {createArtistAliases} from '../server/dataverse-shows/artist-alias.js';
import {createNativeShowsRepository} from '../server/dataverse-shows/repository.js';
export const config={maxDuration:300};
const audience='https://esmojo.nl/api/report-intake-sync';
// Fixed machine route: GitHub OIDC from main + report-intake.yml only. No input
// is accepted; the worker processes received CSV receipts and returns counts and
// closed status codes only (no file names, incidents or identifiers).
export function makeReportIntakeSync({identify=token=>verifyImportIdentity(token,{audience,workflow:'report-intake.yml'}),publisher=null}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}
  try{
   if(req.body&&Object.keys(req.body).length)throw Error('VALIDATION');
   publisher||=createReportIntakePublisher({repository:createReportIntakeRepository({readOnly:false}),catalogue:createConcertCatalogue({}),writer:createReportsWriter({}),aliases:()=>createArtistAliases({repo:createNativeShowsRepository({env:process.env})}).map(),photo:{capture:getMojoArtistPhotoResult,save:payload=>createShowsStore({env:{...process.env,SHOWS_STORAGE_PROVIDER:'dataverse'}})('artist-photo-save',payload)}});
   const result=await publisher.processPending({limit:3,deadline:Date.now()+240000});
   return res.status(200).json({ok:true,processed:result.processed,statuses:result.results.map(row=>row.status)});
  }catch(error){console.error('REPORT_INTAKE_SYNC_FAILED',{code:/^[A-Z][A-Z_0-9]+$/.test(error.message)?error.message:'UNKNOWN'});return res.status(error.message==='VALIDATION'?400:503).json({ok:false,code:error.message==='VALIDATION'?'VALIDATION':'REPORT_INTAKE_UNAVAILABLE'});}
 };
}
export default isolateFluidApi(makeReportIntakeSync());
