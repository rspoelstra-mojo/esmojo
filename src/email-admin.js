import {createPageFeedback} from './lib/page-feedback.js';
import {saveRequestInfo} from './lib/background-saves.js';
import './email-admin.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const dates=value=>(value||[]).map(date=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'}).format(new Date(date+'T12:00:00Z'))).join(' · ');

export function createEmailAdminView(content,submenuLink,{request=access}={}){
  let disposed=false,busy=false,catalog=null,requestId=null;
  const loading=createSubmenuLoading(submenuLink,content),view=node('section','email-admin-view');content.replaceChildren(view);
  const title=node('h1','','Email'),form=node('form','account-form email-admin-form');
  const field=node('div','email-admin-field'),label=node('label','','Te testen template'),select=node('select','');select.id='email-template';select.required=true;label.htmlFor=select.id;field.append(label,select);
  const showField=node('div','email-admin-field'),showLabel=node('label','','Concert'),showSelect=node('select','');showSelect.id='email-test-show';showLabel.htmlFor=showSelect.id;showField.append(showLabel,showSelect);
  const catalogNotice=node('p','email-admin-recipient');showField.append(catalogNotice);
  const recipient=node('p','email-admin-recipient'),button=node('button','primary-button','Testmail versturen');button.type='submit';
  const status=node('p','account-notice');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  form.append(field,showField,recipient,button,status);
  const selected=()=>catalog?.templates.find(template=>template.id===select.value);
  const feedback=createPageFeedback(saveRequestInfo('email'));
  function notice(text,error=false){status.textContent='';if(text)feedback.show(error?'De e-mailactie kon niet worden bevestigd. Controleer de actuele status.':text,error?async()=>{await load();return Boolean(catalog);}:null,error?'Actuele gegevens laden':'Opnieuw proberen');else feedback.clear();}
  function renderShows(){
    const ontrack=selected()?.concertCatalog==='ontrack',shows=ontrack?catalog.ontrackShows:catalog.shows;
    showSelect.replaceChildren(node('option','','Kies een concert'));showSelect.firstChild.value='';
    for(const show of shows||[]){const option=node('option','',[show.name,show.venue,dates(show.dates)].join(' · '));option.value=show.key;showSelect.append(option);}
    catalogNotice.textContent=ontrack&&catalog.ontrackAvailable===false?'De extra concertlocaties zijn tijdelijk niet beschikbaar. De Gashouder-concerten blijven beschikbaar.':'';
    catalogNotice.hidden=!catalogNotice.textContent;
  }
  function update(){
    const template=selected();showField.hidden=!template?.requiresShow;showSelect.required=Boolean(template?.requiresShow);
    select.disabled=busy;showSelect.disabled=busy;
    button.disabled=busy||!catalog?.canSend||!template||(template.requiresShow&&!showSelect.value);
    if(busy)form.setAttribute('aria-busy','true');else form.removeAttribute('aria-busy');
  }
  async function load(){
    const finish=loading.start();
    try{
      const data=await request('email');if(disposed)return;
      if(!Array.isArray(data.templates)||!Array.isArray(data.shows)||typeof data.recipient!=='string'||typeof data.canSend!=='boolean')throw Error('Invalid catalog');
      catalog=data;select.replaceChildren(node('option','','Kies een template'));select.firstChild.value='';
      for(const template of data.templates){const option=node('option','',template.label);option.value=template.id;select.append(option);}
      renderShows();
      recipient.textContent='Testmail versturen naar: '+(data.recipients||[data.recipient]).join(' en ');
      notice(data.canSend?'':'E-mailverzending is nog niet geconfigureerd.');view.replaceChildren(title,form);update();
    }catch{if(!disposed){feedback.show('De e-mailtemplates konden niet worden geladen.',async()=>{await load();return Boolean(catalog);},'Opnieuw laden');view.replaceChildren(title);}}
    finally{finish();}
  }
  select.onchange=()=>{requestId=null;notice('');renderShows();update();};showSelect.onchange=()=>{requestId=null;notice('');update();};
  form.onsubmit=async event=>{
    event.preventDefault();if(disposed||busy||button.disabled||!form.reportValidity())return;
    busy=true;requestId ||= crypto.randomUUID();notice('');update();const finish=loading.start();
    try{
      const template=selected(),body={templateId:template.id,requestId,...(template.requiresShow?{concertId:showSelect.value}:{})};
      const result=await request('email',{method:'POST',body});if(disposed)return;if(result.ok!==true)throw Error('Unconfirmed send');
      requestId=null;notice('Testmail verstuurd.');
    }catch{if(!disposed)notice('Testmail versturen is niet gelukt. Probeer het opnieuw.',true);}
    finally{busy=false;finish();if(!disposed)update();}
  };
  void load();return()=>{disposed=true;feedback.dispose();catalog=null;requestId=null;loading.dispose();};
}
