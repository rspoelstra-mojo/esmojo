// Alleen fictieve fixtures. Geen import van de verzendmodule en geen verzending.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {accountActivationEmail} from '../../server/account-email.js';
import {renderEmailTemplate} from '../../server/email-template.js';
import {exportEmailLogo} from './export-logo.mjs';
export function createEmailPreviews(directory){
 mkdirSync(directory,{recursive:true});exportEmailLogo();
 const base=accountActivationEmail({to:'preview@example.invalid',firstName:'Anne Marie',activationUrl:'https://esmojo.nl/#/activeren?token=preview-only-not-valid'});
 const fixtures={
  account:base,
  'account-long':{...base,title:'Stel je ESMOJO-account in – '+('UitgebreideTitelZonderWoordafbreking'.repeat(7)),recipient:{kind:'individual',firstName:'Anne Marie '+('LangeSamengesteldeVoornaam'.repeat(3))}},
  'account-general':{...base,recipient:{kind:'shared'}},
 };
 for(const [name,message]of Object.entries(fixtures)){const result=renderEmailTemplate(message);writeFileSync(resolve(directory,name+'.html'),result.html);writeFileSync(resolve(directory,name+'.txt'),result.text);}
 return Object.keys(fixtures);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const directory=resolve(process.argv[2]||'/tmp/esmojo-email-preview');createEmailPreviews(directory);console.log('Fictieve HTML/plain-textvoorbeelden aangemaakt; geen e-mails verzonden.');}
