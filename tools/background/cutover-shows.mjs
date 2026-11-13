import {pathToFileURL} from 'node:url';
const endpoint='https://esmojo.nl/api/shows-cutover-sync';
export async function cutoverShows({env=process.env,fetcher=fetch,log=console.log,now=Date.now,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),operation='status'}={}){
 if(!['status','start','resume'].includes(operation))throw Error('VALIDATION');const deadline=now()+40*60000;
 for(let round=0;round<500&&now()<deadline;round++){
  const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
  const identity=await fetcher(url,{headers:{Authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(30000)});if(!identity.ok)throw Error('IDENTITY_UNCONFIRMED');const {value}=await identity.json();if(typeof value!=='string'||!value)throw Error('IDENTITY_UNCONFIRMED');log('::add-mask::'+value);
  const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:'Bearer '+value,'Content-Type':'application/json'},body:JSON.stringify({operation:round===0?operation:'advance'}),signal:AbortSignal.timeout(280000)}),data=await response.json();
  // Server response is restricted to counters, fixed codes and schema labels.
  log(JSON.stringify(data));if(!response.ok||data.ok!==true||data.status==='blocked')throw Error('CUTOVER_UNCONFIRMED');
  if(operation==='status'||data.status==='complete')return data;
  if(data.waiting||data.phase==='drain')await pause(Math.min(30000,Math.max(1000,Date.parse(data.drainUntil||'')-now()||5000)));
 }
 throw Error('CUTOVER_INCOMPLETE');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await cutoverShows({operation:process.argv.includes('--start')?'start':process.argv.includes('--resume')?'resume':'status'});}catch{console.error('Shows-omschakeling niet bevestigd; raadpleeg de veilige statuscontrole.');process.exitCode=1;}}
