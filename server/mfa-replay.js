import {createLegacyArtistViews} from './redis-native/legacy-views.js';
import {createLegacyMfaReplay} from './redis-native/legacy-mfa.js';
import {createNativeMfaReplay} from './redis-native/mfa.js';
import {createRedisPolicy,managedRedis} from './redis-native/policy.js';
export function createMfaReplay({env=process.env,request=fetch,legacy=createLegacyMfaReplay({env,request}),native=createNativeMfaReplay({env}),policy=createRedisPolicy({env}),sourceFrozen=()=>createLegacyArtistViews({env,request}).frozen()}={}){
 if(!managedRedis(env))return legacy;
 async function selected(){const {value}=await policy.read();if(value.mode==='dataverse')return native;if(value.mode==='freeze'||env.REDIS_STORAGE_PROVIDER==='dataverse'||await sourceFrozen())throw Error('MFA_CACHE_UNAVAILABLE');return legacy;}
 return{status:async()=>({provider:(await policy.read()).value.mode==='dataverse'?'dataverse':'redis'}),claim:async(...args)=>{try{return await(await selected()).claim(...args);}catch{throw Error('MFA_CACHE_UNAVAILABLE');}},health:async()=>{try{return await(await selected()).health();}catch{throw Error('MFA_CACHE_UNAVAILABLE');}}};
}
