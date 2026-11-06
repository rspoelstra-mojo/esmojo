import {backgroundSaves} from './background-saves.js';
export async function loadShowStorageAlerts({request,activity=backgroundSaves}){
 const session=activity.session;let response;try{response=await request('show-storage-alerts');}catch{return;}
 if(session!==activity.session||!Array.isArray(response?.alerts)||response.alerts.length>1000)return;
 for(const alert of response.alerts){const id=alert?.key;if(typeof id!=='string'||!id||id.length>240||/[\x00-\x1f/\\]/.test(id))continue;
  activity.notice({key:'show-storage:'+id,label:'Drive-opslag niet bevestigd',route:'/shows/'+encodeURIComponent(id),message:'De overdracht naar Drive is nog niet bevestigd. Je gegevens zijn behouden. ESMOJO probeert de overdracht opnieuw.'});
 }
}
