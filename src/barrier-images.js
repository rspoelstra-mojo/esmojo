import {access} from './auth.js';
import {createBarrierReferenceCache} from './lib/barrier-reference-cache.js';
export const barrierReferenceCache=createBarrierReferenceCache({request:type=>access('barrier-reference',{method:'POST',body:{type}})});
export const loadBarrierImage=type=>barrierReferenceCache.load(type);
