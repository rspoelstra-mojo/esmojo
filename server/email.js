import {emailAttachments} from './email-attachments.js';
// Alleen gebruiken vanuit servercode; importeer dit bestand nooit in src/.
import {renderEmailTemplate} from './email-template.js';
export const EMAIL_FROM = 'ESMOJO <no-reply@esmojo.nl>';

/** Iedere uitgaande mail gebruikt dezelfde renderer. Eén ontvanger per bericht. */
export async function sendEmail(message,{env=process.env,fetchImpl=fetch,idempotencyKey}={}) {
  if(typeof message?.to!=='string'||message.to.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.to))throw Error('Gebruik één geldig ontvangeradres per e-mail.');
  if(idempotencyKey!==undefined&&(typeof idempotencyKey!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(idempotencyKey)))throw Error('Ongeldige idempotentiesleutel.');
  const {subject,text,html}=renderEmailTemplate(message);
  const attachments=emailAttachments(message).map(({filename,bytes})=>({filename,content:bytes.toString('base64'),content_type:'application/pdf'}));
  const apiKey=env.RESEND_API_KEY;
  if(!apiKey)throw new Error('RESEND_API_KEY ontbreekt op de server.');
  const response=await fetchImpl('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},
    body:JSON.stringify({from:EMAIL_FROM,to:message.to,subject,text,html,...(attachments.length?{attachments}:{})}),
  });
  if(!response.ok)throw new Error('Resend kon de e-mail niet verzenden (HTTP '+response.status+').');
  return response.json();
}
