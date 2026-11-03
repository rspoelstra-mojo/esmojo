import {upcomingShows} from './mojo-agenda.js';
import {validUploadId} from '../shared/barrier-layout.js';
export const isFluidPreview=env=>env.VERCEL_ENV==='preview'||(env.VERCEL_ENV!=='production'&&env.ESMOJO_FLUID_PREVIEW==='1');
export function fluidPreviewOrigin(origin,env){return isFluidPreview(env)&&[env.VERCEL_URL,env.VERCEL_BRANCH_URL].filter(Boolean).some(host=>origin==='https://'+host);}
export function fluidAccountRead(action,method,body){
  return (action==='session'&&method==='GET')||(['restore','remember','forget'].includes(action)&&method==='POST')
    ||(action==='shows'&&method==='GET')||(action==='show-photo'&&method==='POST')||(action==='fluid-preview'&&method==='POST');
}
export function isolateFluidApi(handler,env=process.env){return(req,res)=>{if(isFluidPreview(env)){res.setHeader('Cache-Control','no-store, private');return res.status(403).json({error:'Deze testomgeving is uitsluitend alleen-lezen.'});}return handler(req,res);};}
export function createFluidPreviewService({shows,pdfService,now=()=>new Date()}){
  return async(input,actor)=>{
    const op=input?.operation,allowed=op==='attachment'?['operation','uploadId']:['operation'];
    if(!input||!['snapshot','download','attachment'].includes(op)||Object.keys(input).sort().join(',')!==allowed.sort().join(',')||(op==='attachment'&&!validUploadId(input.uploadId)))throw Error('VALIDATION');
    const index=await shows('list'),show=upcomingShows(index.concerts,now()).find(row=>row.name.toLowerCase()==='puscifer');
    if(!show)throw Error('NOT_FOUND');const concertId=show.key;
    if(op==='download')return pdfService.download(concertId);
    if(op==='attachment')return shows('barrier-download',{concertId,actor,uploadId:input.uploadId});
    // Deze vier bestaande reads schrijven niets. show-open en floor-read juist niet gebruiken.
    const results=await Promise.allSettled([
      shows('profile-read',{concertId}),shows('ticket-read',{concertId,actor}),
      shows('barrier-read',{concertId,actor}),shows('risk-view',{concertId}),
    ]);
    for(const result of results)if(result.status==='rejected')throw result.reason;
    const [profile,tickets,barrier,risks]=results.map(result=>result.value);
    const pdf=profile.finalization?.categories.visitors.completedAt&&profile.finalization?.categories.artist.completedAt?await pdfService.status(concertId):null;
    return{show,data:{profile,tickets,barrier,risks,pdf}};
  };
}
