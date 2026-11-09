const hour=new Intl.DateTimeFormat('nl-NL',{timeZone:'Europe/Amsterdam',hour:'2-digit',hourCycle:'h23'}).format(new Date());
if(process.env.BIOGRAPHY_EVENT_NAME==='schedule'&&hour!=='12')process.exit(0);
const endpoint='https://esmojo.nl/api/artist-biographies-sync';
const wait=ms=>new Promise(done=>setTimeout(done,ms));
let after=null,retries=0,total=0,checked=0,failed=[],ready=false,initialDone=false,initialBatches=0,initialSaved=0;
for(let page=0;page<60;page++){
 const identityUrl=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);identityUrl.searchParams.set('audience',endpoint);
 const identity=await fetch(identityUrl,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
 if(!identity.ok)throw Error('BIOGRAPHY_IDENTITY_UNAVAILABLE');const {value}=await identity.json();console.log('::add-mask::'+value);
 let data;
 try{
  if(!ready){const probe=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+value,'Content-Type':'application/json'},body:JSON.stringify({checkOnly:true}),signal:AbortSignal.timeout(30000)});const status=await probe.json();if(!probe.ok||status.workerVersion!==4)throw Error('BIOGRAPHY_NOT_READY');ready=true;}
  if(!initialDone){if(++initialBatches>2000)throw Error('BIOGRAPHY_INITIAL_LIMIT');const fill=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+value,'Content-Type':'application/json'},body:JSON.stringify({initialFill:true}),signal:AbortSignal.timeout(290000)});const initial=await fill.json();if(!fill.ok||!initial.ok)throw Error('BIOGRAPHY_NOT_READY');retries=0;initialSaved+=initial.saved;console.log(JSON.stringify({initialSaved:initial.saved,more:initial.more}));if(initial.more){page--;continue;}console.log('::notice::ARTIST_INITIAL_FILL '+JSON.stringify({...initial,totalSaved:initialSaved}).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));initialDone=true;}
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+value,'Content-Type':'application/json'},body:JSON.stringify({after}),signal:AbortSignal.timeout(310000)});
  data=await response.json();if(!response.ok||data.ok!==true)throw Error('BIOGRAPHY_NOT_READY');
 }catch{
  // Vercel en Apps Script publiceren afzonderlijk. Wacht op beide, zonder writes.
  if(++retries>10)throw Error('BIOGRAPHY_ENDPOINT_NOT_READY');await wait(20000);page--;continue;
 }
 retries=0;total+=data.captured;checked+=data.checked;failed.push(...data.failed);
 console.log(JSON.stringify({checked:data.checked,captured:data.captured,failed:data.failed,nextBatch:Boolean(data.nextAfter)}));
 if(data.samples?.length){const sample=JSON.stringify(data.samples).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');console.log('::notice::MOJO_BIOGRAPHIES_SAVED '+sample);}
 after=data.nextAfter;if(!after){
  const summary=`MOJO-artiestbeschrijvingen: ${checked} verschuldigde artiesten gecontroleerd, ${total} opgeslagen, ${failed.length} niet opgehaald. Bestaande teksten behouden.`;
  console.log(summary);
  if(process.env.GITHUB_STEP_SUMMARY){const {writeFile}=await import('node:fs/promises');await writeFile(process.env.GITHUB_STEP_SUMMARY,summary+'\n',{flag:'a'});}
  if(failed.length){const safe=JSON.stringify(failed).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');console.log('::error::MOJO_BIOGRAPHY_CAPTURE_FAILED '+safe);process.exitCode=1;}
  break;
 }
 if(page===59)throw Error('BIOGRAPHY_BATCH_LIMIT');
}
