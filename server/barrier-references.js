import {createBarrierDisplay} from './barrier-display.js';
import {createHash} from 'node:crypto';
import {barrierReferenceManifest} from '../shared/barrier-reference-manifest.js';
export function validateReferenceRequest(input){
 if(!input||Object.keys(input).join(',')!=='type'||!Object.hasOwn(barrierReferenceManifest,input.type))throw Error('VALIDATION');return input.type;
}
export function createBarrierReferenceService({shows,env=process.env,now=Date.now,manifest=barrierReferenceManifest,projection=env.VERCEL_ENV==='production'?createBarrierDisplay({env,manifest}):null}={}){
 const cache=new Map(),pending=new Map();
 return async(actor,input)=>{
  const type=validateReferenceRequest(input),saved=cache.get(type);
  if(!projection&&saved&&saved.until>now())return saved.value;
  if(pending.has(type))return pending.get(type);
  const build=async()=>{const value=await shows('reference-read',{type,actor}),expected=manifest[type];
  if(value?.type!==type||value.mime!=='image/png'||value.sha256!==expected.sha256||typeof value.base64!=='string'||value.base64.length!==Math.ceil(expected.size/3)*4)throw Error('ATTACHMENT_INVALID');
  const bytes=Buffer.from(value.base64,'base64');if(bytes.length!==expected.size||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('ATTACHMENT_INVALID');
  // Same pixels and dimensions, private response only; retain original provenance.
  const {default:sharp}=await import('sharp');
  const image=sharp(bytes,{limitInputPixels:25000000}),encoded=projection?await image.resize({width:768,height:768,fit:'inside',withoutEnlargement:true}).webp({quality:85,effort:4}).toBuffer():await image.webp({lossless:true,effort:4}).toBuffer();
  const result=projection||encoded.length<bytes.length?{...value,mime:'image/webp',base64:encoded.toString('base64'),size:encoded.length,encodedSha256:createHash('sha256').update(encoded).digest('hex')}:value;
  if(!projection)cache.set(type,{until:now()+15*60000,value:result});return result;};
  const task=(projection?(async()=>await projection.read(type)||projection.prepare(type,build))():build()).finally(()=>pending.delete(type));pending.set(type,task);return task;
 };
}
