import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';

// Atomair op de primaire Redis-node. Geen Drive-I/O voor afgewezen verkeer.
// De globale registratiegrens + korte pending-TTL voorkomen registeruitputting.
export const OAUTH_LIMITS={register:{ip:3,global:6},authorize:{ip:30,global:180},token:{ip:30,global:180}};
export const OAUTH_WINDOW_SECONDS=60;
export const OAUTH_LIMIT_SCRIPT=`
 local retry=0
 for i=1,#KEYS do
  local count=tonumber(redis.call('GET',KEYS[i]) or '0')
  if count>=tonumber(ARGV[i]) then retry=math.max(retry,redis.call('TTL',KEYS[i]),1) end
 end
 if retry>0 then return retry end
 for i=1,#KEYS do
  if redis.call('INCR',KEYS[i])==1 then redis.call('EXPIRE',KEYS[i],ARGV[#KEYS+1]) end
 end
 return 0`;

export function createOAuthAbuseGuard({env=process.env,request=fetch}={}){
 return async(req,action)=>{
  const limit=OAUTH_LIMITS[action];if(!limit)return;
  const ip=env.VERCEL==='1'?req.headers['x-forwarded-for']:req.socket?.remoteAddress;
  const token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
  const secret=env.GOOGLE_DRIVE_SHARED_SECRET;
  let url;try{url=new URL(env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL);}catch{throw Error('OAUTH_GUARD_UNAVAILABLE');}
  if(!isIP(ip||'')||!secret||secret.length<32||!token||url.protocol!=='https:'||!url.hostname.endsWith('.upstash.io')||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw Error('OAUTH_GUARD_UNAVAILABLE');
  // Alleen kortlevende tellers met HMAC-IP; geen adressen/tokens/clientgegevens.
  const fingerprint=createHmac('sha256',secret).update(JSON.stringify(['oauth-abuse-v1',ip])).digest('hex');
  const keys=[`oauth:v1:{${action}}:ip:${fingerprint}`,`oauth:v1:{${action}}:global`];
  let retry;
  try{
   const response=await request(url.origin,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',OAUTH_LIMIT_SCRIPT,2,...keys,limit.ip,limit.global,OAUTH_WINDOW_SECONDS]),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)});
   if(!response.ok)throw Error();const data=await response.json();retry=data.result;
   if(data.error||!Number.isSafeInteger(retry)||retry<0||retry>OAUTH_WINDOW_SECONDS)throw Error();
  }catch{throw Error('OAUTH_GUARD_UNAVAILABLE');}
  if(retry)throw Object.assign(Error('OAUTH_RATE_LIMIT'),{retryAfter:retry});
 };
}
