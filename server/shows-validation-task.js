// Eindvalidatie hergebruikt uitsluitend de nog geldige delegatie van de
// afgeronde kopie. De OIDC-route kan geen actor, cursor of vrije taak aanleveren.
export async function ensureShowsValidation({store,tasks,now=Date.now}){
 const migration=await store.get('shows-migration-v1'),state=migration?.state;
 if(!state||state.status!=='complete'||state.expiresAt<=now())throw Error('VALIDATION_APPROVAL_REQUIRED');
 return tasks.control({operation:'start',type:'shows-validation-v1'},state.actor,{authorizationExpiresAt:state.expiresAt});
}
