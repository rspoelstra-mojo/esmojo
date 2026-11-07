import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {readSessionCookie,sessionDeadline} from './session-cookie.js';
const NAME='__Host-esmojo-mfa',key=env=>createHash('sha256').update('esmojo-mfa-cookie-v1\0'+env.SUPABASE_SECRET_KEY).digest();
export const mfaGuardEnabled=env=>env.MFA_REPLAY_ENABLED==='true';
export function issueMfaCookie(res,claims,env,now=Date.now()){
 if(typeof claims.sub!=='string'||typeof claims.session_id!=='string'||claims.aal!=='aal2')throw Error('MFA_INVALID_RESPONSE');
 const expiresAt=Math.min(sessionDeadline(claims)||now+15*60000,now+72*3600000);if(expiresAt<=now)throw Error('MFA_INVALID_RESPONSE');
 const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(env),nonce),bytes=Buffer.concat([cipher.update(JSON.stringify({userId:claims.sub,sessionId:claims.session_id,expiresAt})),cipher.final()]),value=Buffer.concat([nonce,cipher.getAuthTag(),bytes]).toString('base64url');
 res.setHeader('Set-Cookie',`${NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor((expiresAt-now)/1000)}; Expires=${new Date(expiresAt).toUTCString()}`);
}
export function hasAppMfa(req,env,claims,now=Date.now()){
 if(!mfaGuardEnabled(env))return true;
 // Bestaande serverversleutelde 72u-sessies zijn al ná MFA uitgegeven.
 const remembered=readSessionCookie(req,env,now);if(remembered?.userId===claims.sub)return true;
 try{const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(NAME+'='))?.slice(NAME.length+1);if(!value||value.length>2000)return false;const bytes=Buffer.from(value,'base64url'),decipher=createDecipheriv('aes-256-gcm',key(env),bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));const proof=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]));return proof.userId===claims.sub&&proof.sessionId===claims.session_id&&typeof claims.session_id==='string'&&Number.isFinite(proof.expiresAt)&&proof.expiresAt>now;}catch{return false;}
}
export function clearMfaCookie(req,res,env){
 if(!mfaGuardEnabled(env)&&!(req.headers.cookie||'').includes(NAME+'='))return;
 const previous=res.getHeader?.('Set-Cookie')??res.headers?.['Set-Cookie'];const cookie=`${NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
 res.setHeader('Set-Cookie',[...(previous?(Array.isArray(previous)?previous:[previous]):[]),cookie]);
}
