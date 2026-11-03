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
  function notice(text,error=false){status.textContent=text;status.className=error?'form-message':'account-notice';status.setAttribute('role',error?'alert':'status');}
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
      recipient.textContent='Versturen naar je eigen accountadres: '+data.recipient;
      notice(data.canSend?'':'E-mailverzending is nog niet geconfigureerd.');view.replaceChildren(title,form);update();
    }catch{if(!disposed){const error=node('p','form-message','De e-mailtemplates konden niet worden geladen.'),retry=node('button','secondary-button','Opnieuw laden');error.setAttribute('role','alert');retry.type='button';retry.onclick=()=>{view.replaceChildren();void load();};view.replaceChildren(title,error,retry);}}
    finally{finish();}
  }
  select.onchange=()=>{requestId=null;notice('');renderShows();update();};showSelect.onchange=()=>{requestId=null;notice('');update();};
  form.onsubmit=async event=>{
    event.preventDefault();if(disposed||busy||button.disabled||!form.reportValidity())return;
    busy=true;requestId ||= crypto.randomUUID();notice('');update();const finish=loading.start();
    try{
      const template=selected(),body={templateId:template.id,requestId,...(template.requiresShow?{concertId:showSelect.value}:{})};
      const result=await request('email',{method:'POST',body});if(disposed)return;if(result.ok!==true)throw Error('Unconfirmed send');
      requestId=null;notice('Testmail verstuurd naar '+catalog.recipient+'.');
    }catch{if(!disposed)notice('Testmail versturen is niet gelukt. Probeer het opnieuw.',true);}
    finally{busy=false;finish();if(!disposed)update();}
  };
  void load();return()=>{disposed=true;catalog=null;requestId=null;loading.dispose();};
}
