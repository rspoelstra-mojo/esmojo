const endpoint='https://esmojo.nl/api/account-access-sync';
const operation=process.env.ACCOUNT_ACCESS_OPERATION;if(!['start','resume','status'].includes(operation))throw Error('VALIDATION');
async function step(operation){
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
 const identity=await fetch(url,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(30000)});if(!identity.ok)throw Error('IDENTITY_UNCONFIRMED');const {value}=await identity.json();if(typeof value!=='string'||!value)throw Error('IDENTITY_UNCONFIRMED');console.log('::add-mask::'+value);
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+value,'Content-Type':'application/json'},body:JSON.stringify({operation}),signal:AbortSignal.timeout(280000)}),data=await response.json();
 if(!response.ok||data.ok!==true)throw Error(/^[A-Z_]{1,60}$/.test(data.code||'')?data.code:'ACCESS_UNCONFIRMED');
 console.log(JSON.stringify({status:data.status,phase:data.phase,total:data.total,checked:data.checked,...(data.code?{code:/^[A-Z_]{1,60}$/.test(data.code)?data.code:'ACCESS_UNCONFIRMED'}:{})}));return data;
}
try{
 let data=await step(operation),rounds=0;
 while(operation!=='status'&&['queued','running','waiting'].includes(data.status)&&++rounds<35){await new Promise(resolve=>setTimeout(resolve,30000));data=await step('advance');}
 if(operation!=='status'&&data.status!=='complete')throw Error('ACCESS_UNCONFIRMED');
}catch(error){console.error(/^[A-Z_]{1,60}$/.test(error.message||'')?error.message:'ACCESS_UNCONFIRMED');process.exitCode=1;}
