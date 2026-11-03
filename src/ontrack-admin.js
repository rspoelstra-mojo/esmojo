import './ontrack-admin.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};

export function createOnTrackAdminView(content,submenuLink,{request=access}={}){
  let disposed=false,busy=false,data=null,selection=null,dirty=false;
  const loading=createSubmenuLoading(submenuLink,content),view=node('section','ontrack-view');content.replaceChildren(view);
  const title=node('h1','','OnTrack'),notice=node('p','ontrack-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const refresh=node('button','secondary-button','Actuele gegevens laden');refresh.type='button';refresh.onclick=()=>void load();
  const toolbar=node('div','ontrack-toolbar');toolbar.append(title,refresh);
  function status(text,error=false){notice.textContent=text;notice.className=error?'form-message':'ontrack-notice';notice.setAttribute('role',error?'alert':'status');}
  function render(){
    if(disposed||!data)return;
    const grid=node('div','ontrack-grid');
    for(const [label,value] of [["CSV’s ontvangen",data.received],["Omgezet naar rapportage",data.converted]]){
      const card=node('section','ontrack-card ontrack-stat');card.append(node('h2','',label),node('p','ontrack-value',new Intl.NumberFormat('nl-NL').format(value)));grid.append(card);
    }
    const latest=node('section','ontrack-card ontrack-reports');latest.append(node('h2','','Laatste 5 rapportages'));
    if(!data.latest.length)latest.append(node('p','ontrack-muted','Er zijn nog geen CSV’s omgezet naar PDF.'));
    else{
      const table=node('table','ontrack-table'),head=node('thead',''),hr=node('tr','');for(const label of ['CSV-bestand','Omgezet op','E-mail'])hr.append(node('th','',label));head.append(hr);table.append(head);
      const body=node('tbody','');for(const report of data.latest){const row=node('tr',''),email=node('td','');email.textContent=report.emailStatus==='sent'?'✓ Verzonden':report.emailStatus==='failed'?'Verzenden mislukt':'Nog niet verzonden';email.className=report.emailStatus==='sent'?'ontrack-sent':'';row.append(node('td','',report.name),node('td','',new Intl.DateTimeFormat('nl-NL',{dateStyle:'short',timeStyle:'short'}).format(new Date(report.convertedAt))),email);body.append(row);}table.append(body);latest.append(table);
    }
    latest.append(node('p','ontrack-muted','Automatische PDF-verwerking en verzending wachten op de rapportageprompt.'));grid.append(latest);
    const recipients=node('section','ontrack-card ontrack-recipients');recipients.append(node('h2','','Ontvangers'),node('p','ontrack-muted','Selecteer de accounts die de OnTrack-rapportages per e-mail moeten ontvangen.'));
    const form=node('form','ontrack-form'),fieldset=node('fieldset',''),legend=node('legend','visually-hidden','Ontvangeraccounts');fieldset.append(legend);fieldset.disabled=busy;
    const available=new Set(data.accounts.map(account=>account.id));
    for(const account of [...data.accounts,...[...selection].filter(id=>!available.has(id)).map(id=>({id,unavailable:true}))]){
      const label=node('label','ontrack-recipient'),check=node('input','');check.type='checkbox';check.value=account.id;check.checked=selection.has(account.id);
      const text=node('span',''),name=account.unavailable?'Account niet meer beschikbaar':[account.firstName,account.lastName].filter(Boolean).join(' ');text.append(node('span','',name));if(account.email)text.append(node('small','ontrack-muted',account.email));
      check.onchange=()=>{if(check.checked)selection.add(account.id);else selection.delete(account.id);dirty=true;status('');update();};label.append(check,text);fieldset.append(label);
    }
    if(!data.accounts.length)fieldset.append(node('p','ontrack-muted','Geen actieve accounts beschikbaar.'));
    const save=node('button','primary-button','Ontvangers opslaan');save.type='submit';
    function update(){save.disabled=busy||!dirty||[...selection].some(id=>!available.has(id));}
    form.onsubmit=async event=>{
      event.preventDefault();if(busy||save.disabled)return;
      busy=true;refresh.disabled=true;fieldset.disabled=true;update();const finish=loading.start();status('');
      try{const result=await request('ontrack',{method:'PATCH',body:{revision:data.revision,recipientIds:[...selection]}});if(disposed)return;data=result;selection=new Set(result.recipientIds);dirty=false;status('Ontvangers opgeslagen.');}
      catch{if(!disposed)status('Opslaan is niet gelukt. Je selectie is behouden. Laad de actuele gegevens en probeer opnieuw.',true);}
      finally{busy=false;finish();if(!disposed){refresh.disabled=false;render();}}
    };
    form.append(fieldset,save);recipients.append(form);grid.append(recipients);view.replaceChildren(toolbar,grid,notice);update();refresh.disabled=busy;
  }
  async function load(){
    if(busy||disposed)return;busy=true;refresh.disabled=true;const finish=loading.start();
    try{
      const result=await request('ontrack');if(disposed)return;
      if(!Number.isSafeInteger(result.received)||!Number.isSafeInteger(result.converted)||!Number.isSafeInteger(result.revision)||!Array.isArray(result.latest)||!Array.isArray(result.accounts)||!Array.isArray(result.recipientIds))throw Error('Invalid status');
      data=result;if(!dirty)selection=new Set(data.recipientIds);status(dirty?'Actuele gegevens geladen. Je nog niet opgeslagen selectie is behouden.':'');
    }catch{if(!disposed){status('OnTrack kon niet worden geladen. Probeer opnieuw.',true);if(!data)view.replaceChildren(toolbar,notice);}}
    finally{busy=false;finish();if(!disposed){refresh.disabled=false;render();}}
  }
  void load();return()=>{disposed=true;data=null;selection=null;loading.dispose();};
}
