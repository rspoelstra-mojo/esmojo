// Gegenereerd uit shared/active-show-storage.js.
// Opslagcontract: uitsluitend bewerkbare voorbereiding en technische versies.
// Bestanden, ticketinhoud, bezoekersherkomst en incidenten blijven in Drive.
const activeSnapshotKeys=['version','concertId','aliases','dates','venue','profile','final','production','floor','ticketBasis','risk','riskBasis','completion'];
function archiveAfterShow(dates){
 if(!Array.isArray(dates)||!dates.length||dates.some(day=>!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day))throw Error('VALIDATION');
 const last=[...dates].sort().at(-1),day=new Date(Date.parse(last+'T00:00:00Z')+2*86400000).toISOString().slice(0,10),target=Date.parse(day+'T00:00:00Z');let instant=target;
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const p=Object.fromEntries(format.formatToParts(new Date(instant)).map(part=>[part.type,part.value]));instant+=target-Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);}
 return new Date(instant).toISOString();
}
function preparationBasis(state){return JSON.stringify([state.profile.revision,state.final.revision,state.ticketBasis]);}
const forbidden=new Set(['base64','pdfBase64','workflow_json','ticket_sales','visitor_origins','domestic_origins','soldTickets','ticketReference','floorPressure','researchByNumber','accounts','csv','rows','density','count','area']);
function validateActiveSnapshot(state){
 if(!state||Object.keys(state).sort().join()!==[...activeSnapshotKeys].sort().join()||state.version!==1||!state.concertId||!Array.isArray(state.aliases)||!state.aliases.includes(state.concertId)||state.venue!=='Gashouder')throw Error('STORAGE_CONTRACT');
 if(!Array.isArray(state.dates)||!state.dates.length||state.dates.some(day=>!/^\d{4}-\d{2}-\d{2}$/.test(day)))throw Error('STORAGE_CONTRACT');
 if(state.aliases.length!==state.dates.length||new Set(state.aliases).size!==state.aliases.length||state.aliases.some(id=>typeof id!=='string'||!id||id.length>240||/[\x00-\x1f/\\]/.test(id)))throw Error('STORAGE_CONTRACT');
 const allowed=(doc,keys)=>{if(!doc||Object.keys(doc).some(key=>!keys.includes(key)))throw Error('STORAGE_CONTRACT');};
 allowed(state.profile,['managedBy','classification','concertId','revision','analyses']);
 allowed(state.final,['managedBy','classification','concertId','revision','categories','history']);
 allowed(state.production,['managedBy','classification','concertId','revision','choices','history','barrier','barrierUploads','operationalReviews','measureImplementations','measureUploads']);
 if(state.floor!==null)allowed(state.floor,['revision','completed','riskLevel','note','active']);
 allowed(state.ticketBasis,['ready','versions']);allowed(state.risk,['state','risks','source']);
 if(!state.completion||Object.keys(state.completion).sort().join()!=='measures,operational,production,profile'||Object.values(state.completion).some(value=>typeof value!=='boolean'))throw Error('STORAGE_CONTRACT');
 if(!state.profile||!state.final||!state.production||[state.profile,state.final,state.production].some(doc=>doc.concertId!==state.concertId||!Number.isSafeInteger(doc.revision)||doc.revision<0))throw Error('STORAGE_CONTRACT');
 // ticketBasis is uitsluitend de technische revisie; geen veldinhoud/aantallen.
 if(typeof state.ticketBasis?.ready!=='boolean'||!Array.isArray(state.ticketBasis.versions)||state.ticketBasis.versions.length!==3||state.ticketBasis.versions.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('STORAGE_CONTRACT');
 const scan=(value,parent='')=>{if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(forbidden.has(key)||key==='visitors'&&parent!=='categories')throw Error('STORAGE_CONTRACT');scan(item,key);}};scan(state);
 if(JSON.stringify(state).length>1500000)throw Error('STORAGE_CONTRACT');return state;
}
