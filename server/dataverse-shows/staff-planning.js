import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {record,recordKey,canonical,digest,migrationDifferences} from '../show-migration-writer.js';
import {recordOperations} from './mutations.js';
import {MOJO_VENUES} from '../mojo-venues.js';
import {calendarDate,addDays} from '../mojo-agenda.js';
import {staffFieldIds,validStaffName,normalizedStaffName,emptyStaffRoles,showTeamRoles} from '../../shared/staff-planning.js';
// Personeelsplanning: de MOJO-concertlijst van de komende 365 dagen (openbare gegevens, per zaal en maand) en de ingevoerde
// functienamen per concert (Vertrouwelijk: versleuteld). Beide staan in de bestaande generieke Integratiestatus; geen nieuw schema.
const listCode='staff-planning-list-v1',namesCode='staff-planning-names-v1',horizon=365,maxPerVenue=2500;
const listKey=(venueId,month)=>'staff-planning/list/'+venueId+'/'+month,namesKey=concertId=>'staff-planning/names/'+concertId;
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=240&&!/[\x00-\x1f/\\]/.test(value);
const sameKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const loose=value=>String(value).toLowerCase().replace(/[\s_-]+/g,'-');
export function createStaffPlanning({env=process.env,repo,now=()=>new Date()}){
  const secret=()=>{if(typeof env.GOOGLE_DRIVE_SHARED_SECRET!=='string'||env.GOOGLE_DRIVE_SHARED_SECRET.length<32)throw Error('SHOWS_CONFIG');return createHash('sha256').update('esmojo/staff-planning/v1\n'+env.GOOGLE_DRIVE_SHARED_SECRET).digest();};
  const aad=concertId=>Buffer.from('staff-planning/names/'+concertId);
  function seal(concertId,value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret(),iv);cipher.setAAD(aad(concertId));return Buffer.concat([iv,cipher.update(JSON.stringify(value),'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64url');}
  function open(concertId,text){try{const bytes=Buffer.from(text,'base64url'),decipher=createDecipheriv('aes-256-gcm',secret(),bytes.subarray(0,12));decipher.setAAD(aad(concertId));decipher.setAuthTag(bytes.subarray(-16));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString('utf8'));}catch{return null;}}
  const config=row=>{try{const value=JSON.parse(row.esmojo_configuratie_json);return value&&value.version===1?value:null;}catch{return null;}};
  const rolesFrom=value=>{const roles=emptyStaffRoles();if(value&&value.roles&&typeof value.roles==='object')for(const id of staffFieldIds)if(typeof value.roles[id]==='string'&&validStaffName(value.roles[id]))roles[id]=value.roles[id];return roles;};
  async function listRows(){return (await repo.query('esmojo_integratiestatus',{filter:"esmojo_integratiecode eq '"+listCode+"'"})).map(row=>({row,config:config(row)})).filter(item=>item.config&&typeof item.config.venue==='string'&&Array.isArray(item.config.concerts));}
  async function namesRows(){return repo.query('esmojo_integratiestatus',{filter:"esmojo_integratiecode eq '"+namesCode+"'"});}
  const horizonWindow=()=>{const from=calendarDate(now());return{from,until:addDays(from,horizon)};};
  // Concerten binnen het venster, op datum, zaal en artiest.
  function concertsFrom(items){
    const {from,until}=horizonWindow(),rows=[];
    for(const item of items){const venue=MOJO_VENUES.find(v=>v.id===item.config.venue);if(!venue)continue;for(const concert of item.config.concerts)if(concert.date>=from&&concert.date<until)rows.push({concertId:concert.concertId,artist:concert.artist,venue:venue.name,city:venue.city,date:concert.date});}
    const seen=new Set();return rows.filter(row=>!seen.has(row.concertId)&&seen.add(row.concertId)).sort((a,b)=>a.date.localeCompare(b.date)||a.venue.localeCompare(b.venue,'nl')||a.artist.localeCompare(b.artist,'nl'));
  }
  // De dagelijkse import: vervangt per zaal de maandlijsten van de komende 365 dagen. Alleen gewijzigde maanden worden geschreven.
  async function store(payload){
    const {from,until}=horizonWindow(),venue=MOJO_VENUES.find(v=>v.id===payload?.venue);
    if(!sameKeys(payload,['venue','from','until','concerts'])||!venue||payload.from!==from||payload.until!==until||!Array.isArray(payload.concerts)||payload.concerts.length>maxPerVenue)throw Error('VALIDATION');
    const seen=new Set(),concerts=[];
    // Per soort fout een eigen veilige code (zonder gegevens), zodat de importrun precies aangeeft wat afwijkt.
    for(const row of payload.concerts){
      if(!sameKeys(row,['concertId','artist','date','sourceUrl']))throw Error('STAFF_BAD_SHAPE');
      if(!validId(row.concertId))throw Error('STAFF_BAD_ID');
      if(typeof row.artist!=='string'||!row.artist.trim()||row.artist.length>160)throw Error('STAFF_BAD_ARTIST');
      if(!validDate(row.date)||row.date<from||row.date>=until)throw Error('STAFF_BAD_DATE');
      // Alleen een verwijzing naar MOJO; geen eisen aan het pad (slugs kunnen apostrofs, punten of plustekens bevatten).
      if(typeof row.sourceUrl!=='string'||!/^https:\/\/www\.mojo\.nl\/[^\s#\x00-\x1f]{0,400}$/.test(row.sourceUrl))throw Error('STAFF_BAD_URL');
      if(seen.has(row.concertId))throw Error('STAFF_DUPLICATE');
      seen.add(row.concertId);concerts.push({concertId:row.concertId,artist:row.artist.trim(),date:row.date,sourceUrl:row.sourceUrl});
    }
    const existing=(await listRows()).filter(item=>item.config.venue===venue.id),current=existing.flatMap(item=>item.config.concerts).filter(row=>row.date>=from&&row.date<until).length;
    // Een lege uitkomst terwijl er wel een lijst bekend is, is waarschijnlijk een leesfout bij MOJO: dan niets wissen.
    if(!concerts.length&&current>=5)throw Error('STAFF_LIST_SUSPECT');
    const months=new Set([...concerts.map(row=>row.date.slice(0,7)),...existing.filter(item=>item.config.month>=from.slice(0,7)).map(item=>item.config.month)]);
    const operations=[];let saved=0,unchanged=0;
    for(const month of [...months].sort()){
      const value={version:1,venue:venue.id,month,concerts:concerts.filter(row=>row.date.slice(0,7)===month).sort((a,b)=>a.date.localeCompare(b.date)||a.concertId.localeCompare(b.concertId))},old=existing.find(item=>item.config.month===month);
      if(old&&canonical(old.config)===canonical(value)){unchanged++;continue;}
      const model=record('integratiestatus',listKey(venue.id,month),'Personeelsplanning '+venue.name+' '+month,{integratiecode:listCode,scopecode:digest(venue.id+'/'+month),configuratie_json:canonical(value)});
      const ops=await recordOperations(repo,[model]);operations.push(...ops);saved+=ops.length?1:0;if(!ops.length)unchanged++;
    }
    for(let n=0;n<operations.length;n+=100)await repo.atomic(operations.slice(n,n+100));
    // Onafhankelijke terugleescontrole van alle geschreven maanden in één query.
    if(saved){const read=await listRows();for(const month of months){const want=concerts.filter(row=>row.date.slice(0,7)===month).length,got=read.find(item=>item.config.venue===venue.id&&item.config.month===month);if(!got||got.config.concerts.length!==want)throw Error('STAFF_UNCONFIRMED');}}
    return{venue:venue.id,concerts:concerts.length,saved,unchanged};
  }
  async function read(){
    const items=await listRows(),concerts=concertsFrom(items),names=new Map();
    for(const row of await namesRows()){const cfg=config(row);if(!cfg||typeof cfg.sealed!=='string'||typeof cfg.concertId!=='string')continue;const value=open(cfg.concertId,cfg.sealed);names.set(cfg.concertId,value?{roles:rolesFrom(value),revision:Number.isSafeInteger(value.revision)?value.revision:0}:{roles:emptyStaffRoles(),revision:0,unreadable:true});}
    return{concerts:concerts.map(row=>({...row,...(names.get(row.concertId)||{roles:emptyStaffRoles(),revision:0})})),window:horizonWindow()};
  }
  async function save(payload){
    if(!sameKeys(payload,['concertId','field','value','revision'])||!validId(payload.concertId)||!staffFieldIds.includes(payload.field)||!validStaffName(payload.value)||!Number.isSafeInteger(payload.revision)||payload.revision<0)throw Error('VALIDATION');
    const concerts=concertsFrom(await listRows());if(!concerts.some(row=>row.concertId===payload.concertId))throw Error('NOT_FOUND');
    const key=recordKey('esmojo_integratiestatus',namesKey(payload.concertId)),actual=await repo.byKey('esmojo_integratiestatus',key),cfg=actual?config(actual):null;
    let current={roles:emptyStaffRoles(),revision:0};
    if(actual){if(!cfg||cfg.concertId!==payload.concertId||typeof cfg.sealed!=='string')throw Error('STAFF_CONFLICT');const value=open(payload.concertId,cfg.sealed);if(!value)throw Error('STAFF_CONFLICT');current={roles:rolesFrom(value),revision:Number.isSafeInteger(value.revision)?value.revision:0};}
    const name=normalizedStaffName(payload.value);
    // Een herhaalde opdracht na een verloren bevestiging (dezelfde waarde is al opgeslagen) is geslaagd, geen conflict.
    if(current.revision===payload.revision+1&&current.roles[payload.field]===name)return{concertId:payload.concertId,field:payload.field,roles:current.roles,revision:current.revision};
    if(current.revision!==payload.revision)throw Error('STAFF_CONFLICT');
    const next={roles:{...current.roles,[payload.field]:name},revision:current.revision+1,updatedAt:now().toISOString()};
    const model=record('integratiestatus',namesKey(payload.concertId),'Personeelsplanning namen',{integratiecode:namesCode,scopecode:digest(payload.concertId),configuratie_json:canonical({version:1,concertId:payload.concertId,sealed:seal(payload.concertId,next)})});
    if(actual){const meta=await repo.meta('esmojo_integratiestatus');await repo.atomic([{table:'esmojo_integratiestatus',id:actual[meta.PrimaryIdAttribute],method:'PATCH',payload:{...model.fields},etag:actual['@odata.etag']}]);}
    else await repo.atomic(await recordOperations(repo,[model]));
    const verify=await repo.byKey('esmojo_integratiestatus',key),vcfg=verify?config(verify):null,value=vcfg&&open(payload.concertId,vcfg.sealed);
    if(!value||value.revision!==next.revision||rolesFrom(value)[payload.field]!==name)throw Error('STAFF_UNCONFIRMED');
    return{concertId:payload.concertId,field:payload.field,roles:rolesFrom(value),revision:value.revision};
  }
  // Voor het blok Projectteam op de showpagina: alleen de vier getoonde functies van het concert met dit ID (of een gelijkwaardig ID).
  async function team(payload){
    if(!sameKeys(payload,['concertId'])||!validId(payload.concertId))throw Error('VALIDATION');
    const concerts=concertsFrom(await listRows()),match=concerts.find(row=>row.concertId===payload.concertId)||concerts.find(row=>loose(row.concertId)===loose(payload.concertId)),roles={};
    for(const item of showTeamRoles)roles[item.field]='';
    if(match){const actual=await repo.byKey('esmojo_integratiestatus',recordKey('esmojo_integratiestatus',namesKey(match.concertId))),cfg=actual?config(actual):null,value=cfg&&typeof cfg.sealed==='string'?open(match.concertId,cfg.sealed):null;if(value){const all=rolesFrom(value);for(const item of showTeamRoles)roles[item.field]=all[item.field];}}
    return{roles};
  }
  const handlers={'staff-planning-store':store,'staff-planning-read':read,'staff-planning-save':save,'staff-planning-team':team};
  return{handles:operation=>Object.hasOwn(handlers,operation),handle:(operation,payload={})=>handlers[operation](payload),operations:Object.keys(handlers)};
}
