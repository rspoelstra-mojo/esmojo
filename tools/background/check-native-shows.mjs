import {pathToFileURL} from 'node:url';
const endpoint='https://esmojo.nl/api/shows-runtime-sync';
export async function checkNativeShows({env=process.env,fetcher=fetch,log=console.log}={}){
 async function step(body){
  const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
  const identity=await fetcher(url,{headers:{Authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(30000)});if(!identity.ok)throw Error('RUNTIME_IDENTITY');const {value}=await identity.json();if(typeof value!=='string'||!value)throw Error('RUNTIME_IDENTITY');log('::add-mask::'+value);
  const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:'Bearer '+value,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(280000)}),data=await response.json();
  if(!response.ok||data.ok!==true){const safe={step:body.step,code:/^[A-Z_]{1,60}$/.test(data.code||'')?data.code:'UNCONFIRMED'};if(data.conflict?.table?.startsWith('esmojo_'))safe.conflict={table:data.conflict.table,columns:(data.conflict.differences||[]).map(row=>row.column).filter(name=>/^esmojo_[a-z_]+$/.test(name))};log(JSON.stringify(safe));throw Error('RUNTIME_UNCONFIRMED');}return data;
 }
 const first=await step({step:0});if(!Number.isInteger(first.total)||first.total<1||first.total>1000||!/^[a-f0-9]{64}$/.test(first.catalogue||''))throw Error('RUNTIME_UNCONFIRMED');
 const probe=await step({step:1,catalogue:first.catalogue});if(probe.atomic!==true||probe.conflict!==true||probe.rollback!==true)throw Error('RUNTIME_UNCONFIRMED');log(JSON.stringify({atomic:true,conflict:true,rollback:true}));
 let shows=0,files=0;for(let index=0;index<first.total;index++){const result=await step({step:index+2,catalogue:first.catalogue});if(result.verifiedShows!==1||!Number.isInteger(result.verifiedFiles)||result.verifiedFiles<0)throw Error('RUNTIME_UNCONFIRMED');shows++;files+=result.verifiedFiles;log(JSON.stringify({verifiedShows:shows,total:first.total,verifiedFiles:files}));}
 return{shows,files};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await checkNativeShows();}catch{console.error('Native runtimecontrole niet bevestigd; geen opslagomschakeling uitgevoerd.');process.exitCode=1;}}
