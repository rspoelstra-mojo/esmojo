// Openbare concertindex; eigenlijke concertbestanden staan onder hun concertmap.
// Alleen de server en de vaste, geverifieerde importworkflow mogen dit aanroepen.
function esmojoShows_(input) {
  const secret = PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
  if (!secret || secret.length < 32 || typeof input.body !== 'string' || input.body.length > 6000000
      || !Number.isSafeInteger(input.timestamp) || Math.abs(Date.now() - input.timestamp) > 120000
      || !/^[a-f0-9]{32}$/.test(input.nonce || '') || !/^[a-f0-9]{64}$/.test(input.signature || '')) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  const hex = bytes => bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  const digest = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input.body, Utilities.Charset.UTF_8));
  const expected = hex(Utilities.computeHmacSha256Signature('shows\n' + input.timestamp + '\n' + input.nonce + '\n' + digest, secret, Utilities.Charset.UTF_8));
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ input.signature.charCodeAt(i);
  if (difference) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  // Deze webapp draait altijd als de eigenaar. Een eigen UserLock serialiseert
  // imports, zonder de ScriptLock van accountbeheer tijdens Drive-I/O te bezetten.
  // Lezers gebruiken de laatst atomair gepubliceerde index en hoeven niet te wachten.
  const lock = (['dataverse-ensure','pilot-ensure','sync', 'profile-save','show-open','home-photo-cache','reference-install','biography-save','biography-initial-save','biography-initial-batch','incident-counts','incident-daily-start','incident-daily-publish'].includes(JSON.parse(input.body).operation) || /^(active-|ticket-|final-|report-|risk-|measure-|barrier-|floor-)/.test(String(JSON.parse(input.body).operation))) ? LockService.getUserLock() : null;
  if (lock && !lock.tryLock(20000)) return esmojoReply_({ ok: false, code: 'BUSY' });
  try {
    const request = JSON.parse(input.body);
    if(request.operation==='migration-list'){
      if(Object.keys(request).join(',')!=='operation')throw Error('VALIDATION');
      const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie');
      if(!folders.hasNext())return esmojoReply_({ok:true,data:{concerts:[]}});
      const folder=folders.next();if(folders.hasNext())throw Error('CONFLICT');
      const file=esmojoShowFile_(folder,'_esmojo_shows_v1.json');
      if(!file)return esmojoReply_({ok:true,data:{concerts:[]}});
      const state=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
      if(state.version!==1||!Array.isArray(state.concerts))throw Error('CONFLICT');
      return esmojoReply_({ok:true,data:{concerts:state.concerts.filter(row=>row.generalConcertId===row.concertId).map(row=>({concertId:row.concertId,artist:row.artist,venue:row.venue||'Gashouder',date:row.date}))}});
    }
    if(request.operation==='research-identities'){
      if(Object.keys(request).sort().join(',')!=='operation,sourceKeys'||!Array.isArray(request.sourceKeys)||request.sourceKeys.length>500||request.sourceKeys.some(key=>typeof key!=='string'||key.length>200||/[\x00-\x1f/\\]/.test(key)))throw Error('VALIDATION');
      return esmojoReply_({ok:true,data:esmojoDataverseIdentities_(request.sourceKeys)});
    }
    if(request.operation==='dataverse-ensure'){
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);
      return esmojoReply_({ok:true,data:esmojoEnsureDataverseShow_(request)});
    }
    if(request.operation==='pilot-ensure'){
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);
      return esmojoReply_({ok:true,data:esmojoEnsureDataversePilot_(request)});
    }
    if(String(request.operation).startsWith('incident-')){
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);
      return esmojoReply_({ok:true,data:esmojoIncidentMetrics_(request)});
    }
    if(['biography-candidates','biography-save','biography-initial-list','biography-initial-save','biography-initial-batch'].includes(request.operation)){
      if(['biography-save','biography-initial-save','biography-initial-batch'].includes(request.operation)){const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);}
      return esmojoReply_({ok:true,data:esmojoArtistBiographies_(request)});
    }
    if(request.operation==='artist-show')return esmojoReply_({ok:true,data:esmojoArtistShow_(request)});
    if(request.operation==='artist-profile')return esmojoReply_({ok:true,data:esmojoArtistProfile_(request)});
    if(request.operation==='artist-catalogue')return esmojoReply_({ok:true,data:esmojoArtistCatalogue_(request)});
    if(['reference-read','reference-install'].includes(request.operation)){const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);return esmojoReply_({ok:true,data:esmojoBarrierReference_(request)});}
    const finish=data=>esmojoReply_({ok:true,data:typeof esmojoHomeResult_==='function'?esmojoHomeResult_(request,data):data});
    if(request.operation.startsWith('active-')){const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);return esmojoReply_({ok:true,data:esmojoActiveStorage_(request)});}
    if(typeof esmojoActiveLegacyWriteAllowed_==='function'&&/^(profile-save|final-complete|risk-(production|operational)-save|barrier-(draft|complete|reopen|upload|remove-upload)|floor-(draft|complete|reopen)|measure-(draft|complete|reopen|edit-text|upload|remove)|ticket-(review|reopen))$/.test(request.operation))esmojoActiveLegacyWriteAllowed_(request.concertId);
    if(['home-rebuild','home-photo-cache'].includes(request.operation)){const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);return finish(request.operation==='home-rebuild'?esmojoHomeRebuild_(request):esmojoHomePhotosSave_(request));}
    if(!['report-commit','barrier-upload','measure-upload'].includes(request.operation)&&input.body.length>110000)throw Error('VALIDATION');
    if(['home-dashboard','home-metadata'].includes(request.operation)){
      return esmojoReply_({ok:true,data:esmojoHomeDashboard_(request)});
    }
    if(request.operation==='show-open'){
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);
      return esmojoReply_({ok:true,data:esmojoOpenShow_(request)});
    }
    if(/^(barrier-|floor-)/.test(request.operation)){
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);
      return finish(request.operation.startsWith('barrier-')?esmojoBarrierLayout_(request):esmojoFloorPressure_(request));
    }
    if(request.operation.startsWith('measure-')){
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);return finish(esmojoMeasureImplementation_(request));
    }
    if(request.operation.startsWith('risk-')){
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);
      return finish(esmojoShowProfileRisks_(request));
    }
    if(request.operation.startsWith('report-')){
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);
      return finish(esmojoShowProfilePdf_(request));
    }
    if (request.operation.startsWith('final-')) {
      const cache=CacheService.getScriptCache(),key='shows:'+input.nonce;if(cache.get(key))throw Error('FORBIDDEN');cache.put(key,'1',180);
      return finish(esmojoAnalysisFinal_(request));
    }
    if (request.operation.startsWith('ticket-')) {
      const cache = CacheService.getScriptCache(), key = 'shows:' + input.nonce;
      if (cache.get(key)) throw Error('FORBIDDEN'); cache.put(key, '1', 180);
      return finish(esmojoTicketData_(request));
    }
    if (['profile-read', 'profile-save'].includes(request.operation)) {
      if (request.operation === 'profile-save') {
        const cache = CacheService.getScriptCache(), key = 'shows:' + input.nonce;
        if (cache.get(key)) throw new Error('FORBIDDEN');
        cache.put(key, '1', 180);
      }
      return finish(esmojoShowProfile_(request));
    }
    if (!['list', 'sync'].includes(request.operation)) throw new Error();
    const esmojo = DriveApp.getFolderById(ESMOJO_FOLDER_ID);
    if (esmojo.isTrashed()) throw new Error();
    const productionFolders = esmojo.getFoldersByName('Productie');
    let root = productionFolders.hasNext() ? productionFolders.next() : null;
    if (productionFolders.hasNext()) throw new Error('PRODUCTION_DUPLICATE');
    if (!root && request.operation === 'list') return esmojoReply_({ ok: true, data: { concerts: [], checkedAt: null } });
    if (!root) root = esmojo.createFolder('Productie');
    const indexFile = esmojoShowFile_(root, '_esmojo_shows_v1.json');
    const state = indexFile ? JSON.parse(indexFile.getBlob().getDataAsString('UTF-8')) : { version: 1, concerts: [], active: [], checkedAt: null };
    if (state.version !== 1 || !Array.isArray(state.concerts) || !Array.isArray(state.active)) throw new Error();
    if (request.operation === 'list') {
      const active = new Set(state.active);
      return esmojoReply_({ ok: true, data: { checkedAt: state.checkedAt, concerts: state.concerts.filter(row => active.has(row.concertId)).map(row => ({ concertId: row.concertId, artist: row.artist, date: row.date, venue: 'Gashouder', city: 'Amsterdam', sourceUrl: row.sourceUrl })) } });
    }
    // HMAC bindt de payload; herhalingen binnen het tijdvenster worden geweigerd.
    const cache = CacheService.getScriptCache(), nonceKey = 'shows:' + input.nonce;
    if (cache.get(nonceKey)) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
    cache.put(nonceKey, '1', 180);
    const snapshot = request.snapshot;
    if (!snapshot || !Array.isArray(snapshot.concerts) || snapshot.concerts.length > 400
        || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.from) || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.until)
        || snapshot.from !== Utilities.formatDate(new Date(), 'Europe/Amsterdam', 'yyyy-MM-dd')
        || Date.parse(snapshot.until) - Date.parse(snapshot.from) !== 365 * 86400000
        || !Number.isFinite(Date.parse(snapshot.checkedAt)) || Math.abs(Date.now() - Date.parse(snapshot.checkedAt)) > 600000) throw new Error();
    const incoming = new Set();
    for (const row of snapshot.concerts) {
      if (!row || typeof row.artist !== 'string' || !row.artist.trim() || row.artist.length > 160 || /[\x00-\x1f]/.test(row.artist)
          || row.venue !== 'Gashouder' || row.city !== 'Amsterdam' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)
          || row.date < snapshot.from || row.date >= snapshot.until || new Date(row.date).toISOString().slice(0, 10) !== row.date
          || row.concertId !== esmojoConcertId_(row.artist, row.date) || incoming.has(row.concertId)
          || typeof row.sourceUrl !== 'string' || !/^https:\/\/www\.mojo\.nl\/(agenda|concerten\/[\w%/-]+)(\?[^#\s]*)?$/.test(row.sourceUrl)) throw new Error();
      incoming.add(row.concertId);
    }
    // Historische datums bewaren: een reeks wisselt niet van algemene map zodra
    // de eerste show voorbij is. Verdwenen shows verdwijnen alleen uit het menu.
    const history = new Map(state.concerts.map(row => [row.concertId, row]));
    for (const row of snapshot.concerts) {
      const old = history.get(row.concertId);
      if (old && esmojoArtistKey_(old.artist) !== esmojoArtistKey_(row.artist)) throw new Error();
      history.set(row.concertId, Object.assign({}, old || {}, row));
    }
    const rows = Array.from(history.values()).sort((a, b) => esmojoArtistKey_(a.artist).localeCompare(esmojoArtistKey_(b.artist)) || a.date.localeCompare(b.date));
    const groups = [];
    for (const row of rows) {
      const group = groups[groups.length - 1], last = group && group[group.length - 1];
      if (last && !last.dataverseSourceKey && !row.dataverseSourceKey && esmojoArtistKey_(last.artist) === esmojoArtistKey_(row.artist) && last.venue === row.venue && Date.parse(row.date) - Date.parse(last.date) === 86400000) group.push(row);
      else groups.push([row]);
    }
    // Twee al bestaande reeksen niet stilzwijgend samenvoegen: hun latere
    // gebruikersdocumenten zouden een expliciete opslagkeuze vereisen.
    for (const group of groups) if (new Set(group.map(row => row.generalFileId).filter(Boolean)).size > 1) throw new Error('SERIES_CONFLICT');
    let createdArtists = 0, createdConcerts = 0;
    const folders = new Map();
    const children = root.getFolders();
    while (children.hasNext()) {
      const folder = children.next(), key = esmojoArtistKey_(folder.getName());
      if (folders.has(key)) throw new Error('ARTIST_DUPLICATE');
      folders.set(key, folder);
    }
    for (const group of groups) {
      // Onaangeraakte historische reeksen hebben geen dagelijks schrijfwerk nodig.
      if (!group.some(row => incoming.has(row.concertId))) continue;
      const first = group[0], key = esmojoArtistKey_(first.artist);
      let artistFolder = folders.get(key);
      if (!artistFolder) { artistFolder = root.createFolder(first.artist); folders.set(key, artistFolder); createdArtists++; }
      for (const row of group) {
        let folder;
        const matches = artistFolder.getFoldersByName(row.concertId);
        if (matches.hasNext()) { folder = matches.next(); if (matches.hasNext()) throw new Error('CONCERT_DUPLICATE'); }
        else { folder = artistFolder.createFolder(row.concertId); createdConcerts++; }
        row.folderId = folder.getId();
      }
      const generalFolder = DriveApp.getFolderById(first.folderId);
      const oldGeneral = group.find(row => row.generalFileId);
      if (oldGeneral && oldGeneral.concertId !== first.concertId && typeof esmojoMoveResearch_ === 'function') {
        if(typeof esmojoMoveShowProfilePdf_==='function')esmojoMoveShowProfilePdf_(DriveApp.getFolderById(oldGeneral.folderId),generalFolder,oldGeneral.concertId,first.concertId);
        if (typeof esmojoMoveAnalysisFinal_ === 'function') esmojoMoveAnalysisFinal_(DriveApp.getFolderById(oldGeneral.folderId),generalFolder,oldGeneral.concertId,first.concertId);
        if(typeof esmojoMoveProductionRisks_==='function')esmojoMoveProductionRisks_(DriveApp.getFolderById(oldGeneral.folderId),generalFolder,oldGeneral.concertId,first.concertId);
        if (typeof esmojoMoveTicketData_ === 'function') esmojoMoveTicketData_(DriveApp.getFolderById(oldGeneral.folderId), generalFolder, oldGeneral.concertId, first.concertId);
        esmojoMoveShowProfile_(DriveApp.getFolderById(oldGeneral.folderId), generalFolder, oldGeneral.concertId, first.concertId);
        esmojoMoveResearch_(DriveApp.getFolderById(oldGeneral.folderId), generalFolder, oldGeneral.concertId, first.concertId);
      }
      let generalFile = esmojoShowFile_(generalFolder, 'algemeen.json');
      if (!generalFile && oldGeneral && oldGeneral.concertId !== first.concertId) {
        // Alleen ons eigen gegenereerde algemene bestand verplaatsen, geen
        // omgevingsanalyses, incidentrapporten of andere gebruikersdocumenten.
        const oldFolder = DriveApp.getFolderById(oldGeneral.folderId);
        const candidate = esmojoShowFile_(oldFolder, 'algemeen.json');
        if (candidate && candidate.getId() === oldGeneral.generalFileId) { candidate.moveTo(generalFolder); generalFile = candidate; }
      }
      generalFile = esmojoWriteShowJson_(generalFolder, generalFile, 'algemeen.json', {
        version: 1, concertId: first.concertId, artist: first.artist, venue: 'Gashouder', city: 'Amsterdam',
        dates: group.map(row => row.date), sources: Array.from(new Set(group.map(row => row.sourceUrl))),
      });
      for (const row of group) {
        const folder = DriveApp.getFolderById(row.folderId);
        esmojoWriteShowJson_(folder, esmojoShowFile_(folder, 'concert.json'), 'concert.json', {
          version: 1, concertId: row.concertId, date: row.date,
          generalConcertId: first.concertId, generalFolderId: first.folderId,
        });
        delete row.generalFileId;
        row.generalConcertId = first.concertId;
        row.generalFolderId = first.folderId;
      }
      first.generalFileId = generalFile.getId();
    }
    const updated = { version: 1, concerts: rows, active: Array.from(incoming), checkedAt: snapshot.checkedAt };
    esmojoWriteShowJson_(root, indexFile, '_esmojo_shows_v1.json', updated);
    // De import en herhaalbare backfill delen dezelfde centrale regel; toewijzingen
    // staan uitsluitend in hun eigen vertrouwelijke register, nooit in deze index.
    let managerAssignment=null;
    if(typeof esmojoSyncHomeManagers_==='function'){try{managerAssignment=esmojoSyncHomeManagers_(esmojo,root,updated);}catch{managerAssignment={state:'unavailable'};}}
    return esmojoReply_({ ok: true, data: { ...(managerAssignment?{managerAssignment:managerAssignment.state}:{}), concerts: incoming.size, artists: new Set(snapshot.concerts.map(row => esmojoArtistKey_(row.artist))).size, createdArtists, createdConcerts } });
  } catch (error) { return esmojoReply_({ ok: false, code: ['FORBIDDEN','DASHBOARD_UNAVAILABLE','TICKET_CONFLICT','VALIDATION','PROFILE_CONFLICT','FINAL_CONFLICT','FINAL_NOT_READY','REPORT_NOT_READY','REPORT_CONFLICT','REPORT_UNAVAILABLE','NOT_FOUND','CONFLICT','SOURCE_CHANGED','VERIFY','ASSESSMENT_CONFLICT','ASSESSMENT_COMPLETED','ATTACHMENT_INVALID','STORAGE_BUSY','STORAGE_ARCHIVED','STORAGE_CONTRACT','STORAGE_ACTIVE'].includes(error.message) ? error.message : 'SHOWS_UNAVAILABLE' }); }
  finally { if (lock) lock.releaseLock(); }
}

