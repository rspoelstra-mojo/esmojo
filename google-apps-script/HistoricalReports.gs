// Historische bronbestanden blijven uitsluitend in private Productie-concertmappen.
// Dit register verleent geen toegang: de bestaande ondertekende routes en actuele
// Reports-/Artists-rechten blijven verplicht. Geen import-/schrijfendpoint.
function esmojoHistoricalRegister_(){
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),folder=folders.hasNext()?folders.next():null;
 if(folders.hasNext())throw Error('REPORT_CATALOG');if(!folder)return{entries:[],folder:null};
 const file=esmojoOnTrackFile_(folder,'_esmojo_historical_reports_v1.json');if(!file)return{entries:[],folder};
 const data=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
 if(data.managedBy!=='ESMOJO/HistoricalReports-v1'||data.classification!=='vertrouwelijk'||data.version!==1||!Array.isArray(data.entries)||data.entries.length>1000)throw Error('REPORT_CATALOG');
 const ids=new Set(),sources=new Set(),today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd');
 for(const row of data.entries){
  if(!row||typeof row.artist!=='string'||!row.artist.trim()||row.artist.length>160||/[\x00-\x1f/\\]/.test(row.artist)||typeof row.venue!=='string'||!row.venue||row.venue.length>160||typeof row.city!=='string'||!row.city||!validTimetableDate(row.date)||row.date>=today||!['', 'middag','avond'].includes(row.performance||'')||typeof row.seriesId!=='string'||!row.seriesId||typeof row.ticket_sales!=='string'||!/^\d{1,9}$/.test(row.ticket_sales))throw Error('REPORT_CATALOG');
  const base=row.artist.normalize('NFC').trim().replace(/[\s_/\\]+/g,'-')+'_'+row.venue.normalize('NFC').trim().replace(/[\s_/\\]+/g,'-')+'_'+row.date.slice(8,10)+row.date.slice(5,7)+row.date.slice(0,4);
  const expected=base+(row.performance==='middag'?'_S1':row.performance==='avond'?'_S2':'');
  const source=row.source;
  if(row.concertId!==expected||ids.has(row.concertId)||!source||!/^[-\w]+$/.test(source.id||'')||sources.has(source.id)||!/^[-\w]+$/.test(source.folderId||'')||source.name!=='incidents_'+row.concertId+'.csv'||!Number.isSafeInteger(source.size)||source.size<1||source.size>2*1024*1024||!Number.isFinite(Date.parse(source.modifiedAt))||!/^[a-f0-9]{64}$/.test(source.sha256||''))throw Error('REPORT_CATALOG');
  ids.add(row.concertId);sources.add(source.id);
 }
 return{entries:data.entries,folder};
}
function esmojoHistoricalCatalogue_(){return esmojoHistoricalRegister_().entries.map(row=>({concertId:row.concertId,artist:row.artist,venue:row.venue,city:row.city,date:row.date,sourceUrl:null,active:false,historical:true,historicalSeriesId:row.seriesId}));}
function esmojoHistoricalSources_(){return esmojoHistoricalRegister_().entries.map(row=>({id:row.source.id,name:row.source.name,modifiedAt:row.source.modifiedAt,mime:'text/csv',size:row.source.size,expectedHash:row.source.sha256,concertFolderId:row.source.folderId,show:{key:row.concertId,name:row.artist,venue:row.venue,date:row.date,sourceUrl:null,origin:'historical'},validationVersion:'csv-web-v2'}));}
function esmojoHistoricalSourceFile_(source){
 const file=DriveApp.getFileById(source.id),parents=file.getParents(),concert=DriveApp.getFolderById(source.concertFolderId);
 let contained=false;while(parents.hasNext())if(parents.next().getId()===concert.getId())contained=true;
 if(!contained||file.isTrashed()||concert.isTrashed()||concert.getName()!==source.show.key)throw Error('SOURCE_MISSING');
 const artists=concert.getParents();if(!artists.hasNext())throw Error('SOURCE_MISSING');const artist=artists.next();if(artists.hasNext()||artist.isTrashed())throw Error('SOURCE_MISSING');
 const productionParents=artist.getParents();if(!productionParents.hasNext())throw Error('SOURCE_MISSING');const production=productionParents.next();if(productionParents.hasNext()||production.getName()!=='Productie'||production.isTrashed())throw Error('SOURCE_MISSING');
 const roots=production.getParents();if(!roots.hasNext()||roots.next().getId()!==ESMOJO_FOLDER_ID||roots.hasNext())throw Error('SOURCE_MISSING');
 return file;
}
