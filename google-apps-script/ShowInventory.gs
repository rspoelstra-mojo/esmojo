// Read-only metadata inventory. No active export/open/sync, leases or writes.
function esmojoInventoryHash_(value){
 const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.keys(value).sort().reduce((out,key)=>{out[key]=stable(value[key]);return out;},{}):value;
 return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(stable(value)),Utilities.Charset.UTF_8).map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join('');
}
function esmojoShowInventory_(request){
 if(Object.keys(request).sort().join(',')!=='concertId,operation'||typeof request.concertId!=='string'||!request.concertId||request.concertId.length>240||/[\x00-\x1f/\\]/.test(request.concertId))throw Error('VALIDATION');
 const target=esmojoResearchTarget_(request.concertId),id=target.primary.concertId,folders=[target.folder],dates=target.seriesDates;
 // Include date-specific concert folders, not only the shared primary folder.
 const artistFolder=target.folder.getParents().next(),siblings=artistFolder.getFolders(),wanted=new Set(dates.map(date=>target.primary.venue==='Gashouder'?esmojoConcertId_(target.primary.artist,date):target.primary.concertId));
 while(siblings.hasNext()){const folder=siblings.next();if(folder.getId()!==target.folder.getId()&&wanted.has(folder.getName()))folders.push(folder);}
 const documents={},manifest=[],issues=[];let bytes=0,unknown=0,nestedFolders=0,changed=false,parsedBytes=0;
 const known={ 'concert.json':'concert','algemeen.json':'general','showprofiel.json':'profile','analyseafronding.json':'final','bezoekersdata.json':'tickets','productionele-risicos.json':'production','showprofiel-pdf.json':'pdf','_esmojo_active_storage_v1.json':'marker'};
 for(const folder of folders){
  const children=folder.getFolders();while(children.hasNext()){children.next();nestedFolders++;}
  const files=folder.getFiles();while(files.hasNext()){
   if(manifest.length>=500)throw Error('INVENTORY_LIMIT');
   const file=files.next(),filename=file.getName(),size=file.getSize(),modified=file.getLastUpdated().toISOString(),kind=known[filename]||(/^onderzoek_(?:0[1-9]|1[01])\.json$/.test(filename)?'research':/^showprofiel_risicos_v1_[a-f0-9]+\.json$/i.test(filename)?'risks':/^Tijdschema_.*\.json$/i.test(filename)?'timetable':file.getMimeType()==='application/pdf'?'pdf-file':/^(image\/)/.test(file.getMimeType())?'image':'unknown');
   bytes+=size;if(kind==='unknown')unknown++;
   const entry={reference:esmojoInventoryHash_(file.getId()),kind,bytes:size,modifiedAt:modified,primary:folder.getId()===target.folder.getId()};
   if(entry.primary&&['profile','final','tickets','production','pdf','marker'].includes(kind)){
    if(documents[kind]){issues.push('DUPLICATE_'+kind.toUpperCase());entry.valid=false;}
    else if(size>2097152||parsedBytes+size>4194304){issues.push('DOCUMENT_LIMIT');entry.valid=false;}
    else try{parsedBytes+=size;const doc=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
     if(doc.concertId!==id||!doc.managedBy||!['openbaar','vertrouwelijk'].includes(doc.classification))throw Error();
     documents[kind]=doc;entry.valid=true;entry.fingerprint=esmojoInventoryHash_(doc);
    }catch(error){issues.push('INVALID_'+kind.toUpperCase());entry.valid=false;}
   }
   if(file.getLastUpdated().toISOString()!==modified){changed=true;issues.push('SOURCE_CHANGED');}
   manifest.push(entry);
  }
 }
 const count=value=>value&&typeof value==='object'?Object.keys(value).length:0;
 const profile=documents.profile,final=documents.final,production=documents.production,tickets=documents.tickets,pdf=documents.pdf,marker=documents.marker;
 const dataset=(doc,items)=>({exists:Boolean(doc),revision:Number.isSafeInteger(doc&&doc.revision)?doc.revision:null,items:items||0,...(doc?{fingerprint:esmojoInventoryHash_(doc)}:{})});
 const datasets={profile:dataset(profile,count(profile&&profile.analyses)),final:dataset(final,count(final&&final.categories)),production:dataset(production,count(production&&production.choices)),tickets:dataset(tickets,0),pdf:dataset(pdf,count(pdf&&pdf.reports))};
 if(production){datasets.production.fingerprint=esmojoInventoryHash_(esmojoActiveSafeProduction_(production));datasets.production.floor=Boolean(production.floorPressure);datasets.production.barrier=Boolean(production.barrier);datasets.production.operational=count(production.operationalReviews);datasets.production.measures=count(production.measureImplementations);datasets.production.attachments=count(production.barrierUploads)+count(production.measureUploads);}
 if(profile)datasets.profile.completed=Object.values(profile.analyses||{}).filter(row=>row&&row.status==='completed').length;
 if(final)datasets.final.completed=Object.values(final.categories||{}).filter(row=>row&&row.completedAt).length;
 if(tickets){try{const workflow=JSON.parse(tickets.workflow_json);datasets.tickets.items=count(workflow.visitors&&workflow.visitors.fields);}catch(error){issues.push('INVALID_TICKETS');}datasets.tickets.leases=count(tickets.leases);}
 return{version:1,concertId:id,dates,scannedAt:new Date().toISOString(),folders:folders.length,expectedFolders:dates.length,files:manifest.length,bytes,unknown,nestedFolders,changed,datasets,marker:marker?{revision:marker.revision,archived:marker.archived===true,mode:['run','archive','sync'].includes(marker.mode)?marker.mode:'other',at:marker.at}:null,researchFiles:manifest.filter(row=>row.kind==='research').length,riskFiles:manifest.filter(row=>row.kind==='risks').length,manifest,issues:Array.from(new Set(issues))};
}
