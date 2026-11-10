import './show-management.css';
import {createShowManagementCards} from './show-management-view.js';
export function createShowManagement(container,{show,request,readOnly=false}){
 const ui=createShowManagementCards();container.append(ui.row);let disposed=false,busy=false;const controller=new AbortController();
 const call=operation=>request('show-management',{method:'POST',body:{concertId:show.key,operation},signal:controller.signal});
 const element=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;node.textContent=text;return node;};
 function display(data){
  if(disposed)return;ui.body.replaceChildren();ui.venue.hidden=!data.available;
  if(!data.available){ui.create.disabled=false;ui.body.append(ui.create);return;}
  const url=new URL(data.url);if(url.origin!=='https://esmojo.nl'||url.pathname!=='/showbeheer/'||!/^#[a-f0-9]{64}$/.test(url.hash)||!/^\d{6}$/.test(data.pin))throw Error('De Showbeheer-toegang kon niet worden bevestigd.');
  const linkRow=element('div','show-management-link-row',''),link=element('a','show-management-url',data.url);link.href=data.url;link.target='_blank';link.rel='noopener noreferrer';
  const copy=element('button','secondary-button','Kopieer URL');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(data.url);if(!disposed){copy.textContent='Gekopieerd';setTimeout(()=>{if(!disposed)copy.textContent='Kopieer URL';},2000);}}catch{window.prompt('Kopieer de Showbeheer-URL:',data.url);}};linkRow.append(link,copy);
  const pin=element('p','show-management-code','Pincode: ');pin.append(element('strong','',data.pin));
  const send=element('button','primary-button','Showbeheer verzenden');send.type='button';send.disabled=true;send.title='Verzenden wordt later toegevoegd.';
  ui.body.append(linkRow,pin,send);
 }
 function error(failure,retry){if(disposed)return;const message=element('p','profile-message',failure.message||'Showbeheer kon niet worden geladen.');message.setAttribute('role','alert');const button=element('button','secondary-button','Opnieuw proberen');button.type='button';button.onclick=retry;ui.body.replaceChildren(message,button);}
 async function load(){if(disposed||busy)return;busy=true;ui.create.disabled=true;ui.body.replaceChildren(element('p','show-management-state','Showbeheer laden…'));try{const data=await call('status');if(!disposed)display(data);}catch(failure){if(!disposed)error(failure,()=>void load());}finally{busy=false;}}
 ui.create.onclick=async()=>{
  if(busy||disposed||readOnly)return;busy=true;ui.create.disabled=true;
  const status=element('div','show-management-progress','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const first=element('p','','Showbeheer aanmaken…'),second=element('p','','Toegang controleren');second.className='show-management-step-pending';const progress=element('progress','','');progress.setAttribute('aria-label','Showbeheer aanmaken');status.append(first,second,progress);ui.body.replaceChildren(status);
  try{await call('create');if(disposed)return;first.textContent='Showbeheer aangemaakt';second.textContent='Toegang controleren…';second.className='';const data=await call('status');if(!data.available)throw Error('De Showbeheer-toegang is nog niet bevestigd. Probeer opnieuw.');if(!disposed)display(data);}
  catch(failure){error(failure,()=>void load());}finally{busy=false;}
 };
 if(readOnly){ui.create.disabled=true;ui.create.title='Niet beschikbaar in deze alleen-lezen weergave.';}else void load();
 return()=>{disposed=true;controller.abort();ui.row.remove();};
}
