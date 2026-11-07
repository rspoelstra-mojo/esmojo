import {verifyImportIdentity} from './github-identity.js';
import {createMfaReplay} from './mfa-replay.js';
import {createMfaVerification} from './mfa-verification.js';
import {mfaGuardEnabled,issueMfaCookie} from './mfa-cookie.js';
import {isFluidPreview,fluidPreviewOrigin} from './fluid-preview.js';
export function makeMfaHandler({env=process.env,request=fetch,verify=createMfaVerification({env}),replay=createMfaReplay({env}),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/mfa',workflow:'mfa-security-check.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store, private');res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;if(origin&&origin!=='https://esmojo.nl'&&origin!==env.APP_ORIGIN&&!fluidPreviewOrigin(origin,env))return res.status(403).json({code:'MFA_FORBIDDEN',error:'Geen toegang.'});
  if(isFluidPreview(env)&&['GET','POST'].includes(req.method)){
   // Alleen authenticatie via productie; geen Drive-/bedrijfswrites in previews.
   if(req.method==='POST'&&(!req.body||Object.keys(req.body).sort().join(',')!=='code,factorId'))return res.status(403).json({error:'Geen toegang.'});
   try{
    const upstream=await request('https://esmojo.nl/api/mfa',{method:req.method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{...(req.headers.authorization?{Authorization:req.headers.authorization}:{}),...(req.method==='POST'?{'Content-Type':'application/json'}:{})},...(req.method==='POST'?{body:JSON.stringify(req.body)}:{})});
    const data=await upstream.json();
    const cookie=upstream.headers.get('set-cookie');
    if(upstream.ok&&cookie?.startsWith('__Host-esmojo-mfa='))res.setHeader('Set-Cookie',cookie);
    return res.status(upstream.status).json(data);
   }catch{return res.status(503).json({code:'MFA_UNAVAILABLE',error:'De verificatiedienst is tijdelijk niet bereikbaar. Probeer het opnieuw.'});}
  }
  if(req.method==='GET')return res.status(200).json({mode:mfaGuardEnabled(env)?'redis':'direct'});
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Niet toegestaan.'});}
  if(isFluidPreview(env))return res.status(403).json({code:'MFA_FORBIDDEN',error:'Deze testomgeving is alleen-lezen.'});
  if(req.body?.operation==='health'){
   try{if(Object.keys(req.body).join(',')!=='operation')throw Error();await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}
   try{await replay.health();return res.status(200).json({ok:true,enabled:mfaGuardEnabled(env),redisReady:true,secretKeyReady:env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')===true});}catch{return res.status(503).json({ok:false,error:'MFA-cache niet bevestigd.'});}
  }
  try{const result=await verify(req);issueMfaCookie(res,result.claims,env);return res.status(200).json({session:result.session});}
  catch(error){const allowed=['MFA_DENIED','MFA_DISABLED','MFA_INVALID_CODE','MFA_SESSION_EXPIRED','MFA_RATE_LIMIT','MFA_REPLAY','MFA_BUSY'],code=allowed.includes(error.code)?error.code:'MFA_UNAVAILABLE',status=allowed.includes(code)?error.status:503;const messages={MFA_DENIED:'Deze verificatie is niet toegestaan. Neem contact op met de beheerder.',MFA_DISABLED:'De beveiligde verificatieroute is nog niet ingeschakeld.',MFA_INVALID_CODE:'Deze code is ongeldig of verlopen. Gebruik de huidige code uit je app.',MFA_SESSION_EXPIRED:'Je aanmelding is verlopen. Log opnieuw in.',MFA_RATE_LIMIT:'Te veel pogingen. Wacht even en probeer het opnieuw.',MFA_REPLAY:'Deze code is al gebruikt. Wacht op de volgende code uit je app.',MFA_BUSY:'Er wordt al een code gecontroleerd. Wacht even.',MFA_UNAVAILABLE:'De verificatiedienst is tijdelijk niet bereikbaar. Probeer het opnieuw.'};if(code==='MFA_RATE_LIMIT')res.setHeader('Retry-After','60');return res.status(status||503).json({code,error:messages[code]});}
 };
}
export default makeMfaHandler();
