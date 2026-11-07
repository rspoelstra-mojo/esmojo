import {hasModule,moduleFingerprint} from '../../shared/account-modules.js';
import {barrierReferenceManifest} from '../../shared/barrier-reference-manifest.js';
// Alleen sessiegeheugen; elke account-/rechtenwissel wist en revokeert alle beelden.
export function createBarrierReferenceCache({request,manifest=barrierReferenceManifest,createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}){
 let scope=null,generation=0;const entries=new Map();
 function clear(){generation++;for(const entry of entries.values())if(entry.url)revokeUrl(entry.url);entries.clear();}
 return{
  bind(profile){const next=profile?.activated&&hasModule(profile,'shows')?profile.id+':'+profile.role+':'+moduleFingerprint(profile):null;if(scope!==next){clear();scope=next;}},
  clear(){clear();scope=null;},
  async load(type){
   if(!scope||!Object.hasOwn(manifest,type))throw Error('FORBIDDEN');
   if(entries.has(type))return entries.get(type).promise;
   const ticket=generation,entry={url:null,promise:null};
   entry.promise=Promise.resolve().then(()=>request(type)).then(data=>{
    if(ticket!==generation||!scope)throw Error('SESSION_CHANGED');
    const expected=manifest[type];if(data?.type!==type||data.mime!=='image/png'||data.sha256!==expected.sha256||typeof data.base64!=='string'||data.base64.length!==Math.ceil(expected.size/3)*4)throw Error('ATTACHMENT_INVALID');
    const bytes=Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0));if(bytes.length!==expected.size)throw Error('ATTACHMENT_INVALID');
    entry.url=createUrl(new Blob([bytes],{type:'image/png'}));return entry.url;
   }).catch(error=>{if(entries.get(type)===entry)entries.delete(type);throw error;});entries.set(type,entry);return entry.promise;
  },
 };
}
