import './style.css';
import './accounts.css';
import './show-management.css';
import logo from './assets/ESMOJO-logo.svg?raw';
import {createShowManagementView} from './show-management-view.js';
import {bindShowManagementPin} from './lib/show-management-pin.js';
const preference=window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme=()=>{document.documentElement.dataset.theme=preference.matches?'dark':'light';};applyTheme();preference.addEventListener('change',applyTheme);
const view=createShowManagementView({logo});document.querySelector('#show-management-root').append(view.root);
const link=location.hash.slice(1);
if(!/^[a-f0-9]{64}$/.test(link)){
 view.message.textContent='Deze Showbeheer-link is niet geldig. Vraag de Event Safety Manager om de juiste link.';view.submit.disabled=true;for(const input of view.inputs)input.disabled=true;
}else{
 bindShowManagementPin(view,{open:async pin=>{
  const response=await fetch('/api/show-management',{method:'POST',credentials:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'open',link,pin})});
  let result;try{result=await response.json();}catch{throw Error('Showbeheer is tijdelijk niet beschikbaar. Probeer opnieuw.');}
  if(!response.ok||result.available!==true)throw Error(result.error||'Showbeheer kon niet worden geopend.');
 }});
}
