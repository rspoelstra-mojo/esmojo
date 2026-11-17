import './style.css';
import './accounts.css';
import './show-management.css';
import logo from './assets/ESMOJO-logo.svg?raw';
import {createShowManagementView,renderManagementDownload} from './show-management-view.js';
import {bindShowManagementPin} from './lib/show-management-pin.js';
const preference=window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme=()=>{document.documentElement.dataset.theme=preference.matches?'dark':'light';};applyTheme();preference.addEventListener('change',applyTheme);
const view=createShowManagementView({logo});document.querySelector('#show-management-root').append(view.root);
const link=location.hash.slice(1);
if(!/^[a-f0-9]{64}$/.test(link)){
 view.message.textContent='Deze Showbeheer-link is niet geldig. Vraag de Event Safety Manager om de juiste link.';view.submit.disabled=true;for(const input of view.inputs)input.disabled=true;
}else{
 let disposeDownload=()=>{},opening=0;
 const call=async(operation,extra={})=>{const response=await fetch('/api/show-management',{method:'POST',credentials:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,link,...extra})});if(operation==='download'&&response.ok){const blob=await response.blob();if(blob.type!=='application/pdf')throw Error('Download niet beschikbaar.');const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='Showprofiel.pdf';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}const result=await response.json();if(!response.ok||result.available!==true)throw Error(result.error||'Showbeheer kon niet worden geopend.');return result;};
 async function visible(result){const sequence=++opening;disposeDownload();disposeDownload=renderManagementDownload(view,result.pdf,{download:()=>call('download',{requestId:crypto.randomUUID()})});view.open();if(document.visibilityState==='hidden')await new Promise(done=>document.addEventListener('visibilitychange',function shown(){if(document.visibilityState!=='hidden'){document.removeEventListener('visibilitychange',shown);done();}}));await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));if(sequence===opening&&view.root.classList.contains('is-open'))try{await call('visit');}catch{try{await call('visit');}catch{/* Het tellingsprobleem geeft geen aanvullende downloadrechten. */}};}
 bindShowManagementPin(view,{open:async pin=>{const result=await call('open',{pin});await visible(result);}});
 void call('read').then(visible).catch(()=>{});
}
