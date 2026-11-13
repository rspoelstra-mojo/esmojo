import {pathToFileURL} from 'node:url';
const endpoints={tasks:'https://esmojo.nl/api/background-tasks-sync',validation:'https://esmojo.nl/api/shows-validation-sync'};
const keys=['steps','completed','blocked','waiting','failed'];
// Eén workflow houdt meerdere korte serverrondes gaande. De server blijft
// eigenaar van machtiging, checkpoints, leases, Retry-After en conflictstops.
export async function continueTasks({env=process.env,fetcher=fetch,now=Date.now,log=console.log,budgetMs=40*60000,maxRounds=100,mode='tasks'}={}){
 const endpoint=endpoints[mode];if(!endpoint)throw Error('Onbekende vaste worker.');
 const deadline=now()+Math.min(budgetMs,40*60000);
 for(let round=1;round<=maxRounds&&now()+280000<=deadline;round++){
  let response,data;
  try{
   const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
   const identity=await fetcher(url,{headers:{Authorization:`Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(30000)});
   if(!identity.ok)throw Error();const {value}=await identity.json();if(typeof value!=='string'||!value)throw Error();log(`::add-mask::${value}`);
   response=await fetcher(endpoint,{method:'POST',headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(280000)});
   data=await response.json();
  }catch{throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');}
  const stats=data?.stats;
  if(!response.ok||data?.ok!==true||!stats||keys.some(key=>!Number.isSafeInteger(stats[key])||stats[key]<0))throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');
  log(JSON.stringify({round,...Object.fromEntries(keys.map(key=>[key,stats[key]]))}));
  if(mode==='validation'&&data.verification){const v=data.verification;if(['shows','records','files'].some(k=>!Number.isSafeInteger(v[k])||v[k]<0))throw Error('Eindvalidatie niet bevestigd.');log(JSON.stringify({verifiedShows:v.shows,verifiedRecords:v.records,verifiedFiles:v.files}));}
  if(mode==='validation'&&stats.blocked)throw Error('Eindvalidatie gestopt voor controle; raadpleeg de beheerpagina.');
  if(stats.failed)throw Error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');
  if(stats.completed||stats.blocked||stats.waiting||!stats.steps)return;
 }
 log('Begrensde uitvoering afgerond; opgeslagen taken blijven beschikbaar voor de volgende ronde.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await continueTasks({mode:process.argv.includes('--shows-validation')?'validation':'tasks'});}catch{console.error('Achtergrondronde niet bevestigd; controleer de beheerpagina.');process.exitCode=1;}
}
