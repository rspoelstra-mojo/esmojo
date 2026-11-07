import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyImportIdentity} from './github-identity.js';
import {createShowsStore} from './shows-store.js';
import {createProfiles} from './account-profiles.js';
import {barrierReferenceManifest} from '../shared/barrier-reference-manifest.js';
import {isFluidPreview} from './fluid-preview.js';
export function makeSecurityMaintenance({env=process.env,identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/access?action=security-maintenance',workflow:'security-maintenance.yml'}),shows=createShowsStore({env,active:false}),profiles=createProfiles({env}),read=readFile,manifest=barrierReferenceManifest}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store, private');res.setHeader('X-Content-Type-Options','nosniff');
  if(isFluidPreview(env)||req.method!=='POST')return res.status(403).json({error:'Geen toegang.'});
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}
  if(!req.body||Object.keys(req.body).join(',')!=='operation'||req.body.operation!=='prepare')return res.status(400).json({error:'Ongeldig verzoek.'});
  try{
   const prepared=await profiles('security-prepare',undefined);if(!prepared.modulesExplicit||!prepared.identityPinned||!prepared.copyRecipientConfigured)throw Error('MIGRATION_UNCONFIRMED');
   let verified=0;
   for(const [type,expected]of Object.entries(manifest)){
    const bytes=await read(new URL('../src/assets/barrier-layouts/'+expected.fileName,import.meta.url));
    if(bytes.length!==expected.size||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('SOURCE_CHANGED');
    const result=await shows('reference-install',{type,sha256:expected.sha256,base64:bytes.toString('base64')});if(!result.verified||result.type!==type)throw Error('VERIFY');verified++;
   }
   return res.status(200).json({ok:true,modulesExplicit:true,identityPinned:true,copyRecipientConfigured:true,referencesVerified:verified});
  }catch{return res.status(503).json({ok:false,error:'Beveiligingsvoorbereiding niet bevestigd.'});}
 };
}
