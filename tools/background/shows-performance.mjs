const endpoint='https://esmojo.nl/api/shows-performance-sync',operation=process.env.SHOWS_PERFORMANCE_OPERATION;
if(!['prepare','measure'].includes(operation))throw Error('VALIDATION');
async function step(body){
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
 const identity=await fetch(url,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(30000)});if(!identity.ok)throw Error('IDENTITY_UNCONFIRMED');const {value}=await identity.json();if(typeof value!=='string'||!value)throw Error('IDENTITY_UNCONFIRMED');console.log('::add-mask::'+value);
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+value,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(280000)}),data=await response.json();
 if(!response.ok||data.ok!==true){console.log(JSON.stringify({ok:false,code:/^[A-Z_]{1,60}$/.test(data.code||'')?data.code:'UNCONFIRMED'}));throw Error('PERFORMANCE_UNCONFIRMED');}return data;
}
try{
 const first=await step({operation,step:0});if(!Number.isInteger(first.total)||first.total<1||first.total>1000||!/^[a-f0-9]{64}$/.test(first.catalogue||''))throw Error('VERIFY');
 console.log(JSON.stringify({operation,region:first.region||null,dataverseGeo:first.dataverseGeo||null}));
 const timings=[];
 for(let index=0;index<first.total;index++){
  const result=await step({operation,step:index+1,catalogue:first.catalogue});if(result.timings)timings.push(result.timings);
  console.log(JSON.stringify({operation,current:index+1,total:first.total,...(result.timings?{timings:result.timings}:{})}));
 }
 const quantile=(key,p)=>[...timings].map(t=>t[key]).sort((a,b)=>a-b)[Math.min(timings.length-1,Math.ceil(timings.length*p)-1)];
 console.log(JSON.stringify({ok:true,operation,total:first.total,...(timings.length?{medianMs:quantile('authorizedOpeningMs',.5),p95Ms:quantile('authorizedOpeningMs',.95),openingP95Ms:quantile('openingMs',.95),authorizationP95Ms:quantile('authorizationMs',.95)}:{})}));
}catch{console.error('Shows-leesprojectie of snelheidsmeting niet bevestigd; raadpleeg uitsluitend de veilige foutcode.');process.exitCode=1;}
