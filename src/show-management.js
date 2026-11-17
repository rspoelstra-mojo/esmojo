import './show-management.css';
import {createShowManagementCards} from './show-management-view.js';
export function createShowManagement(container,{show,request,data,readOnly=false}){
 const showData=data,sentFormat=new Intl.DateTimeFormat('nl-NL',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Amsterdam'});
 const ui=createShowManagementCards();container.append(ui.row);let disposed=false,busy=false,reloadAfterBusy=false,sending=false;const controller=new AbortController();
 const call=operation=>request('show-management',{method:'POST',body:{concertId:show.key,operation},signal:controller.signal});
 const element=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;node.textContent=text;return node;};
 const icons={copy:'<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>',check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',send:'<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>'};
 const icon=name=>{const span=document.createElement('span');span.className='show-management-action-icon';span.setAttribute('aria-hidden','true');span.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;return span;};
 const action=(tag,label,iconName,primary)=>{const node=document.createElement(tag);node.className='show-management-action'+(primary?' is-primary':'');const text=document.createElement('span');text.textContent=label;node.append(icon(iconName),text);if(tag==='button')node.type='button';return{node,text};};
 function display(data){
  if(disposed)return;ui.body.replaceChildren();
  // De planning toont alleen een door de server bevestigde verzending (per huidige PDF-revisie).
  showData?.setProfileSent?.(data.available&&data.canSend===true?data.sentAt:null);
  // Showbeheer wordt automatisch aangemaakt zodra een Gashouder-show in het showmenu staat (45 dagen vooruit).
  if(!data.available){ui.body.append(element('p','show-management-state','Showbeheer wordt automatisch aangemaakt zodra de show in het showmenu staat, 45 dagen voor de show.'));return;}
  const url=new URL(data.url);if(url.origin!=='https://esmojo.nl'||url.pathname!=='/showbeheer/'||!/^#[a-f0-9]{64}$/.test(url.hash)||!/^\d{6}$/.test(data.pin))throw Error('De Showbeheer-toegang kon niet worden bevestigd.');
  const pinSection=element('div','show-management-pin-section'),digits=element('div','show-management-pin-digits','');digits.setAttribute('role','img');digits.setAttribute('aria-label','Pincode '+data.pin.split('').join(' '));
  for(const digit of data.pin)digits.append(element('span','show-management-pin-digit',digit));
  pinSection.append(element('h3','show-management-label','Pincode'),digits);
  const footer=element('div','show-management-footer'),actions=element('div','show-management-actions');
  const copy=action('button','Link kopiëren','copy',false);
  copy.node.onclick=async()=>{try{await navigator.clipboard.writeText(data.url);if(!disposed){copy.text.textContent='Gekopieerd';copy.node.querySelector('svg').innerHTML=icons.check;setTimeout(()=>{if(!disposed){copy.text.textContent='Link kopiëren';copy.node.querySelector('svg').innerHTML=icons.copy;}},2000);}}catch{window.prompt('Kopieer de Showbeheer-link:',data.url);}};
  actions.append(copy.node);
  const note=element('p','profile-message show-management-note','');note.setAttribute('role','alert');note.hidden=true;
  if(data.canSend===true&&!readOnly){
   const send=action('a','Verzenden','send',true);send.node.href='mailto:?body='+encodeURIComponent(data.pin+'\r\n'+data.url);
   // De mailto opent het mailprogramma; de registratie legt vast dat de knop is gebruikt (geen verzendbevestiging).
   send.node.onclick=()=>{if(sending||disposed)return;sending=true;note.hidden=true;void call('sent').then(result=>{if(!disposed)display(result);}).catch(()=>{if(!disposed){note.textContent='De verzending kon niet worden vastgelegd. Gebruik Verzenden opnieuw.';note.hidden=false;}}).finally(()=>{sending=false;});};
   actions.append(send.node);
  }else{const send=action('button','Verzenden','send',true);send.node.disabled=true;send.node.title=readOnly?'Niet beschikbaar in deze alleen-lezen weergave.':'Beschikbaar zodra het showprofiel gereed is.';actions.append(send.node);}
  footer.append(actions);
  if(data.canSend===true&&typeof data.sentAt==='string'&&Number.isFinite(Date.parse(data.sentAt)))footer.append(element('p','show-management-sent','Showprofiel verzonden op '+sentFormat.format(new Date(data.sentAt))+'.'));
  footer.append(note);ui.body.append(pinSection,footer);
 }
 function error(failure,retry){if(disposed)return;const message=element('p','profile-message',failure.message||'Showbeheer kon niet worden geladen.');message.setAttribute('role','alert');const button=element('button','secondary-button','Opnieuw proberen');button.type='button';button.onclick=retry;ui.body.replaceChildren(message,button);}
 async function load(){if(disposed)return;if(busy){reloadAfterBusy=true;return;}busy=true;try{const data=await call('status');if(!disposed)display(data);}catch(failure){if(!disposed)error(failure,()=>void load());}finally{busy=false;if(reloadAfterBusy&&!disposed){reloadAfterBusy=false;void load();}}}
 void load();
 let stateKey=null;const unsubscribe=readOnly?null:data?.subscribe?.(()=>{const next=JSON.stringify(data.planningSnapshot?.().pdf||null);if(next!==stateKey){stateKey=next;void load();}});
 return()=>{unsubscribe?.();disposed=true;controller.abort();ui.row.remove();};
}