// Eenmalige, idempotente showaanmaak op expliciet openen; overige zalen blijven gesloten.
function esmojoEnsureDataversePilot_(request){
  if(Object.keys(request).sort().join(',')!=='concertId,operation'||request.concertId!=='Hatsune-Miku_AFAS-Live_15112026')throw Error('VALIDATION');
  const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID);if(root.isTrashed())throw Error('NOT_FOUND');
  const folders=root.getFoldersByName('Productie');let production=folders.hasNext()?folders.next():null;if(folders.hasNext())throw Error('CONFLICT');
  if(!production)production=root.createFolder('Productie');
  const file=esmojoShowFile_(production,'_esmojo_shows_v1.json');
  const state=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{version:1,concerts:[],active:[],checkedAt:null};
  if(state.version!==1||!Array.isArray(state.concerts)||!Array.isArray(state.active))throw Error('CONFLICT');
  const existing=state.concerts.filter(row=>row.concertId===request.concertId);
  if(existing.length){if(existing.length!==1||existing[0].artist!=='Hatsune Miku'||existing[0].venue!=='AFAS Live'||existing[0].date!=='2026-11-15')throw Error('CONFLICT');return{ready:true};}
  const artists=production.getFoldersByName('Hatsune Miku');let artist=artists.hasNext()?artists.next():null;if(artists.hasNext())throw Error('CONFLICT');if(!artist)artist=production.createFolder('Hatsune Miku');
  const concerts=artist.getFoldersByName(request.concertId);let folder=concerts.hasNext()?concerts.next():null;if(concerts.hasNext())throw Error('CONFLICT');if(!folder)folder=artist.createFolder(request.concertId);
  const row={concertId:request.concertId,artist:'Hatsune Miku',date:'2026-11-15',venue:'AFAS Live',city:'Amsterdam',sourceUrl:'https://www.mojo.nl/agenda',folderId:folder.getId(),generalConcertId:request.concertId,generalFolderId:folder.getId()};
  const general=esmojoWriteShowJson_(folder,esmojoShowFile_(folder,'algemeen.json'),'algemeen.json',{version:1,concertId:row.concertId,artist:row.artist,venue:row.venue,city:row.city,dates:[row.date],sources:[]});
  esmojoWriteShowJson_(folder,esmojoShowFile_(folder,'concert.json'),'concert.json',{version:1,concertId:row.concertId,date:row.date,generalConcertId:row.concertId,generalFolderId:row.folderId});
  row.generalFileId=general.getId();state.concerts.push(row);
  esmojoWriteShowJson_(production,file,'_esmojo_shows_v1.json',state);
  return{ready:true};
}
function esmojoDataverseSlug_(value){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function esmojoDataverseIdentities_(keys){
 const concerts=[];
 if(typeof ESMOJO_ONTRACK_FOLDER_ID!=='undefined'){
  const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),file=esmojoShowFile_(folder,'_esmojo_ontrack_concerts_v1.json');
  if(file){const state=JSON.parse(file.getBlob().getDataAsString('UTF-8'));if(state.version!==1||!Array.isArray(state.concerts))throw Error('CONFLICT');
   for(const row of state.concerts){const key=esmojoDataverseSlug_(row.artist)+'_'+esmojoDataverseSlug_(row.venue)+'_'+row.date.replace(/-/g,'');if(keys.some(source=>source===key))concerts.push({artist:row.artist,venue:row.venue,city:row.city,date:row.date,sourceUrl:row.sourceUrl});}}
 }
 return{concerts};
}
function esmojoEnsureDataverseShow_(request){
 const show=request.show,validText=(value,max)=>typeof value==='string'&&value.trim()&&value.length<=max&&!/[\x00-\x1f]/.test(value);
 if(Object.keys(request).sort().join(',')!=='operation,show'||!show||!validText(show.sourceKey,200)||/[\/\\<>]/.test(show.sourceKey)||!validText(show.name,160)||!validText(show.venue,160)||typeof show.city!=='string'||show.city.length>120||/[\x00-\x1f]/.test(show.city)||!Array.isArray(show.dates)||show.dates.length!==1)throw Error('VALIDATION');
 const key=/^(.+)_([^_]+)_(\d{4})(\d{2})(\d{2})$/.exec(show.sourceKey),date=show.dates[0];
 if(!key||date!==key[3]+'-'+key[4]+'-'+key[5]||!Number.isFinite(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date||esmojoDataverseSlug_(show.name)!==esmojoDataverseSlug_(key[1])||esmojoDataverseSlug_(show.venue)!==esmojoDataverseSlug_(key[2])&&!(esmojoDataverseSlug_(show.venue)==='rotterdamahoy'&&esmojoDataverseSlug_(key[2])==='ahoy'))throw Error('VALIDATION');
 if(show.key!=='dataverse_'+show.sourceKey&&!(show.key==='Hatsune-Miku_AFAS-Live_15112026'&&show.sourceKey==='hatsunemiku_afaslive_20261115'))throw Error('VALIDATION');
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID);if(root.isTrashed())throw Error('NOT_FOUND');
 const folders=root.getFoldersByName('Productie');let production=folders.hasNext()?folders.next():null;if(folders.hasNext())throw Error('CONFLICT');if(!production)production=root.createFolder('Productie');
 const file=esmojoShowFile_(production,'_esmojo_shows_v1.json');
 const state=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{version:1,concerts:[],active:[],checkedAt:null};
 if(state.version!==1||!Array.isArray(state.concerts)||!Array.isArray(state.active))throw Error('CONFLICT');
 const matches=state.concerts.filter(row=>row.concertId===show.key||row.date===date&&esmojoDataverseSlug_(row.artist)===esmojoDataverseSlug_(show.name)&&esmojoDataverseSlug_(row.venue)===esmojoDataverseSlug_(show.venue));
 if(matches.length){if(matches.length!==1||matches[0].date!==date||esmojoDataverseSlug_(matches[0].artist)!==esmojoDataverseSlug_(show.name)||esmojoDataverseSlug_(matches[0].venue)!==esmojoDataverseSlug_(show.venue))throw Error('CONFLICT');return{concertId:matches[0].concertId};}
 const artists=production.getFoldersByName(show.name);let artist=artists.hasNext()?artists.next():null;if(artists.hasNext())throw Error('CONFLICT');if(!artist)artist=production.createFolder(show.name);
 const canonical=show.venue==='Gashouder'?esmojoConcertId_(show.name,date):show.key;
 const children=artist.getFoldersByName(canonical);let folder=children.hasNext()?children.next():null;if(children.hasNext())throw Error('CONFLICT');if(!folder)folder=artist.createFolder(canonical);
 const row={concertId:canonical,artist:show.name,date,venue:show.venue,city:show.city,sourceUrl:show.sourceUrl||'',dataverseSourceKey:show.sourceKey,folderId:folder.getId(),generalConcertId:show.key,generalFolderId:folder.getId()};
 const general=esmojoWriteShowJson_(folder,esmojoShowFile_(folder,'algemeen.json'),'algemeen.json',{version:1,concertId:row.concertId,artist:row.artist,venue:row.venue,city:row.city,dates:[date],sources:row.sourceUrl?[row.sourceUrl]:[]});
 esmojoWriteShowJson_(folder,esmojoShowFile_(folder,'concert.json'),'concert.json',{version:1,concertId:row.concertId,date,generalConcertId:row.concertId,generalFolderId:row.folderId});
 row.generalFileId=general.getId();state.concerts.push(row);esmojoWriteShowJson_(production,file,'_esmojo_shows_v1.json',state);
 return{concertId:row.concertId};
}
function esmojoArtistKey_(name) { return name.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); }
function esmojoConcertId_(artist, date) { return artist.normalize('NFC').trim().replace(/[\s_/\\]+/g, '-') + '_Gashouder_' + date.slice(8, 10) + date.slice(5, 7) + date.slice(0, 4); }
function esmojoShowFile_(folder, name) {
  const files = folder.getFilesByName(name), file = files.hasNext() ? files.next() : null;
  if (files.hasNext()) throw new Error('FILE_DUPLICATE');
  return file;
}
function esmojoWriteShowJson_(folder, file, name, data) {
  const json = JSON.stringify(Object.assign({ managedBy: 'ESMOJO/MOJO-v1' }, data), null, 2);
  if (file) {
    const current = file.getBlob().getDataAsString('UTF-8');
    // Een gelijknamig bestaand gebruikersbestand nooit overschrijven.
    if (JSON.parse(current).managedBy !== 'ESMOJO/MOJO-v1') throw new Error('FILE_NOT_MANAGED');
    if (current !== json) file.setContent(json);
    return file;
  }
  return folder.createFile(Utilities.newBlob(json, 'application/json', name));
}
