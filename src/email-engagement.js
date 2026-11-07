import {createPageFeedback} from './lib/page-feedback.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const when=value=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('nl-NL',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Amsterdam'}).format(new Date(value)):'Verzenddatum onbekend';
export function createEmailEngagement(parent,{request,loading}={}){
 let disposed=false,pending=null,dialog=null;
 const feedback=createPageFeedback({key:'email-engagement',label:'E-mailoverzichten laden',route:'/beheerder/email'});
 const section=node('div','email-engagement-grid'),cards=new Map();
 for(const [kind,title]of [['reports','Showrapportage e-mails'],['profiles','Showprofiel e-mails']]){
  const card=node('section','email-engagement-card'),heading=node('h2','',title),caption=node('p','email-engagement-caption','Laatste 10 verzonden e-mails'),list=node('div','email-engagement-list');card.append(heading,caption,list);section.append(card);cards.set(kind,list);
 }
 parent.append(section);
 function close(){if(dialog){dialog.close();dialog.remove();dialog=null;document.body.classList.remove('email-engagement-modal-open');}}
 function recipientList(row,kind){
  const list=node('ul','email-engagement-recipients');
  for(const recipient of row.recipients){
   const item=node('li','email-engagement-recipient'),identity=node('div',''),name=node('p','email-engagement-name',recipient.name);identity.append(name);if(recipient.email&&recipient.email!==recipient.name)identity.append(node('p','email-engagement-caption',recipient.email));
   const status=node('div','email-engagement-status'),label=node('label','email-engagement-check'),check=node('input','');check.type='checkbox';check.disabled=true;check.checked=Boolean(recipient.openedAt);check.setAttribute('aria-label',kind==='reports'?'Showrapportage geopend':'Showprofiel geopend');
   label.append(check,node('span','',kind==='reports'?'Showrapportage geopend':'Showprofiel geopend'));status.append(label);
   if(!recipient.tracked){check.indeterminate=true;status.append(node('p','email-engagement-caption','Geen klikregistratie beschikbaar voor deze eerdere mail.'));}
   else if(recipient.openedAt)status.append(node('p','email-engagement-caption',when(recipient.openedAt)));
   item.append(identity,status);list.append(item);
  }
  return list;
 }
 function show(row,kind,trigger){
  close();const box=node('dialog','email-engagement-dialog');dialog=box;
  const header=node('header','email-engagement-dialog-head'),heading=node('h2','',row.artist),button=node('button','secondary-button','Sluiten');heading.id='email-engagement-title';box.setAttribute('aria-labelledby',heading.id);button.type='button';button.onclick=close;header.append(heading,button);box.append(header,node('p','email-engagement-caption',when(row.sentAt)));
  const list=recipientList(row,kind);box.dataset.emailId=row.id;box.dataset.mailKind=kind;
  box.append(list);box.addEventListener('click',event=>{if(event.target===box){const r=box.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  box.addEventListener('close',()=>{if(dialog===box){dialog=null;box.remove();document.body.classList.remove('email-engagement-modal-open');}if(!dialog&&!disposed){const target=trigger.isConnected?trigger:[...section.querySelectorAll('.email-engagement-row')].find(item=>item.dataset.emailId===row.id);target?.focus({preventScroll:true});}},{once:true});document.body.append(box);document.body.classList.add('email-engagement-modal-open');box.showModal();
 }
 function render(data){
  if(!Array.isArray(data.reports)||!Array.isArray(data.profiles))throw Error('Invalid history');
  for(const kind of ['reports','profiles']){
   const list=cards.get(kind);list.replaceChildren();
   for(const row of data[kind].slice(0,10)){
    const button=node('button','email-engagement-row'),copy=node('span',''),title=node('span','email-engagement-name',row.artist),date=node('span','email-engagement-caption',when(row.sentAt));button.type='button';button.dataset.emailId=row.id;button.setAttribute('aria-haspopup','dialog');copy.append(title);if(row.dates?.length)copy.append(node('span','email-engagement-caption',row.dates.map(day=>new Intl.DateTimeFormat('nl-NL',{dateStyle:'long',timeZone:'Europe/Amsterdam'}).format(new Date(day+'T12:00:00Z'))).join(' · ')+(row.venue?' · '+row.venue:'')));copy.append(date);
    const tracked=row.recipients.filter(recipient=>recipient.tracked),opened=row.recipients.filter(recipient=>recipient.openedAt).length;
    button.append(copy,node('span','email-engagement-count',tracked.length?tracked.length===row.recipients.length?`${opened} van ${row.recipients.length} geopend`:`${opened} geregistreerde openingen`:'Geen klikregistratie'),node('span','email-engagement-chevron','›'));button.onclick=()=>{show(row,kind,button);void load();};list.append(button);
   }
   if(!data[kind].length)list.append(node('p','email-engagement-caption',kind==='reports'?'Er zijn nog geen showrapportagemails verzonden.':'Er zijn nog geen showprofielmails verzonden.'));
  }
  if(dialog){const kind=dialog.dataset.mailKind,row=data[kind]?.find(item=>item.id===dialog.dataset.emailId);if(row)dialog.querySelector('.email-engagement-recipients').replaceWith(recipientList(row,kind));}
 }
 async function load(){if(disposed)return false;if(pending)return pending;const finish=loading.start();pending=(async()=>{try{const data=await request('report-email-history');if(disposed)return false;render(data);feedback.clear();return true;}catch{if(!disposed)feedback.show('De e-mailoverzichten konden niet worden geladen.',load,'Opnieuw laden');return false;}finally{finish();pending=null;}})();return pending;}
 const focus=()=>{if(!document.hidden)void load();};window.addEventListener('focus',focus);
 return{load,dispose(){disposed=true;close();feedback.dispose();window.removeEventListener('focus',focus);section.remove();}};
}
