import {createLegacyArtistViews} from './redis-native/legacy-views.js';
import {createNativeArtistViews} from './redis-native/views.js';
import {createRedisPolicy,managedRedis} from './redis-native/policy.js';
export {ARTIST_VIEW_SECONDS,validArtistViewEvent,RECORD_ARTIST_VIEW,READ_ARTIST_VIEWS} from './redis-native/legacy-views.js';
export function createArtistViews({env=process.env,request=fetch,legacy=createLegacyArtistViews({env,request}),native=createNativeArtistViews({env}),policy=createRedisPolicy({env})}={}){
 if(!managedRedis(env))return legacy;
 return{async record(...args){const {value}=await policy.read();if(value.mode==='freeze')throw Error('ARTIST_VIEWS_FROZEN');if(value.mode==='legacy'&&(env.VERCEL_ENV==='production'||env.REDIS_STORAGE_PROVIDER==='dataverse'||await legacy.frozen()))throw Error('ARTIST_VIEWS_FROZEN');return(value.mode==='dataverse'?native:legacy).record(...args);},async counts(){const {value}=await policy.read();if(value.mode==='legacy'&&(env.VERCEL_ENV==='production'||env.REDIS_STORAGE_PROVIDER==='dataverse'||await legacy.frozen()))throw Error('ARTIST_VIEWS_FROZEN');return(value.mode==='dataverse'?native:legacy).counts();}};
}
