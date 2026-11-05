// Tijdelijke beleidsregel op één plaats. Later uitschakelen/vervangen zonder UI-wijziging.
function esmojoHomeManagerPolicy_(){return{enabled:true,email:ESMOJO_SUPER_ADMIN_EMAIL,role:'event-safety-manager',source:'temporary-gashouder-v1'};}
function esmojoHomeAssignments_(folder){
 const file=esmojoShowFile_(folder,'_esmojo_show_assignments_v1.json');
 const document=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{managedBy:'ESMOJO/ShowAssignments-v1',classification:'vertrouwelijk',version:1,revision:0,assignments:[]};
 if(document.managedBy!=='ESMOJO/ShowAssignments-v1'||document.classification!=='vertrouwelijk'||document.version!==1||!Number.isSafeInteger(document.revision)||document.revision<0||!Array.isArray(document.assignments))throw Error('ASSIGNMENTS_INVALID');
 for(const link of document.assignments)if(!link||typeof link.concertId!=='string'||!link.concertId||link.concertId.length>240||/[\x00-\x1f/\\]/.test(link.concertId)||typeof link.userId!=='string'||!link.userId||link.userId.length>100||typeof link.role!=='string'||!link.role||link.role.length>80)throw Error('ASSIGNMENTS_INVALID');
 return{file,document};
}
function esmojoSyncHomeManagers_(root,production,index){
 const policy=esmojoHomeManagerPolicy_();if(!policy.enabled)return{state:'disabled'};
 const profilesFile=esmojoShowFile_(root,'_esmojo_accounts_v1.json');if(!profilesFile)return{state:'missing-account'};
 const profiles=JSON.parse(profilesFile.getBlob().getDataAsString('UTF-8')).profiles;if(!Array.isArray(profiles))throw Error('ASSIGNMENTS_INVALID');
 const matches=profiles.filter(profile=>typeof profile.email==='string'&&profile.email.toLowerCase()===policy.email.toLowerCase());
 if(matches.length!==1)return{state:matches.length?'ambiguous-account':'missing-account'};
 const target=matches[0];if(typeof target.id!=='string'||!target.id||target.id.length>100||!target.activated||target.disabled)return{state:'inactive-account'};
 const {file,document}=esmojoHomeAssignments_(production),known=new Set(document.assignments.map(link=>JSON.stringify([link.concertId,link.userId,link.role])));let changed=false;
 for(const row of index.concerts){
  if(row.venue!=='Gashouder'||row.city!=='Amsterdam')continue;
  const key=JSON.stringify([row.concertId,target.id,policy.role]);if(known.has(key))continue;
  document.assignments.push({concertId:row.concertId,userId:target.id,role:policy.role,source:policy.source,createdAt:new Date().toISOString()});known.add(key);changed=true;
 }
 if(changed){
  document.revision++;const text=JSON.stringify(document,null,2),saved=file?(file.setContent(text),file):production.createFile(Utilities.newBlob(text,'application/json','_esmojo_show_assignments_v1.json'));
  if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('VERIFY');
 }
 return{state:'ready'};
}
