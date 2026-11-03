import {validateMailingSnapshot,MAILING_SNAPSHOT_CODES} from './ontrack-concert-validation.js';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {scrapeMojo,calendarDate,addDays} from './mojo-agenda.js';
import {MAILING_VENUES} from './mojo-venues.js';
import {verifyImportIdentity} from './github-identity.js';
export const ONTRACK_CONCERT_AUDIENCE='https://esmojo.nl/api/ontrack-concerts-sync';

export function createMailingConcertsStore({env=process.env,request=fetch}={}){
  return async(operation,actor,payload={})=>{
    const url=env.GOOGLE_DRIVE_SCRIPT_URL,secret=env.GOOGLE_DRIVE_SHARED_SECRET;
    if(!url||!secret||secret.length<32)throw Error('MAILING_CONCERTS_UNAVAILABLE');
    const parsed=new URL(url);
    if(parsed.origin!=='https://script.google.com'||!/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname)||parsed.search||parsed.hash||parsed.username||parsed.password)throw Error('MAILING_CONCERTS_UNAVAILABLE');
    const body=JSON.stringify({operation,...(actor?{actor}:{}),...payload}),timestamp=Date.now(),nonce=randomBytes(16).toString('hex'),digest=createHash('sha256').update(body).digest('hex');
    const signature=createHmac('sha256',secret).update(`ontrack-concerts\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
    const response=await request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ontrack-concerts',timestamp,nonce,signature,body}),signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error('MAILING_CONCERTS_UNAVAILABLE');
    const result=await response.json();if(!result.ok)throw Error(['FORBIDDEN','MAILING_CONCERTS_FOLDER','MAILING_CONCERTS_REGISTER','MAILING_CONCERTS_SNAPSHOT','MAILING_CONCERTS_WRITE'].includes(result.code)?result.code:'MAILING_CONCERTS_UNAVAILABLE');return result.data;
  };
}
export async function scrapeMailingConcerts({scrape=scrapeMojo,now=new Date()}={}){
  // Beperkte parallelle zoekopdrachten, met dezelfde parser/termijn als Gashouder.
  const results=[];for(let i=0;i<MAILING_VENUES.length;i+=2)results.push(...await Promise.all(MAILING_VENUES.slice(i,i+2).map(venue=>scrape({venue:venue.id,now}).catch(error=>{const failure=Object.assign(new Error(['MOJO_FORMAT','MOJO_DATE','MOJO_PAGINATION','MOJO_ID_COLLISION','MOJO_UNAVAILABLE'].includes(error.message)?error.message:'MOJO_NETWORK'),{venue:venue.id});if(Number.isInteger(error.status))failure.sourceStatus=error.status;throw failure;}))));
  return {venues:MAILING_VENUES.map(venue=>venue.id),from:calendarDate(now),until:addDays(calendarDate(now),365),checkedAt:now.toISOString(),pages:results.reduce((sum,r)=>sum+r.pages,0),concerts:results.flatMap(r=>r.concerts)};
}
export function makeMailingConcertsSyncHandler({identify=token=>verifyImportIdentity(token,{audience:ONTRACK_CONCERT_AUDIENCE}),scrape=scrapeMailingConcerts,store=createMailingConcertsStore()}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
    try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.',code:'IMPORT_IDENTITY'});}
    let stage='source';
    try{const snapshot=await scrape();stage='validation';validateMailingSnapshot(snapshot);stage='storage';const result=await store('sync',null,{snapshot});return res.status(200).json({ok:true,...result,checkedAt:snapshot.checkedAt,pages:snapshot.pages});}
    catch(error){const codes=[...MAILING_SNAPSHOT_CODES,'MOJO_FORMAT','MOJO_DATE','MOJO_PAGINATION','MOJO_ID_COLLISION','MOJO_UNAVAILABLE','MOJO_NETWORK','FORBIDDEN','MAILING_CONCERTS_FOLDER','MAILING_CONCERTS_REGISTER','MAILING_CONCERTS_SNAPSHOT','MAILING_CONCERTS_WRITE'];return res.status(503).json({error:'OnTrack-concertimport mislukt. De vorige inventaris blijft beschikbaar.',stage,code:codes.includes(error.message)?error.message:'MAILING_CONCERTS_UNAVAILABLE',...(MAILING_VENUES.some(v=>v.id===error.venue)?{venue:error.venue}:{}),...(Number.isInteger(error.sourceStatus)?{sourceStatus:error.sourceStatus}:{})});}
  };
}
