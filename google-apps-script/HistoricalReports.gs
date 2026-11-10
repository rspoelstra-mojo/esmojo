// Historische bronbestanden staan centraal in private OnTrack; metadata in Productie.
// Dit register verleent geen toegang: de bestaande ondertekende routes en actuele
// Reports-/Artists-rechten blijven verplicht. Import uitsluitend via de OIDC-worker.
function esmojoHistoricalRegister_(){
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),folder=folders.hasNext()?folders.next():null;
 if(folders.hasNext())throw Error('REPORT_CATALOG');if(!folder)return{entries:[],folder:null};
 const file=esmojoOnTrackFile_(folder,'_esmojo_historical_reports_v1.json');if(!file)return{entries:[],folder};
 const data=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
 if(data.managedBy!=='ESMOJO/HistoricalReports-v1'||data.classification!=='vertrouwelijk'||data.version!==1||!Array.isArray(data.entries)||data.entries.length>1000)throw Error('REPORT_CATALOG');
 const ids=new Set(),sources=new Set(),today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd');
 for(const row of data.entries){
  if(!row||typeof row.artist!=='string'||!row.artist.trim()||row.artist.length>160||/[\x00-\x1f/\\]/.test(row.artist)||typeof row.venue!=='string'||!row.venue||row.venue.length>160||typeof row.city!=='string'||!row.city||!validTimetableDate(row.date)||row.date>=today||!['', 'middag','avond'].includes(row.performance||'')||typeof row.seriesId!=='string'||!row.seriesId||!(row.sourceType==='tsc-historical'?row.ticket_sales===null&&esmojoTscShowDataValid_(row.showData):typeof row.ticket_sales==='string'&&/^\d{1,9}$/.test(row.ticket_sales)))throw Error('REPORT_CATALOG');
  const identity=row.identityArtist||row.artist;if(typeof identity!=='string'||identity.length>160||/[\x00-\x1f/\\]/.test(identity))throw Error('REPORT_CATALOG');
  const base=identity.normalize('NFC').trim().replace(/[\s_/\\]+/g,'-')+'_'+row.venue.normalize('NFC').trim().replace(/[\s_/\\]+/g,'-')+'_'+row.date.slice(8,10)+row.date.slice(5,7)+row.date.slice(0,4);
  const expected=base+(row.performance==='middag'?'_S1':row.performance==='avond'?'_S2':'');
  const source=row.source;
  if(row.concertId!==expected||ids.has(row.concertId)||!source||!/^[-\w]+$/.test(source.id||'')||sources.has(source.id)||!/^[-\w]+$/.test(source.folderId||'')||source.name!=='incidents_'+row.concertId+'.csv'||!Number.isSafeInteger(source.size)||source.size<1||source.size>2*1024*1024||!Number.isFinite(Date.parse(source.modifiedAt))||!/^[a-f0-9]{64}$/.test(source.sha256||''))throw Error('REPORT_CATALOG');
  if(row.concertFolderId!==undefined&&!/^[-\w]+$/.test(row.concertFolderId))throw Error('REPORT_CATALOG');
  ids.add(row.concertId);sources.add(source.id);
 }
 return{entries:data.entries,folder};
}
function esmojoHistoricalCatalogue_(){return esmojoHistoricalRegister_().entries.map(row=>({concertId:row.concertId,artist:row.artist,venue:row.venue,city:row.city,date:row.date,sourceUrl:null,active:false,historical:true,historicalSeriesId:row.seriesId,...(row.performance?{performance:row.performance}:{}),identityArtist:row.identityArtist||row.artist}));}
function esmojoHistoricalSources_(){return esmojoHistoricalRegister_().entries.filter(row=>row.importState!=='pending').map(row=>({id:row.source.id,name:row.source.name,modifiedAt:row.source.modifiedAt,mime:'text/csv',size:row.source.size,expectedHash:row.source.sha256,concertFolderId:row.concertFolderId||row.source.folderId,sourceFolderId:row.source.folderId,show:{key:row.concertId,name:row.artist,venue:row.venue,date:row.date,sourceUrl:null,origin:'historical',...(row.sourceType==='tsc-historical'?{sourceType:row.sourceType,showData:row.showData}:{}),...(row.performance?{performance:row.performance}:{})},validationVersion:'csv-web-v2'}));}
function esmojoHistoricalSourceFile_(source){
 const concert=esmojoHistoricalConcertFolder_(source.concertFolderId,source.show.key),file=DriveApp.getFileById(source.id),parents=file.getParents();
 const expected=source.sourceFolderId||source.concertFolderId;let contained=false,count=0;while(parents.hasNext()){count++;if(parents.next().getId()===expected)contained=true;}
 if(!contained||count!==1||file.isTrashed()||expected!==concert.getId()&&expected!==ESMOJO_ONTRACK_FOLDER_ID)throw Error('SOURCE_MISSING');
 return file;
}
function esmojoHistoricalConcertFolder_(folderId,concertId){
 const concert=DriveApp.getFolderById(folderId);if(concert.isTrashed()||concert.getName()!==concertId)throw Error('SOURCE_MISSING');
 const artists=concert.getParents();if(!artists.hasNext())throw Error('SOURCE_MISSING');const artist=artists.next();if(artists.hasNext()||artist.isTrashed())throw Error('SOURCE_MISSING');
 const productionParents=artist.getParents();if(!productionParents.hasNext())throw Error('SOURCE_MISSING');const production=productionParents.next();if(productionParents.hasNext()||production.getName()!=='Productie'||production.isTrashed())throw Error('SOURCE_MISSING');
 const roots=production.getParents();if(!roots.hasNext()||roots.next().getId()!==ESMOJO_FOLDER_ID||roots.hasNext())throw Error('SOURCE_MISSING');
 return concert;
}

