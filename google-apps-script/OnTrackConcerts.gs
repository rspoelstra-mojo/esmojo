// Alleen openbare MOJO-metadata voor OnTrack; nooit de Productie/Shows-index.
function esmojoOnTrackConcerts_(input){
  const reply=(ok,data,code)=>esmojoReply_({ok,data,code});
  const secret=PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
  if(!secret||secret.length<32||typeof input.body!=='string'||input.body.length>1000000||!Number.isSafeInteger(input.timestamp)||Math.abs(Date.now()-input.timestamp)>120000||!/^[a-f0-9]{32}$/.test(input.nonce||'')||!/^[a-f0-9]{64}$/.test(input.signature||''))return reply(false,null,'FORBIDDEN');
  const hex=bytes=>bytes.map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join('');
  const digest=hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,input.body,Utilities.Charset.UTF_8)),expected=hex(Utilities.computeHmacSha256Signature('ontrack-concerts\n'+input.timestamp+'\n'+input.nonce+'\n'+digest,secret,Utilities.Charset.UTF_8));
  let difference=0;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^input.signature.charCodeAt(i);if(difference)return reply(false,null,'FORBIDDEN');
  const lock=LockService.getScriptLock();if(!lock.tryLock(20000))return reply(false,null,'BUSY');
  let stage='MAILING_CONCERTS_REGISTER';
  try{
    const request=JSON.parse(input.body);
    if(!['list','sync'].includes(request.operation)||Object.keys(request).some(key=>!['operation','actor','snapshot'].includes(key)))throw Error();
    if(request.operation==='list'){
      const files=DriveApp.getFolderById(ESMOJO_FOLDER_ID).getFilesByName('_esmojo_accounts_v1.json');if(!files.hasNext())return reply(false,null,'FORBIDDEN');
      const profiles=JSON.parse(files.next().getBlob().getDataAsString('UTF-8')).profiles;
      if(files.hasNext()||!Array.isArray(profiles)||!profiles.some(p=>p.id===request.actor&&p.activated&&!p.disabled&&p.role==='beheerder'))return reply(false,null,'FORBIDDEN');
    }
    stage='MAILING_CONCERTS_FOLDER';
    const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID);if(folder.isTrashed())throw Error();
    stage='MAILING_CONCERTS_REGISTER';
    const files=folder.getFilesByName('_esmojo_ontrack_concerts_v1.json'),file=files.hasNext()?files.next():null;if(files.hasNext())throw Error();
    const state=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{version:1,concerts:[],active:[],checkedAt:null};
    if(state.version!==1||!Array.isArray(state.concerts)||!Array.isArray(state.active))throw Error();
    const today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd');
    if(request.operation==='list'){
      const active=new Set(state.active);
      return reply(true,{checkedAt:state.checkedAt,concerts:state.concerts.filter(row=>row.date<today||active.has(row.concertId)).map(row=>({concertId:row.concertId,artist:row.artist,date:row.date,venue:row.venue,city:row.city,sourceUrl:row.sourceUrl}))});
    }
    // Alleen de OIDC-beveiligde serverimport kan deze ondertekende sync aanvragen.
    stage='MAILING_CONCERTS_SNAPSHOT';
    const snapshot=request.snapshot,locations=[['ziggo-dome','Ziggo Dome','Amsterdam'],['afas-live','AFAS Live','Amsterdam'],['gelredome','GelreDome','Arnhem'],['johan-cruijff-arena','Johan Cruijff ArenA','Amsterdam'],['rotterdam-ahoy','Rotterdam Ahoy','Rotterdam']];
    if(!snapshot||!Array.isArray(snapshot.concerts)||snapshot.concerts.length>5000||snapshot.from!==today||!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.until)||Date.parse(snapshot.until)-Date.parse(snapshot.from)!==365*86400000||!Number.isFinite(Date.parse(snapshot.checkedAt))||Math.abs(Date.now()-Date.parse(snapshot.checkedAt))>600000||!Array.isArray(snapshot.venues)||snapshot.venues.length!==locations.length||!locations.every(location=>snapshot.venues.includes(location[0])))throw Error();
    const incoming=new Set();
    for(const row of snapshot.concerts){
      if(!row||typeof row.artist!=='string'||!row.artist.trim()||row.artist.length>160||/[\x00-\x1f]/.test(row.artist)||!locations.some(location=>location[1]===row.venue&&location[2]===row.city)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||row.date<snapshot.from||row.date>=snapshot.until||new Date(row.date).toISOString().slice(0,10)!==row.date||typeof row.sourceUrl!=='string'||!/^https:\/\/www\.mojo\.nl\/(agenda|concerten\/[\w%/-]+)(\?[^#\s]*)?$/.test(row.sourceUrl))throw Error();
      const id=row.artist.normalize('NFC').trim().replace(/[\s_/\\]+/g,'-')+'_'+row.venue.replace(/[\s_/\\]+/g,'-')+'_'+row.date.slice(8,10)+row.date.slice(5,7)+row.date.slice(0,4);
      if(id!==row.concertId||incoming.has(id))throw Error();incoming.add(id);
    }
    const cache=CacheService.getScriptCache(),nonce='ontrack-concerts:'+input.nonce;if(cache.get(nonce))return reply(false,null,'FORBIDDEN');cache.put(nonce,'1',180);
    // Eerst de complete snapshot valideren, dan één register publiceren. Geen mappen.
    const history=new Map(state.concerts.map(row=>[row.concertId,row]));
    for(const row of snapshot.concerts)history.set(row.concertId,{concertId:row.concertId,artist:row.artist,date:row.date,venue:row.venue,city:row.city,sourceUrl:row.sourceUrl});
    const result={version:1,checkedAt:snapshot.checkedAt,from:snapshot.from,until:snapshot.until,active:Array.from(incoming),concerts:Array.from(history.values()).sort((a,b)=>a.date.localeCompare(b.date)||a.concertId.localeCompare(b.concertId))};
    stage='MAILING_CONCERTS_WRITE';
    const serialized=JSON.stringify(result);if(file)file.setContent(serialized);else folder.createFile(Utilities.newBlob(serialized,'application/json','_esmojo_ontrack_concerts_v1.json'));
    return reply(true,{imported:incoming.size,countsByVenue:locations.map(location=>({venue:location[1],count:snapshot.concerts.filter(row=>row.venue===location[1]).length}))});
  }catch(_){return reply(false,null,stage);}finally{lock.releaseLock();}
}
