import {access} from './auth.js';
import {describeIntakeReceipt} from './lib/intake-receipt.js';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function createReportIntakeCheck(container,{request=access}={}){
 let disposed=false,busy=false;
 const title=el('h2','Ontvangen CSV’s controleren'),intro=el('p','Leest de laatste ontvangsten alleen-lezen terug: bestand, grootte, controlegetal, CSV-opbouw en concertmatch. Er wordt niets gewijzigd of verwerkt en er worden geen inhoud of incidenten getoond.'),button=el('button','Ontvangsten controleren'),status=el('p'),list=el('ul');
 button.type='button';status.setAttribute('role','status');container.append(title,intro,button,status,list);
 button.onclick=async()=>{if(busy||disposed)return;busy=true;button.disabled=true;status.textContent='Ontvangsten worden gecontroleerd…';list.replaceChildren();
  try{const result=await request('report-intake-check',{method:'POST',body:{}});if(disposed)return;status.textContent=result.count?`${result.count} ontvangst(en) gecontroleerd.`:'Geen ontvangsten gevonden.';list.replaceChildren(...result.receipts.map(row=>el('li',describeIntakeReceipt(row))));}
  catch(error){if(!disposed)status.textContent=error.message||'De controle is niet gelukt. Er is niets gewijzigd.';}
  finally{busy=false;if(!disposed)button.disabled=false;}};
 return{dispose(){disposed=true;}};
}