function esmojoHistoricalPreparation_(show){
 const row=esmojoHistoricalRegister_().entries.find(row=>row.concertId===show.concertId);if(!row)throw Error('NOT_FOUND');
 const folder=esmojoHistoricalConcertFolder_(row.concertFolderId||row.source.folderId,row.concertId);
 const tickets=esmojoReadTicketData_(esmojoOnTrackFile_(folder,'bezoekersdata.json'),row.concertId),fields=JSON.parse(tickets.workflow_json).visitors.fields;
 return{concertId:row.concertId,...(row.sourceType==='tsc-historical'?{sourceType:row.sourceType,showData:row.showData}:{}),hasProfile:false,contacts:{},tickets:{sales:fields.ticket_sales?.completed_at?fields.ticket_sales.content:null,origins:null,shows:[{date:row.date}]},production:{},risks:{}};
}

function esmojoTscShowDataValid_(data){
 return Boolean(data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).sort().join(',')==='arrests,doors,end,evictions,start,visitors'&&['visitors','evictions','arrests'].every(key=>data[key]===null||Number.isSafeInteger(data[key])&&data[key]>=0&&data[key]<=999999999)&&['doors','start','end'].every(key=>data[key]===null||typeof data[key]==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(data[key])));
}
function esmojoTscTimetable_(show){
 if(show.sourceType!=='tsc-historical')return null;if(!esmojoTscShowDataValid_(show.showData))throw Error('REPORT_CATALOG');
 const entries=[];let date=show.date,last=null;
 for(const [key,kind,label]of [['doors','doors','Deuren open'],['start','act','Aanvang show'],['end','end','Einde show']]){
  const time=show.showData[key];if(time===null)continue;if(last!==null&&time<last)date=nextTimetableDate(date);last=time;
  entries.push({kind,label,publishedLabel:label,time,localDate:date,sourceType:'tsc-historical'});
 }
 return{status:entries.length?'available':'missing',entries,sourceType:'tsc-historical'};
}
