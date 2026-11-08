// Vertrouwelijke, atomair gepubliceerde dagstand. Lezen scant nooit rapporten.
function esmojoIncidentDailyRegister_(){
 const folder=DriveApp.getFolderById(ESMOJO_FOLDER_ID),file=esmojoShowFile_(folder,'_esmojo_incident_daily_v1.json');
 const document=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{managedBy:'ESMOJO/IncidentDaily-v1',classification:'vertrouwelijk',version:1,published:null,building:null};
 if(document.managedBy!=='ESMOJO/IncidentDaily-v1'||document.classification!=='vertrouwelijk'||document.version!==1||document.published&&(!validTimetableDate(document.published.day)||!Number.isFinite(Date.parse(document.published.updatedAt))||!document.published.payload)||document.building&&(!validTimetableDate(document.building.day)||!Number.isFinite(Date.parse(document.building.startedAt))))throw Error('CONFLICT');
 return{folder,file,document};
}
function esmojoIncidentDailySave_(storage){
 const text=JSON.stringify(storage.document);if(text.length>3000000)throw Error('VALIDATION');
 const saved=storage.file?(storage.file.setContent(text),storage.file):storage.folder.createFile(Utilities.newBlob(text,'application/json','_esmojo_incident_daily_v1.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('VERIFY');
}
function esmojoIncidentDailyState_(document){
 const now=new Date(),day=Utilities.formatDate(now,'Europe/Amsterdam','yyyy-MM-dd'),midnight=Utilities.formatDate(now,'Europe/Amsterdam','HH')==='00',building=document.building;
 const continuing=building?.day===day&&now.getTime()-Date.parse(building.startedAt)<4*60*60*1000;
 return{day,needsUpdate:!document.published||document.published.day<day&&(midnight||continuing),initialized:Boolean(document.published),workerVersion:3};
}
function esmojoIncidentDaily_(request){
 const op=request.operation,allowed={'incident-daily-read':['operation','actor','referencesOnly'],'incident-daily-state':['operation','worker'],'incident-daily-start':['operation','worker'],'incident-daily-publish':['operation','worker','day','payload']}[op];
 if(!allowed||Object.keys(request).some(key=>!allowed.includes(key)))throw Error('VALIDATION');
 if(op==='incident-daily-read'){
  if(request.referencesOnly!==undefined&&typeof request.referencesOnly!=='boolean')throw Error('VALIDATION');
  esmojoIncidentActor_(request.actor,request.referencesOnly!==true);
 }else if(request.worker!==true)throw Error('FORBIDDEN');
 const storage=esmojoIncidentDailyRegister_(),document=storage.document,published=document.published;
 if(op==='incident-daily-read'){
  if(!published)return{pending:false,references:null,progress:null,shows:[],score:null,updatedAt:null,day:null,status:'not-ready'};
  if(request.referencesOnly)return{references:published.payload.references,updatedAt:published.updatedAt,day:published.day,status:'ready'};
  return Object.assign({},published.payload,{pending:false,updatedAt:published.updatedAt,day:published.day,status:'ready'});
 }
 const state=esmojoIncidentDailyState_(document);
 if(op==='incident-daily-state')return state;
 if(op==='incident-daily-start'){
  if(state.needsUpdate&&document.building?.day!==state.day){document.building={day:state.day,startedAt:new Date().toISOString()};esmojoIncidentDailySave_(storage);}
  return state;
 }
 if(request.day!==state.day||!validTimetableDate(request.day))throw Error('SOURCE_CHANGED');
 // Eerste complete publicatie van deze Nederlandse kalenderdag wint. Geen
 // wijzigingen door herhaalde workflow, heropenen of een nieuwe upload overdag.
 if(published?.day===request.day)return{ok:true,unchanged:true};
 if(!state.needsUpdate||document.building?.day!==request.day)throw Error('FORBIDDEN');
 const payload=request.payload,refs=payload?.references;
 if(!payload||Object.keys(payload).sort().join()!=='pending,progress,references,score,shows,updatedAt'||payload.pending!==false||payload.score!==null||!Array.isArray(payload.shows)||payload.shows.length>10000||!Number.isFinite(Date.parse(payload.updatedAt))||!refs||!Number.isSafeInteger(refs.concerts)||refs.concerts<0||!Number.isFinite(refs.visitors)||refs.visitors<0||!Number.isSafeInteger(refs.visitorUnits)||refs.visitorUnits<0||refs.visitors!==refs.visitorUnits/40)throw Error('VALIDATION');
 const groups={security:['total','verbal','physical','mischief','evictions','arrests'],medical:['total','treatments','selfcare','unwell','contusion','ambulance']};
 for(const [group,keys]of Object.entries(groups))for(const key of keys){const row=refs.indicators?.[group]?.[key];if(!row||!Number.isSafeInteger(row.incidents)||row.incidents<0||row.visitors!==refs.visitors||row.visitorUnits!==refs.visitorUnits||row.rate!==(refs.visitors?row.incidents/refs.visitors*1000:null))throw Error('VALIDATION');}
 document.published={day:request.day,updatedAt:payload.updatedAt,payload};document.building=null;esmojoIncidentDailySave_(storage);return{ok:true,published:true};
}
