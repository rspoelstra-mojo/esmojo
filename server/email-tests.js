import {isAdministrator,hasModule} from '../shared/account-modules.js';
import {createMailingConcertsStore} from './ontrack-concerts.js';
import {emailTemplates} from './email-template-registry.js';
import {upcomingShows} from './mojo-agenda.js';
import {renderEmailTemplate} from './email-template.js';

export function validateEmailTestRequest(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['templateId','requestId','concertId'].includes(key))||typeof value.templateId!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.templateId)||typeof value.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId))throw Error('VALIDATION');
  if(value.concertId!==undefined&&(typeof value.concertId!=='string'||!value.concertId.trim()||value.concertId.length>240||/[\x00-\x1f/\\]/.test(value.concertId)))throw Error('VALIDATION');
  return value;
}
export function createEmailTestService({mail,shows,mailingConcerts=createMailingConcertsStore(),registry=emailTemplates}){
  async function concertList(){
    const index=await shows('list');
    return(index.shows||upcomingShows(index.concerts)).map(({key,name,venue,dates})=>({key,name,venue,dates}));
  }
  async function extraConcerts(profile){
    const index=await mailingConcerts('list',profile.id);
    return index.concerts.map(row=>({key:row.concertId,name:row.artist,venue:row.venue,dates:[row.date]}));
  }
  function recipient(profile){
    if(typeof profile.email!=='string'||profile.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))throw Error('EMAIL_RECIPIENT_UNAVAILABLE');
    return{email:profile.email,firstName:profile.firstName};
  }
  function recipients(profile){
    const own=recipient(profile).email;
    // Uitsluitend het serverzijdig geladen beheerdersaccount, nooit een browseradres.
    return isAdministrator(profile)&&own.toLowerCase()==='redacted@example.invalid'
      ?[own,'redacted@example.invalid']:[own];
  }
  return{
    async catalog(profile,canSend){
      const templates=(await registry.list()).filter(template=>template.concertCatalog!=='ontrack'||hasModule(profile,'reports'));
      const shows=templates.some(t=>t.requiresShow)?await concertList():[];
      const catalog={templates,recipient:recipient(profile).email,recipients:recipients(profile),canSend,shows};
      if(templates.some(t=>t.concertCatalog==='ontrack')){
        try{catalog.ontrackShows=[...shows,...await extraConcerts(profile)];catalog.ontrackAvailable=true;}
        catch{catalog.ontrackShows=shows;catalog.ontrackAvailable=false;}
      }
      return catalog;
    },
    async send(profile,input){
      const request=validateEmailTestRequest(input),template=await registry.get(request.templateId);
      if(!template)throw Error('EMAIL_TEMPLATE_NOT_FOUND');
      if(template.concertCatalog==='ontrack'&&!hasModule(profile,'reports'))throw Error('FORBIDDEN');
      if(template.requiresShow?!request.concertId:request.concertId!==undefined)throw Error('VALIDATION');
      const target=recipient(profile);let show=template.requiresShow?(await concertList()).find(row=>row.key===request.concertId):null;
      if(template.requiresShow&&!show&&template.concertCatalog==='ontrack')show=(await extraConcerts(profile)).find(row=>row.key===request.concertId);
      if(template.requiresShow&&!show)throw Error('EMAIL_SHOW_NOT_FOUND');
      const sample=await template.buildTest({recipient:target,show});
      if(typeof sample?.subject!=='string'||!sample.subject.trim())throw Error('INVALID_EMAIL_TEMPLATE');
      // Ontvanger en persoonlijke aanhef komen altijd uit het actuele eigen profiel.
      const message={...sample,to:target.email,recipient:{kind:'individual',firstName:target.firstName},subject:'[TEST] '+sample.subject};
      if(template.requiresShow)message.context={kind:'show',show};
      renderEmailTemplate(message);
      for(const [index,to] of recipients(profile).entries()){
        await mail({...message,to},{idempotencyKey:'esmojo-test-'+request.requestId.toLowerCase()+(index?'-richard-copy':'')});
      }
      return{ok:true};
    },
  };
}
