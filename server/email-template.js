import {emailAttachments} from './email-attachments.js';
// Alleen servercode. Geen vrije HTML of templates van gebruikers uitvoeren.
import {readFileSync} from 'node:fs';
export const EMAIL_BRAND='Event Safety Mobility Operations';
export const EMAIL_LOGO_URL='https://esmojo.nl/brand/ESMOJO-logo-wit-email.png';
export const ACCOUNT_EMAIL_CONTEXT='Account activeren'; // Expliciet door de gebruiker bevestigd.
const template=readFileSync(new URL('./email/template.html',import.meta.url),'utf8');
const fields=new Set(['to','subject','preheader','title','context','recipient','paragraphs','information','actions','closing','senderName','attachments','requirePdfAttachment']);
export const escapeEmailHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function text(value,name,{max=15000,blank=false,line=false}={}){
  if(typeof value!=='string'||value.length>max||(!blank&&!value.trim())||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)||(line&&/[\r\n]/.test(value))||/{{[^{}]*}}/.test(value))throw Error('Ongeldige e-mailinhoud: '+name);
  return value.trim();
}
export function emailUrl(value){
  text(value,'link',{max:8192,line:true});
  let url;try{url=new URL(value);}catch{throw Error('Ongeldig e-maillinkdoel.');}
  if(url.protocol!=='https:'||url.origin!=='https://esmojo.nl'||url.username||url.password)throw Error('Niet toegestaan e-maillinkdoel.');
  return url.href;
}
export function emailGreeting(recipient={}){
  if(!recipient||typeof recipient!=='object'||Array.isArray(recipient))throw Error('Ongeldige e-mailontvanger.');
  const kind=recipient.kind||'individual';
  if(!['individual','shared','group'].includes(kind))throw Error('Ongeldige ontvangercategorie.');
  const firstName=typeof recipient.firstName==='string'?recipient.firstName.trim():'';
  const reliable=firstName&&firstName.length<=120&&!/[\x00-\x1f\x7f@]/.test(firstName);
  return kind==='individual'&&reliable?'Beste '+firstName+',':'Beste collega,';
}
const dateFormatter=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'});
export function emailContext(context){
  if(context?.kind==='account')return ACCOUNT_EMAIL_CONTEXT;
  if(context?.kind!=='show'||!context.show)throw Error('Bevestigde e-mailcontext ontbreekt.');
  const show=context.show;
  text(show.key,'concertkoppeling',{max:240,line:true});
  const name=text(show.name,'artiest/evenement',{max:500,line:true}),venue=text(show.venue,'concertlocatie',{max:500,line:true});
  if(!Array.isArray(show.dates)||!show.dates.length)throw Error('Showdatums ontbreken.');
  const dates=[...new Set(show.dates)].sort().map(value=>{
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Ongeldige showdatum.');
    const date=new Date(value+'T12:00:00Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('Ongeldige showdatum.');
    return dateFormatter.format(date);
  });
  return [name,venue,...dates].join(' · ');
}
function list(value,name){if(!Array.isArray(value))throw Error('Ongeldige e-mailinhoud: '+name);return value;}
const bodyText=value=>escapeEmailHtml(value).replace(/\r?\n/g,'<br>');
export function renderEmailTemplate(message){
  if(!message||typeof message!=='object'||Array.isArray(message)||Object.keys(message).some(k=>!fields.has(k)))throw Error('Gebruik de gestructureerde ESMOJO-emailstandaard.');
  emailAttachments(message);
  const subject=text(message.subject,'onderwerp',{max:200,line:true}),preheader=text(message.preheader,'preheader',{max:400,line:true}),title=text(message.title,'titel',{max:500,line:true});
  const subtitle=emailContext(message.context),greeting=text(emailGreeting(message.recipient),'aanhef',{max:160,line:true});
  const paragraphs=list(message.paragraphs,'inhoud').map(p=>text(p,'inhoud'));
  if(!paragraphs.length)throw Error('E-mailinhoud ontbreekt.');
  const information=list(message.information||[],'informatieblokken').map(block=>({title:text(block?.title,'bloktitel',{max:500,line:true}),text:text(block?.text,'bloktekst')}));
  const actions=list(message.actions||[],'acties').map(action=>({label:text(action?.label,'actie',{max:200,line:true}),url:emailUrl(action?.url)}));
  const closing=message.closing===undefined?'':text(message.closing,'afsluiting',{blank:true}),sender=text(message.senderName||'ESMOJO','afzendernaam',{max:200,line:true});
  const p=value=>'<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#334155;overflow-wrap:break-word;word-break:break-word;">'+bodyText(value)+'</p>';
  const info=information.map(block=>'<tr><td class="pad" style="padding:8px 40px 24px;"><table role="presentation" width="100%" bgcolor="#f5f7fa" style="background-color:#f5f7fa;border-radius:6px;"><tr><td style="padding:22px 24px;overflow-wrap:break-word;word-break:break-word;"><h2 style="margin:0 0 8px;color:#081830;font-size:17px;line-height:24px;font-weight:700;">'+escapeEmailHtml(block.title)+'</h2><p style="margin:0;color:#475569;font-size:15px;line-height:25px;">'+bodyText(block.text)+'</p></td></tr></table></td></tr>').join('\n');
  // Alleen de link kleurt blauw; de omringende tabelcel blijft transparant.
  const buttons=actions.map(action=>'<tr><td class="pad" style="padding:0 40px 28px;"><table role="presentation" style="max-width:100%;"><tr><td class="action-cell" align="center" style="padding:0;"><a class="action-link" href="'+escapeEmailHtml(action.url)+'" target="_blank" rel="noopener noreferrer" style="display:inline-block;max-width:100%;box-sizing:border-box;border:15px solid #0046f2;border-left-width:24px;border-right-width:24px;border-radius:8px;background-color:#0046f2;color:#ffffff;font-size:16px;font-weight:700;line-height:20px;text-align:center;text-decoration:none;overflow-wrap:break-word;word-break:break-word;">'+escapeEmailHtml(action.label)+'</a></td></tr></table></td></tr>').join('\n');
  const replacements={onderwerp:escapeEmailHtml(subject),preheader:escapeEmailHtml(preheader),titel:escapeEmailHtml(title),subtitel:escapeEmailHtml(subtitle),logo_url:EMAIL_LOGO_URL,aanhef:escapeEmailHtml(greeting),introductie:paragraphs.map(p).join('\n'),informatieblokken:info,acties:buttons,afsluiting:closing?p(closing):'',afzender_naam:escapeEmailHtml(sender)};
  const html=template.replace(/{{([a-z_]+)}}/g,(_,key)=>{if(!Object.hasOwn(replacements,key))throw Error('Onbekende emailtemplatevariabele.');return replacements[key];});
  if(/{{[^{}]*}}/.test(html))throw Error('Onvervulde emailtemplatevariabele.');
  const plain=[EMAIL_BRAND,title,subtitle,preheader,greeting,...paragraphs,...information.map(b=>b.title+'\n'+b.text),...actions.map(a=>a.label+': '+a.url),...(closing?[closing]:[]),'Met vriendelijke groet,\n'+sender,EMAIL_BRAND].join('\n\n');
  return {subject,html,text:plain};
}
