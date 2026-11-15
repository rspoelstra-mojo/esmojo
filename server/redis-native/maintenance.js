import {createRedisPolicy} from './policy.js';
import {createRedisCleanup} from './cleanup.js';
export function createRedisMaintenance({env=process.env,policy=createRedisPolicy({env}),cleanup=createRedisCleanup({env})}={}){return async()=>{if((await policy.read()).value.mode!=='dataverse')return{skipped:true};return cleanup();};}
