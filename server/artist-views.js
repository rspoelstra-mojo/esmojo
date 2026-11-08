import {validArtistId} from '../shared/artist-catalogue.js';
export const ARTIST_VIEW_SECONDS=31*24*60*60;
export const validArtistViewEvent=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const INDEX='artists:v1:{views}:index',EVENT='artists:v1:{views}:event:';
export const RECORD_ARTIST_VIEW=`
 local clock=redis.call('TIME') local now=tonumber(clock[1])*1000+math.floor(tonumber(clock[2])/1000)
 local previous=redis.call('GET',KEYS[2])
 if previous then if previous~=ARGV[1] then return -1 end return 0 end
 redis.call('SET',KEYS[2],ARGV[1],'EX',ARGV[3])
 redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',now-tonumber(ARGV[3])*1000)
 redis.call('ZADD',KEYS[1],now,ARGV[2]) redis.call('EXPIRE',KEYS[1],ARGV[3]) return 1`;
// The event's artist association has its own exact TTL. The time index contains
// only random IDs, is pruned on access and expires when there is no activity.
export const READ_ARTIST_VIEWS=`
 local clock=redis.call('TIME') local now=tonumber(clock[1])*1000+math.floor(tonumber(clock[2])/1000)
 redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',now-tonumber(ARGV[1])*1000)
 return redis.call('ZRANGEBYSCORE',KEYS[1],'-inf','+inf')`;
export function createArtistViews({env=process.env,request=fetch}={}){
 function config(){let url;try{url=new URL(env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL);}catch{throw Error('ARTIST_VIEWS_UNAVAILABLE');}const token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;if(url.protocol!=='https:'||!url.hostname.endsWith('.upstash.io')||url.pathname!=='/'||url.search||url.hash||url.username||url.password||!token)throw Error('ARTIST_VIEWS_UNAVAILABLE');return{url:url.origin,token};}
 async function commands(body,pipeline=false){const {url,token}=config();try{const response=await request(url+(pipeline?'/pipeline':''),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)});if(!response.ok)throw Error();const data=await response.json(),rows=pipeline?data:[data];if(!Array.isArray(rows)||rows.some(row=>row.error||!Object.hasOwn(row,'result')))throw Error();return pipeline?rows.map(row=>row.result):data.result;}catch{throw Error('ARTIST_VIEWS_UNAVAILABLE');}}
 return{
  async record(id,eventId){if(!validArtistId(id)||!validArtistViewEvent(eventId))throw Error('VALIDATION');const result=await commands(['EVAL',RECORD_ARTIST_VIEW,2,INDEX,EVENT+eventId,id,eventId,ARTIST_VIEW_SECONDS]);if(result===-1)throw Error('VALIDATION');if(result!==0&&result!==1)throw Error('ARTIST_VIEWS_UNAVAILABLE');return{recorded:result===1};},
  async counts(){
   const ids=await commands(['EVAL',READ_ARTIST_VIEWS,1,INDEX,ARTIST_VIEW_SECONDS]);if(!Array.isArray(ids)||ids.some(id=>!validArtistViewEvent(id)))throw Error('ARTIST_VIEWS_UNAVAILABLE');
   const counts=new Map();
   // Bounded batches keep large histories out of a long-running Redis Lua loop.
   for(let start=0;start<ids.length;start+=5000){const chunks=[];for(let i=start;i<Math.min(start+5000,ids.length);i+=500)chunks.push(['MGET',...ids.slice(i,Math.min(i+500,start+5000)).map(id=>EVENT+id)]);const rows=await commands(chunks,true);for(const batch of rows){if(!Array.isArray(batch))throw Error('ARTIST_VIEWS_UNAVAILABLE');for(const id of batch){if(id===null)continue;if(!validArtistId(id))throw Error('ARTIST_VIEWS_UNAVAILABLE');counts.set(id,(counts.get(id)||0)+1);}}}
   return [...counts].map(([id,views])=>({id,views}));
  },
 };
}
