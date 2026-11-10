// Bewaar uitgiftevergrendeling buiten opnieuw opgebouwde accountknoppen.
export function createActivationRequests(changed=()=>{}){
 const pending=new Set();
 return{has:id=>pending.has(id),async run(id,request){
  if(pending.has(id))return;
  pending.add(id);changed();
  try{return await request();}finally{pending.delete(id);changed();}
 }};
}
