import {createApplicationTasks} from '../background-tasks/registry.js';
import {createTaskStore} from '../background-tasks/store.js';
import {accessTaskType} from './task.js';
// Only an exact-main OIDC workflow may reuse the original still-valid approval.
// The generic engine checks this actor's current admin + Shows rights again.
export function createAccessController({env=process.env,tasks=createApplicationTasks({env}),store=createTaskStore({env}),now=Date.now}={}){
 return async input=>{
  if(!input||Array.isArray(input)||Object.keys(input).join(',')!=='operation'||!['start','advance','status','resume'].includes(input.operation))throw Error('VALIDATION');
  const approval=await store.get('shows-migration-v1');if(approval?.state.status!=='complete'||approval.state.expiresAt<=now())throw Error('TASK_EXPIRED');
  const actor=approval.state.actor;
  const result=await tasks.control({operation:input.operation==='advance'?'status':input.operation,type:accessTaskType},actor,{authorizationExpiresAt:approval.state.expiresAt});
  if(input.operation!=='status')await tasks.run({types:[accessTaskType],budgetMs:150000});
  const current=await tasks.control({operation:'status',type:accessTaskType},actor);
  const job=current.task||result.task;
  return{ok:true,status:job?.status||'not-started',phase:job?.progress?.phase||'not-started',total:job?.total||0,checked:job?.progress?.verifiedRecords||0,...(job?.code?{code:job.code}:{})};
 };
}
