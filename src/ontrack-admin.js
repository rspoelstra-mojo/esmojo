import {backgroundSaves} from './lib/background-saves.js';
import './ontrack-admin.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};

export function createOnTrackAdminView(content,submenuLink,{request=access}={}){
  let disposed=false,busy=false,data=null,selection=null,dirty=false,reloadAfterBusy=false;const recipientDraft=backgroundSaves.form('ontrack-recipients'),reportBusy=backgroundSaves.form('ontrack-actions',()=>new Set()),sourceDrafts=backgroundSaves.form('ontrack-sources',()=>new Map());
  const loading=createSubmenuLoading(submenuLink,content),view=node('section','ontrack-view');content.replaceChildren(view);
  const title=node('h1','','OnTrack'),notice=node('p','ontrack-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const refresh=node('button','secondary-button','Actuele gegevens laden');refresh.type='button';refresh.onclick=()=>void load();
  const toolbar=node('div','ontrack-toolbar');toolbar.append(title,refresh);
  function status(text,error=false){notice.textContent=text;notice.className=error?'form-message':'ontrack-notice';notice.setAttribute('role',error?'alert':'status');}
  async function reportAction(body,key){
    if(reportBusy.has(key)||disposed)return;reportBusy.add(key);const finish=loading.start();status('');render();
    try{
      const result=await request('ontrack-report',{method:'POST',body});if(disposed)return;
      if(body.operation==='download'){
        const bytes=Uint8Array.from(atob(result.pdfBase64),character=>character.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),link=document.createElement('a');link.href=url;link.download=result.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }else{sourceDrafts.delete(body.sourceId);await load();if(!disposed)status(body.operation==='link'?'Concertkoppeling opgeslagen.':body.operation==='send'?'Verzending aangevraagd.':'Verwerking opnieuw aangevraagd.');}
    }catch{if(!disposed)status('De actie is niet bevestigd. Je invoer is behouden. Vernieuw de gegevens en probeer opnieuw.',true);}
    finally{reportBusy.delete(key);backgroundSaves.changed();finish();if(!disposed)render();}
  }
  const errorText={CSV_HEADERS:'De 17 CSV-kolommen of hun volgorde kloppen niet.',CSV_ENCODING:'Het bestand is geen geldige UTF-8-CSV.',CSV_QUOTES:'Ongeldige CSV-aanhalingstekens.',CSV_COLUMNS:'Een CSV-rij heeft niet precies 17 kolommen.',CSV_EMPTY:'De CSV bevat geen incidenten.',CSV_TIME:'Datum/tijd kon niet worden gelezen.',CSV_TIME_NONEXISTENT:'Deze kloktijd bestaat niet door de zomertijdwisseling.',CSV_AFFECTED_PERSON:'Aantal personen is ongeldig.',CSV_ID:'Een incident-ID ontbreekt of komt dubbel voor.',CSV_SHOW_MISMATCH:'De showdatum sluit niet aan op de incidentdatums.',SOURCE_MISSING:'De bron-CSV staat niet meer in de OnTrack-map.',REPORT_GLYPH:'Een teken ontbreekt in het vaste PDF-lettertype.',REPORT_TYPE_LEGEND_LAYOUT:'De typelegenda past niet in de afgesproken kaart.',REPORT_LOCATION_LAYOUT:'Locatieteksten passen niet in de afgesproken kaart.',PDF_TOO_LARGE:'De PDF is groter dan de technische downloadlimiet.'};
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
      const body=node('tbody','');for(const report of data.latest){const row=node('tr',''),email=node('td','');email.textContent=report.emailStatus==='sent'?'✓ Verzonden':report.emailStatus==='failed'?'Verzending controleren':report.emailStatus==='no-recipients'?'Geen ontvangers gekozen':'Nog niet verzonden';email.className=report.emailStatus==='sent'?'ontrack-sent':'';if(report.id&&report.emailStatus==='no-recipients'){const send=node('button','ontrack-mail-button','Rapport mailen');send.type='button';send.disabled=reportBusy.has(report.id)||!data.recipientIds.some(id=>data.accounts.some(account=>account.id===id))||data.reportAssetsReady===false;send.onclick=()=>void reportAction({operation:'send',reportId:report.id},report.id);email.append(send);}const fileCell=node('td','');if(report.id){const download=node('button','ontrack-download',report.name);download.type='button';download.disabled=reportBusy.has(report.id);download.title='PDF downloaden';download.onclick=()=>void reportAction({operation:'download',reportId:report.id},report.id);fileCell.append(download);}else fileCell.textContent=report.name;row.append(fileCell,node('td','',new Intl.DateTimeFormat('nl-NL',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Amsterdam'}).format(new Date(report.convertedAt))),email);body.append(row);}table.append(body);latest.append(table);
    }
    latest.append(node('p','ontrack-muted',data.reportAssetsReady===false?'De definitieve PDF-verwerking wacht op het originele ON-icoon. Er worden geen rapportmails verstuurd.':data.processingStatus==='running'?'Rapportages worden op de achtergrond verwerkt.':'Nieuwe CSV’s worden automatisch gecontroleerd. Het vinkje verschijnt pas na bevestigde verzending.'));grid.append(latest);
    const recipients=node('section','ontrack-card ontrack-recipients');recipients.append(node('h2','','Ontvangers'),node('p','ontrack-muted','Selecteer de accounts die de OnTrack-rapportages per e-mail moeten ontvangen. Een nieuwe selectie geldt voor nieuwe rapportages.'));
    const form=node('form','ontrack-form'),fieldset=node('fieldset',''),legend=node('legend','visually-hidden','Ontvangeraccounts');fieldset.append(legend);fieldset.disabled=busy||recipientDraft.busy;
    const available=new Set(data.accounts.map(account=>account.id));
    for(const account of [...data.accounts,...[...selection].filter(id=>!available.has(id)).map(id=>({id,unavailable:true}))]){
      const label=node('label','ontrack-recipient'),check=node('input','');check.type='checkbox';check.value=account.id;check.checked=selection.has(account.id);
      const text=node('span',''),name=account.unavailable?'Account niet meer beschikbaar':[account.firstName,account.lastName].filter(Boolean).join(' ');text.append(node('span','',name));if(account.email)text.append(node('small','ontrack-muted',account.email));
      check.onchange=()=>{if(check.checked)selection.add(account.id);else selection.delete(account.id);dirty=true;status('');update();};label.append(check,text);fieldset.append(label);
    }
    if(!data.accounts.length)fieldset.append(node('p','ontrack-muted','Geen actieve accounts beschikbaar.'));
    const save=node('button','primary-button','Ontvangers opslaan');save.type='submit';
    function update(){save.disabled=busy||recipientDraft.busy||!dirty||[...selection].some(id=>!available.has(id));}
    form.onsubmit=async event=>{
      event.preventDefault();if(busy||recipientDraft.busy||save.disabled)return;
      recipientDraft.ids=[...selection];recipientDraft.busy=true;recipientDraft.error='';busy=true;refresh.disabled=true;fieldset.disabled=true;update();const finish=loading.start();status('');
      try{const result=await request('ontrack',{method:'PATCH',body:{revision:data.revision,recipientIds:recipientDraft.ids}});recipientDraft.ids=null;recipientDraft.error='';if(disposed)return;data=result;selection=new Set(result.recipientIds);dirty=false;status('Ontvangers opgeslagen.');}
      catch{recipientDraft.error='Opslaan is niet bevestigd.';if(!disposed)status('Opslaan is niet gelukt. Je selectie is behouden. Laad de actuele gegevens en probeer opnieuw.',true);}
      finally{recipientDraft.busy=false;busy=false;backgroundSaves.changed();finish();if(!disposed){refresh.disabled=false;render();if(reloadAfterBusy){reloadAfterBusy=false;void load();}}}
    };
    form.append(fieldset,save);recipients.append(form);grid.append(recipients);
    if(data.sources?.length){
      const queue=node('section','ontrack-card ontrack-queue');queue.append(node('h2','','CSV-verwerking'));
      const labels={unlinked:'Concertkoppeling vereist',pending:'In wachtrij',processing:'Wordt verwerkt',ready:'Rapportage gereed',invalid:'CSV of opmaak controleren',failed:'Verwerking niet bevestigd'};
      for(const source of data.sources){
        const item=node('div','ontrack-source'),description=node('div','');description.append(node('strong','',source.name),node('p','ontrack-muted',source.reused?'Rapportage hergebruikt':labels[source.status]||'In wachtrij'));
        if(source.errorCode)description.append(node('p','form-message',(errorText[source.errorCode]||'Controleer de CSV en de rapportageopmaak.')+(source.errorRow?' Rij '+source.errorRow+'.':'')));
        const controls=node('div','ontrack-source-controls'),select=node('select',''),label=node('label','visually-hidden','Concert voor '+source.name);select.id='ontrack-source-'+source.id;label.htmlFor=select.id;select.append(node('option','','Concert kiezen'));select.firstChild.value='';
        for(const show of data.showChoices||[]){const option=node('option','',show.name+' · '+show.venue+' · '+show.dates.map(date=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'}).format(new Date(date+'T12:00:00Z'))).join(' · '));option.value=show.key;select.append(option);}
        select.value=sourceDrafts.get(source.id)||source.showKey||'';select.disabled=reportBusy.has(source.id)||source.status==='processing';
        const link=node('button','secondary-button','Concert koppelen');link.type='button';link.disabled=select.disabled||!select.value||select.value===source.showKey;select.onchange=()=>{sourceDrafts.set(source.id,select.value);link.disabled=!select.value||select.value===source.showKey;};
        link.onclick=()=>void reportAction({operation:'link',sourceId:source.id,concertId:select.value,revision:source.linkRevision},source.id);controls.append(label,select,link);
        if(['invalid','failed'].includes(source.status)){const retry=node('button','secondary-button','Opnieuw verwerken');retry.type='button';retry.disabled=reportBusy.has(source.id);retry.onclick=()=>void reportAction({operation:'retry',sourceId:source.id,revision:source.linkRevision},source.id);controls.append(retry);}
        item.append(description,controls);queue.append(item);
      }
      grid.append(queue);
    }
    view.replaceChildren(toolbar,grid,notice);update();refresh.disabled=busy;
  }
  async function load(){
    if(disposed)return;if(busy){reloadAfterBusy=true;return;}busy=true;refresh.disabled=true;const finish=loading.start();
    try{
      const result=await request('ontrack');if(disposed)return;
      if(!Number.isSafeInteger(result.received)||!Number.isSafeInteger(result.converted)||!Number.isSafeInteger(result.revision)||!Array.isArray(result.latest)||!Array.isArray(result.accounts)||!Array.isArray(result.recipientIds))throw Error('Invalid status');
      data=result;if(!dirty)selection=new Set(recipientDraft.ids||data.recipientIds);if(recipientDraft.ids)dirty=true;status(dirty?'Actuele gegevens geladen. Je nog niet opgeslagen selectie is behouden.':'');
    }catch{if(!disposed){status('OnTrack kon niet worden geladen. Probeer opnieuw.',true);if(!data)view.replaceChildren(toolbar,notice);}}
    finally{busy=false;finish();if(!disposed){refresh.disabled=false;render();if(reloadAfterBusy){reloadAfterBusy=false;void load();}}}
  }
  const offActivity=backgroundSaves.subscribe(()=>{if(!disposed&&data&&!busy)render();});
  void load();return()=>{disposed=true;offActivity();data=null;selection=null;loading.dispose();};
}
