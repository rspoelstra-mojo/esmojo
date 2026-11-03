import {emailUrl} from '../email-template.js';

// Enige bestaande mailtype; geen extra verzendtrigger of nieuwe token/TTL.
export function accountActivationEmail({to,firstName,activationUrl,reissued=false}){
  const link=emailUrl(activationUrl),url=new URL(link);
  if(url.pathname!=='/'||url.search||!url.hash.startsWith('#/activeren?'))throw Error('Ongeldige accountactivatielink.');
  const params=new URLSearchParams(url.hash.slice('#/activeren?'.length)),token=params.get('token'),type=params.get('type');
  if(!token||params.getAll('token').length!==1||params.getAll('type').length>1||[...params.keys()].some(k=>!['token','type'].includes(k))||(type!==null&&!['invite','recovery'].includes(type)))throw Error('Ongeldige accountactivatielink.');
  return {
    to,subject:'Stel je ESMOJO-account in',
    preheader:'Stel je wachtwoord en authenticator in voor ESMOJO.',
    title:'Stel je ESMOJO-account in',context:{kind:'account'},
    recipient:{kind:'individual',firstName},
    paragraphs:[(reissued?'':'Er is een ESMOJO-account voor je aangemaakt. ')+'Stel via deze eenmalige link je wachtwoord en authenticator in:'],
    information:[{title:'2-stapsverificatie',text:'Je krijgt pas toegang nadat je de 2-stapsverificatie hebt afgerond.'}],
    actions:[{label:'Account activeren',url:link}],
    senderName:'ESMOJO',
  };
}

// De testvariant heeft geen echte activatielink en wijzigt geen account.
export default {
  id:'account-activation',label:'Account activeren',requiresShow:false,
  build:accountActivationEmail,
  buildTest({recipient}){
    const message=accountActivationEmail({to:recipient.email,firstName:recipient.firstName,activationUrl:'https://esmojo.nl/#/activeren?token=test-only-not-an-activation'});
    return {...message,preheader:'Test van de ESMOJO-accountmail.',
      paragraphs:['Dit is een test van de ESMOJO-accountmail. Je kunt hiermee de vormgeving in je eigen mailbox bekijken.'],
      actions:[{label:'ESMOJO openen',url:'https://esmojo.nl/'}]};
  },
};
