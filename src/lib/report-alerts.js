import {backgroundSaves} from './background-saves.js';
import {reportHref} from '../../shared/report-routes.js';
// Achtergrondread na login; geen blokkade of extra opslag van account-/rapportdata.
export async function loadReportAlerts({request,activity=backgroundSaves}){
 const session=activity.session;let result;try{result=await request('report-alerts');}catch{return;}
 if(session!==activity.session||!Array.isArray(result?.alerts)||result.alerts.length>50)return;
 for(const alert of result.alerts){
  if(!alert||!/^[a-f0-9]{64}$/.test(alert.id)||typeof alert.artist!=='string'||!alert.artist.trim()||alert.artist.length>160||/[\x00-\x1f]/.test(alert.artist)||typeof alert.concertId!=='string'||!alert.concertId||alert.concertId.length>240||/[\x00-\x1f/\\]/.test(alert.concertId)||!/^\d{4}-\d{2}-\d{2}$/.test(alert.date)||!Number.isFinite(Date.parse(alert.date+'T12:00:00Z'))||new Date(alert.date+'T12:00:00Z').toISOString().slice(0,10)!==alert.date)continue;
  const date=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'}).format(new Date(alert.date+'T12:00:00Z'));
  activity.notice({key:'report-pdf:'+alert.id,label:'PDF niet gegenereerd',route:reportHref({concertId:alert.concertId}),message:`De PDF van ${alert.artist} (${date}) kon niet worden gegenereerd. De online rapportage is wel beschikbaar.`});
 }
}
