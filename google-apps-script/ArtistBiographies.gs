// Openbaar, expliciet toegestaan op 8 november 2026. Laatste goede tekst behouden.
function esmojoBiographyRegister_(){
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),file=esmojoShowFile_(root,'_esmojo_artist_biographies_v1.json');
 const document=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{managedBy:'ESMOJO/ArtistBiographies-v1',classification:'openbaar',version:1,biographies:{}};
 if(document.managedBy!=='ESMOJO/ArtistBiographies-v1'||document.classification!=='openbaar'||document.version!==1||!document.biographies||typeof document.biographies!=='object'||Array.isArray(document.biographies))throw Error('BIOGRAPHY_INVALID');
 for(const [id,row]of Object.entries(document.biographies))if(!validArtistId(id)||row.artistId!==id||typeof row.name!=='string'||!row.name||typeof row.text!=='string'||row.text.length<120||row.text.length>20000||!validTimetableDate(row.firstDate)||!validTimetableDate(row.lastDate)||typeof row.sourceUrl!=='string'||!/^https:\/\/(?:www\.)?mojo\.nl\/(?:[a-z0-9-]+\/?|concerten\/[\w%/-]+)$/.test(row.sourceUrl)||!Number.isFinite(Date.parse(row.capturedAt))||!/^[a-f0-9]{64}$/.test(row.seriesKey||''))throw Error('BIOGRAPHY_INVALID');
 return{root,file,document};
}
function esmojoArtistBiography_(artistIds){
 const biographies=esmojoBiographyRegister_().document.biographies;
 const rows=artistIds.map(id=>biographies[id]).filter(Boolean).sort((a,b)=>b.firstDate.localeCompare(a.firstDate)||b.capturedAt.localeCompare(a.capturedAt));
 if(!rows.length)return null;const row=rows[0];return{text:row.text,sourceUrl:row.sourceUrl,capturedAt:row.capturedAt,firstDate:row.firstDate};
}
function esmojoArtistBiographies_(request){
 if(request.operation==='biography-candidates'){
  if(Object.keys(request).join(',')!=='operation')throw Error('VALIDATION');
  const concerts=[...esmojoTimetableCatalogue_({allVenues:true}).values()].map(row=>({artist:row.artist,date:row.date,venue:row.venue,sourceUrl:row.sourceUrl||null}));
  const saved={};for(const [id,row]of Object.entries(esmojoBiographyRegister_().document.biographies))saved[id]={firstDate:row.firstDate};
  return{concerts,saved};
 }
 if(request.operation!=='biography-save'||Object.keys(request).sort().join(',')!=='biography,operation,series')throw Error('VALIDATION');
 const s=request.series,b=request.biography;
 if(!s||Object.keys(s).sort().join(',')!=='artistId,artistIds,firstDate,lastDate,name,seriesKey,venue'||!validArtistId(s.artistId)||!Array.isArray(s.artistIds)||!s.artistIds.length||s.artistIds.length>1000||!s.artistIds.every(validArtistId)||!s.artistIds.includes(s.artistId)||typeof s.name!=='string'||!s.name||s.name.length>200||s.artistId!=='a_'+esmojoOnTrackHash_(normalizeArtistName(s.name))||typeof s.venue!=='string'||!validTimetableDate(s.firstDate)||!validTimetableDate(s.lastDate)||s.seriesKey!==esmojoOnTrackHash_(s.artistId+'\n'+s.venue+'\n'+s.firstDate))throw Error('VALIDATION');
 if(!b||Object.keys(b).sort().join(',')!=='capturedAt,sourceUrl,text'||typeof b.text!=='string'||b.text.trim()!==b.text||b.text.length<120||b.text.length>20000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(b.text)||typeof b.sourceUrl!=='string'||!/^https:\/\/(?:www\.)?mojo\.nl\/(?:[a-z0-9-]+\/?|concerten\/[\w%/-]+)$/.test(b.sourceUrl)||!Number.isFinite(Date.parse(b.capturedAt))||Math.abs(Date.now()-Date.parse(b.capturedAt))>600000)throw Error('VALIDATION');
 const today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd'),days=(Date.parse(s.firstDate+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000;
 if(days<0||days>45)throw Error('VALIDATION');
 const ids=new Set(s.artistIds),venues=['Gashouder','Ziggo Dome','AFAS Live','GelreDome','Johan Cruijff ArenA','Rotterdam Ahoy'],concerts=[...esmojoTimetableCatalogue_({allVenues:true}).values()].filter(row=>venues.includes(row.venue)&&ids.has('a_'+esmojoOnTrackHash_(normalizeArtistName(row.artist))));
 if(!concerts.some(row=>row.date===s.firstDate&&row.venue===s.venue))throw Error('VALIDATION');
 const dates=[...new Set(concerts.map(row=>row.date))].sort(),index=dates.indexOf(s.firstDate);
 if(index<0||index>0&&nextTimetableDate(dates[index-1])===s.firstDate)throw Error('VALIDATION');
 let last=s.firstDate;for(let i=index+1;i<dates.length&&nextTimetableDate(last)===dates[i];i++)last=dates[i];if(last!==s.lastDate)throw Error('VALIDATION');
 const storage=esmojoBiographyRegister_(),previous=storage.document.biographies[s.artistId];
 if(previous&&previous.firstDate>=s.firstDate)return{unchanged:true};
 storage.document.biographies[s.artistId]={artistId:s.artistId,name:s.name,venue:s.venue,firstDate:s.firstDate,lastDate:s.lastDate,seriesKey:s.seriesKey,text:b.text,sourceUrl:b.sourceUrl,capturedAt:b.capturedAt};
 const body=JSON.stringify(storage.document);if(Utilities.newBlob(body).getBytes().length>8*1024*1024)throw Error('BIOGRAPHY_CAPACITY');
 const saved=storage.file?(storage.file.setContent(body),storage.file):storage.root.createFile(Utilities.newBlob(body,'application/json','_esmojo_artist_biographies_v1.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('VERIFY');return{saved:true};
}
