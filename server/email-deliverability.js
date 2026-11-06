import {createHmac,timingSafeEqual} from 'node:crypto';
import {renderEmailTemplate} from './email-template.js';
import {SHOW_REPORT_EMAIL_FROM} from './email-senders.js';
const RECIPIENT='redacted@example.invalid',BATCH='proofpoint-20261106-v1';
const START=Date.parse('2026-11-06T00:00:00+01:00'),END=Date.parse('2026-11-07T00:00:00+01:00');
const LINK='https://esmojo.nl/rapportages/Jungle_Ziggo-Dome_03112026';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const variants=['plain','link','branded'];
const pause=ms=>new Promise(done=>setTimeout(done,ms));
export function deliverabilityPayloads(){
 const plain='Beste Richard,\n\nDit is een eenmalige technische bezorgtest van ESMOJO.\nJe hoeft niets met deze mail te doen.\n\nMet vriendelijke groet,\nESMOJO',linked=plain+'\n\nShowrapportage openen: '+LINK;
 const subject=(number,label)=>`[ESMOJO bezorgtest 06-11] ${number}/3 - ${label}`;
 const branded=renderEmailTemplate({senderId:'show-report',subject:subject(3,'Met opmaak'),preheader:'Eenmalige technische bezorgtest',title:'Bezorgtest',context:{kind:'show',show:{key:'Jungle_Ziggo-Dome_03112026',name:'Jungle',venue:'Ziggo Dome',dates:['2026-11-03']}},recipient:{kind:'individual',firstName:'Richard'},paragraphs:['Dit is een eenmalige technische bezorgtest van ESMOJO.','Je hoeft niets met deze mail te doen.'],actions:[{label:'Showrapportage openen',url:LINK}],senderName:'ESMOJO'});
 return [{from:SHOW_REPORT_EMAIL_FROM,to:RECIPIENT,subject:subject(1,'Zonder link'),text:plain},{from:SHOW_REPORT_EMAIL_FROM,to:RECIPIENT,subject:subject(2,'Met link'),text:linked},{from:SHOW_REPORT_EMAIL_FROM,to:RECIPIENT,subject:branded.subject,text:linked,html:branded.html}];
}
export function createDeliverabilityService({env=process.env,request=fetch,now=Date.now,sleep=pause}={}){
 const proof=(variant,id)=>createHmac('sha256',env.RESEND_API_KEY).update(JSON.stringify([BATCH,variant,id])).digest('hex');
 function ready(){if(now()<START||now()>=END)throw Error('CLOSED');if(!env.RESEND_API_KEY)throw Error('UNAVAILABLE');}
 async function call(path,options){
  for(let attempt=0;attempt<2;attempt++){
   try{const response=await request('https://api.resend.com'+path,{...options,headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});
    if(attempt===0&&(response.status===429||response.status>=500)){await sleep(1500);continue;}return response;
   }catch(error){if(attempt)throw Error('PROVIDER_UNCONFIRMED');await sleep(1500);}
  }
 }
 return{async run(input){
  ready();if(!input||Object.keys(input).some(key=>!['operation','items'].includes(key))||!['send','status'].includes(input.operation))throw Error('VALIDATION');
  if(input.operation==='send'){
   if(input.items!==undefined)throw Error('VALIDATION');const items=[];
   for(const [index,payload]of deliverabilityPayloads().entries()){
    if(index)await sleep(1000);ready();
    const response=await call('/emails',{method:'POST',headers:{'Idempotency-Key':BATCH+'-'+variants[index]},body:JSON.stringify(payload)});
    if(!response.ok)throw Error('PROVIDER_UNCONFIRMED');const data=await response.json();if(!UUID.test(data.id||''))throw Error('PROVIDER_UNCONFIRMED');
    items.push({variant:variants[index],id:data.id,proof:proof(variants[index],data.id)});
   }
   return{ok:true,items};
  }
  if(!Array.isArray(input.items)||input.items.length!==3)throw Error('VALIDATION');
  for(const [index,item]of input.items.entries()){
   if(!item||Object.keys(item).sort().join(',')!=='id,proof,variant'||item.variant!==variants[index]||!UUID.test(item.id||'')||!/^[a-f0-9]{64}$/.test(item.proof||'')||!timingSafeEqual(Buffer.from(item.proof,'hex'),Buffer.from(proof(item.variant,item.id),'hex')))throw Error('FORBIDDEN');
  }
  const statuses=[];
  for(const [index,item]of input.items.entries()){
   if(index)await sleep(1000);ready();const response=await call('/emails/'+item.id,{method:'GET'});
   if([401,403].includes(response.status)){statuses.push({variant:item.variant,status:'read-unavailable'});continue;}
   if(!response.ok){statuses.push({variant:item.variant,status:'unconfirmed'});continue;}
   const data=await response.json(),allowed=['sent','delivered','delivery_delayed','bounced','complained','opened','clicked','failed','suppressed','scheduled'];
   const status=typeof data.last_event==='string'?data.last_event.replace(/^email\./,''):'unconfirmed';
   statuses.push({variant:item.variant,status:allowed.includes(status)?status:'unconfirmed'});
  }
  return{ok:true,statuses};
 }};
}
