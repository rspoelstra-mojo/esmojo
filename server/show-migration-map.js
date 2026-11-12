import {MOJO_VENUES} from './mojo-venues.js';
import {categoryReady} from '../shared/analysis-finalization.js';
import {record,reference,choice,digest,canonical,validateRecord} from './show-migration-writer.js';
import {normalizeArtistName} from '../shared/artist-catalogue.js';
import {researchKeyForConcert} from '../shared/dataverse-shows.js';
import {parseTicketSales,validSaleCount,validTicketContent,ticketFields} from '../shared/ticket-data.js';
import {measureDefinitions} from '../shared/measure-workflow.js';
const ref=reference,rev=value=>value??0;
const original=(row={})=>({revisie:rev(row.revision),vastgelegdop:row.updatedAt||row.completedAt||row.createdAt||undefined});
function history(identity,kind,value,links={}){return record('historie',identity,kind,{entiteitsoort:kind,mutatiesoort:choice('mutatiesoort','import'),snapshot_json:canonical(value),fingerprint:digest(value),schemaversie:1,...(value?.actor?{oorspronkelijkeactor:value.actor}:{})},links);}
export function mapPeople(source){
 if(source?.version!==1||!Array.isArray(source.profiles)||!Array.isArray(source.assignments))throw Error('MIGRATION_SOURCE');
 const records=[],files=[];
 for(const person of source.profiles){
  if(typeof person.id!=='string'||!person.id||!Array.isArray(person.modules)||typeof person.activated!=='boolean'||typeof person.disabled!=='boolean')throw Error('MIGRATION_SOURCE');
  const identity='account/'+person.id;
  const superAdministrator=person.role==='superbeheerder';
  if(superAdministrator&&person.id!==source.superAdminId)throw Error('MIGRATION_SOURCE');
  // Dataverse bevat alleen de gewone approl. Superrechten blijven de vaste codepolicy.
  const mappedRole=superAdministrator?'beheerder':person.role;
  records.push(record('medewerker',identity,[person.firstName,person.lastName].filter(Boolean).join(' ')||person.email,{authuserid:person.id,voornaam:person.firstName,achternaam:person.lastName,email:person.email,bedrijf:person.company,functie:person.jobTitle,rol:choice('medewerkerrol',mappedRole),geactiveerd:person.activated,geblokkeerd:person.disabled}));
  for(const module of ['shows','artists','reports'])records.push(record('modulerecht',identity+'/'+module,module,{module:choice('module',module),toegestaan:person.modules.includes(module)},{medewerker:ref('medewerker',identity)}));
  if(person.photo){const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(person.photo);if(!match)throw Error('MIGRATION_SOURCE');const bytes=Buffer.from(match[2],'base64'),key=identity+'/avatar/'+digest(bytes);files.push({fileId:key,identity:key,name:'avatar.'+match[1].split('/')[1],mime:match[1],size:bytes.length,sha256:digest(bytes),kind:'employee-avatar',version:1,bytes,links:{medewerker:ref('medewerker',identity)}});}
 }
 for(const person of source.profiles.filter(person=>person.role==='superbeheerder'))records.push(history('account-role/'+person.id,'account-role',{authUserId:person.id,sourceRole:person.role,mappedRole:'beheerder',policy:'existing-pinned-super-administrator'}));
 for(const row of records)validateRecord(row);
 return{records,files};
}
export function mapShow(source,people,management=null){
 if(source?.version!==1||!Array.isArray(source.shows)||!source.shows.length||source.shows.some(s=>!s.concertId||!s.artist||!s.venue||!s.date)||source.unknown?.length)throw Error(source.unknown?.length?'MIGRATION_UNKNOWN_FILES':'MIGRATION_SOURCE');
 const deferredLinks=[],rows=[],documents=[],files=(source.files||[]).map(file=>({...file})),id='drive-series/'+source.concertId,seriesRef=ref('concertreeks',id),scope={concertreeks:seriesRef};
 const shows=[...source.shows].sort((a,b)=>a.date.localeCompare(b.date)||a.concertId.localeCompare(b.concertId)),first=shows[0],artistId=source.artistId||'a_'+digest(normalizeArtistName(first.artist)),artist='artist/'+artistId,location='venue/'+(MOJO_VENUES.find(v=>v.name===first.venue)?.id||'unmapped'),docs=source.documents||{},profile=docs['showprofiel.json']||{},final=docs['analyseafronding.json']||{},production=docs['productionele-risicos.json']||{};
 if(location==='venue/unmapped')throw Error('MIGRATION_MAPPING');
 rows.push(record('artiest',artist,first.artist,{bronartiestid:artistId,biografie:source.biography?.text,biografiebron:source.biography?.sourceUrl||undefined,biografieopgehaaldop:source.biography?.capturedAt,fotobronurl:source.photo?.imageUrl}));
 rows.push(record('locatie',location,first.venue,{locatiecode:location.slice(6),stad:first.city||undefined,landcode:'NL'}));
 rows.push(record('concertreeks',id,first.artist+' · '+first.venue,{eerstedatum:first.date,laatstedatum:shows.at(-1).date,profielrevisie:rev(profile.revision),afrondrevisie:rev(final.revision),productierevisie:rev(production.revision),voorbereidingsgeneratie:rev(source.activeRevision),oudalgemeenconcertid:source.concertId},{artiest:ref('artiest',artist),locatie:ref('locatie',location)}));
 for(const show of shows){
  const concert='concert/'+show.concertId;
  rows.push(record('concert',concert,show.artist+' · '+show.date,{datum:show.date,uitvoeringscode:show.time||'Niet vermeld',oudconcertid:show.concertId,showsleutel:researchKeyForConcert(show)||undefined,bronurl:show.sourceUrl||undefined,tijdlabel:show.time||undefined,tooninshows:show.active===true,tooninrapportages:false},scope));
  rows.push(record('routealias','route/show/'+show.concertId,show.concertId,{aliassoort:'show',aliaswaarde:show.concertId,omleidentoegestaan:true},{...scope,concert:ref('concert',concert)}));
  const nativeRoute=researchKeyForConcert(show)?'dataverse_'+researchKeyForConcert(show):null;if(nativeRoute&&nativeRoute!==show.concertId)rows.push(record('routealias','route/show/'+nativeRoute,nativeRoute,{aliassoort:'show',aliaswaarde:nativeRoute,omleidentoegestaan:true},{...scope,concert:ref('concert',concert)}));
  for(const assignment of people.assignments.filter(row=>row.concertId===show.concertId)){
   if(!people.profiles.some(p=>p.id===assignment.userId))throw Error('MIGRATION_DEPENDENCY');
   rows.push(record('projectteam',concert+'/'+assignment.userId+'/'+assignment.role,assignment.role,{functiecode:assignment.role,vastgelegdop:assignment.createdAt||undefined},{...scope,concert:ref('concert',concert),medewerker:ref('medewerker','account/'+assignment.userId)}));
  }
 }
 for(const [number,analysis]of Object.entries(profile.analyses||{}))rows.push(record('analyse',id+'/analysis/'+number,'Analyse '+number,{...original(analysis),revisie:rev(profile.revision),vraagnummer:Number(number),categorie:choice('categorie',Number(number)<=4?'visitors':'artist'),samenvatting:analysis.summary,analysestatus:choice('analysestatus',analysis.status)},scope));
 const ticketSource=docs['bezoekersdata.json'],ticketFieldsSource=ticketSource?JSON.parse(ticketSource.workflow_json).visitors.fields:{},ticketReady=ticketFields.every(field=>ticketFieldsSource[field]?.completed_at&&validTicketContent(field,ticketFieldsSource[field].content,shows.map(show=>({date:show.date,time:show.time||'Niet vermeld'}))));
 for(const [category,value]of Object.entries(final.categories||{}))rows.push(record('analyseafronding',id+'/final/'+category,category,{...original(value),revisie:rev(final.revision),categorie:choice('categorie',category),cijfer:value.score,toelichting:value.note,afrondstatus:choice('afrondstatus',categoryReady(category,profile.analyses||{},ticketReady)?'completed':'invalidated'),afgerondop:value.completedAt,profielbasisrevisie:value.profileRevision,ticketbasis_json:value.ticketVersions?canonical(value.ticketVersions):undefined},scope));
 const ticket=docs['bezoekersdata.json'];
 if(ticket){const fields=JSON.parse(ticket.workflow_json).visitors.fields;
  for(const [field,value]of Object.entries(fields)){
   const identity=id+'/visitors/'+field;
   rows.push(record('bezoekersgegeven',identity,field,{veldsoort:choice('bezoekersveld',field),veldstatus:choice('veldstatus',value.completed_at?'reviewed':value.content?'draft':'empty'),herkomst_json:field==='ticket_sales'?undefined:value.content,veldversie:value.version,revisie:value.version,gecontroleerdop:value.completed_at||undefined},scope));
   if(field==='ticket_sales'&&value.content){const sales=parseTicketSales(value.content)||(validSaleCount(value.content)&&shows.length===1?[{date:shows[0].date,time:shows[0].time,count:value.content}]:null);if(!sales)throw Error('MIGRATION_MAPPING');for(const sale of sales){const match=shows.filter(s=>s.date===sale.date&&(s.time||'Niet vermeld')===sale.time);if(match.length!==1)throw Error('MIGRATION_MAPPING');if(sale.count==='')continue;rows.push(record('ticketverkoop',identity+'/'+match[0].concertId,sale.date,{aantal:Number(sale.count),oorspronkelijklabel:sale.time},{bezoekersgegeven:ref('bezoekersgegeven',identity),concert:ref('concert','concert/'+match[0].concertId)}));}}
  }
 }
 for(const [field,value]of Object.entries(production.choices||{}))rows.push(record('productiekeuze',id+'/choice/'+field,field,{revisie:rev(production.revision),onderwerp:choice('productieonderwerp',field),waarde:choice('janee',value)},scope));
 const barrier=production.barrier;
 if(barrier)rows.push(record('barrierbeoordeling',id+'/barrier','Barrieropstelling',{...original(barrier),barriertype:barrier.barrierType?choice('barriertype',barrier.barrierType):undefined,risiconiveau:barrier.riskLevel?choice('risiconiveau',barrier.riskLevel):undefined,ontwerptoelichting:barrier.notes||undefined,risicotoelichting:barrier.riskNote||undefined,beoordelingsstatus:choice('beoordelingsstatus',barrier.completed?'completed':barrier.invalidatedAt?'invalidated':'draft'),signatuur:canonical([barrier.barrierType,barrier.attachment?.sha256||null]),afgerondop:barrier.completedAt||undefined},scope));
 const floor=production.floorPressure;
 if(floor){const identity=id+'/floor';rows.push(record('vloerdrukbeoordeling',identity,'Vloerdruk',{...original(floor),barrierbasisrevisie:floor.barrierRevision,barrierbasissignatuur:floor.barrierSignature,ticketbasis_json:floor.ticketBasis?canonical(floor.ticketBasis):undefined,ticketreferentie:floor.ticketReference?.soldTickets,risiconiveau:floor.riskLevel?choice('risiconiveau',floor.riskLevel):undefined,toelichting:floor.note,beoordelingsstatus:choice('beoordelingsstatus',floor.completed?'completed':floor.invalidatedAt?'invalidated':'draft'),afgerondop:floor.completedAt||undefined},{...scope,...(barrier?{barrierbeoordeling:ref('barrierbeoordeling',id+'/barrier')}:{})}));for(const [i,row]of (floor.rows||[]).entries())rows.push(record('publieksvak',identity+'/'+row.id,row.name,{vakcode:row.id,volgorde:i,bezoekers:row.visitors,nettooppervlakte:row.area},{vloerdrukbeoordeling:ref('vloerdrukbeoordeling',identity)}));}
 // Documentmetadata wordt vóór de verwijzende risicoanalyse aangemaakt; bytes apart gecontroleerd.
 for(const file of files){if(!/^[a-f0-9]{64}$/.test(file.sha256||''))throw Error('MIGRATION_SOURCE');file.identity='drive-file/'+file.fileId;file.links={...scope,...(file.kind==='barrier-attachment'&&barrier?{barrierbeoordeling:ref('barrierbeoordeling',id+'/barrier')}:{})};documents.push(documentRecord(file));}
 rows.push(...documents);
 const riskRefs=new Map();
 for(const [name,sourceRisk]of Object.entries(docs).filter(([name])=>/^showprofiel_risicos_v1_[a-f0-9]{64}\.json$/.test(name))){
  const revision=sourceRisk.source?.revision,documentFile=files.find(f=>f.kind==='showprofile-pdf'&&f.revision===revision);if(!documentFile)throw Error('MIGRATION_DEPENDENCY');if(documentFile.sha256!==sourceRisk.source.sha256||documentFile.version!==sourceRisk.pdfVersion)throw Error('MIGRATION_SOURCE');
  const riskId=id+'/risk-source/'+revision,riskRef=ref('risicoanalysebron',riskId);riskRefs.set(revision,riskRef);
  rows.push(record('risicoanalysebron',riskId,'Risicoanalysebron',{bronrevisie:revision,bronsha256:sourceRisk.source.sha256,promptversie:sourceRisk.result.promptVersion,pdfversie:sourceRisk.pdfVersion,bronstatus:choice('bronstatus','verified'),beperkingen_json:canonical(sourceRisk.result.limitations),vastgelegdop:sourceRisk.createdAt},{...scope,brondocument:ref('document',documentFile.identity)}));
  for(const risk of sourceRisk.result.risks){const review=production.operationalReviews?.[revision]?.assessments?.[risk.id];rows.push(record('operationeelrisico',riskId+'/'+risk.id,risk.title,{risicocode:risk.id,omschrijving:risk.description,gevolg:risk.consequence,risicobasis:choice('risicobasis',risk.basis),bewijs_json:canonical(risk.evidence),revisie:rev(review?.revision),risiconiveau:review?choice('risiconiveau',review.riskLevel):undefined,risicotoelichting:review?.riskNote,beoordelingsstatus:choice('beoordelingsstatus',review?'completed':'draft'),beoordeeldop:review?.completedAt},{risicoanalysebron:riskRef}));}
 }
 const riskDefinitions={state:'ready',production:{choices:production.choices||{}},assessments:{barrier,floor}};
 const definitions=new Map(measureDefinitions({venue:first.venue},riskDefinitions).rows.map(row=>[row.id,row]));
 for(const [revision,group]of Object.entries(production.operationalReviews||{}))for(const [riskId,review]of Object.entries(group.assessments||{}))if(['medium','high'].includes(review.riskLevel))definitions.set('operational:'+revision+':'+riskId,{id:'operational:'+revision+':'+riskId,text:review.riskNote,originalRiskLevel:review.riskLevel,basis:canonical(['operational:'+revision+':'+riskId,review.riskLevel,review.riskNote])});
 for(const measureId of Object.keys(production.measureImplementations||{}))if(!definitions.has(measureId))definitions.set(measureId,{id:measureId});
 for(const [measureId,definition]of definitions){const value=production.measureImplementations?.[measureId],parts=measureId.split(':'),kind=parts[0],identity=id+'/measure/'+measureId,matched=value&&definition.text&&value.basis===JSON.stringify([measureId,definition.originalRiskLevel,definition.text])&&value.originalRiskLevel===definition.originalRiskLevel&&(value.briefing===true||value.briefingChosen===true);
  let riskRef;if(kind==='operational'){if(!riskRefs.has(parts[1]))throw Error('MIGRATION_DEPENDENCY');riskRef=ref('operationeelrisico',id+'/risk-source/'+parts[1]+'/'+parts[2]);}
  rows.push(record('beheersmaatregel',identity,measureId,{...original(value||{}),bronsoort:choice('maatregelbron',kind),productieonderwerp:kind==='production'?choice('productieonderwerp',parts[1]):undefined,oudmaatregelid:measureId,tekst:definition.text,basis_json:value?.basis,oorspronkelijkrisico:(value?.originalRiskLevel||definition.originalRiskLevel)?choice('risiconiveau',value?.originalRiskLevel||definition.originalRiskLevel):undefined,risiconaimplementatie:value?.riskLevelAfter?choice('risiconiveau',value.riskLevelAfter):undefined,briefing:typeof value?.briefing==='boolean'&&(value.briefing===true||value.briefingChosen===true)?choice('janee',value.briefing):undefined,implementatiestatus:choice('beoordelingsstatus',value?.completedAt?(matched?'completed':'invalidated'):'draft'),afgerondop:value?.completedAt||undefined,laatstemutatie:value?.lastMutation},{...scope,operationeelrisico:riskRef}));
 }
 for(const file of files){const links={...file.links};if(file.owner){const identity=id+'/measure/'+file.owner;if(!rows.some(r=>r.table==='esmojo_beheersmaatregel'&&r.identity===identity))throw Error('MIGRATION_DEPENDENCY');links.beheersmaatregel=ref('beheersmaatregel',identity);}const active=file.kind==='measure-attachment'?production.measureImplementations?.[file.owner]?.attachments?.includes(file.uploadId):file.kind==='barrier-attachment'?barrier?.attachment?.fileId===file.fileId:true;rows.push(documentLink(file,links,active));}
 for(const {concertId,snapshot}of source.timetables||[])if(snapshot){for(const [index,entry]of snapshot.entries.entries())rows.push(record('tijdschemaregel','timetable/'+concertId+'/'+index,entry.label,{regelcode:entry.kind+'-'+index,label:entry.label,volgorde:index,tijdsoort:choice('tijdsoort','planned'),tijdtekst:entry.publishedLabel,tijd:entry.time,dagoffset:entry.localDate===snapshot.date?0:1,brondatum:snapshot.capturedAt},{concert:ref('concert','concert/'+concertId)}));rows.push(history(id+'/timetable/'+concertId,'timetable',snapshot,scope));}
 if(management){
  rows.push(record('showbeheer',id+'/management','Showbeheer',{oudconcertid:management.concert_id,cryptoaadid:management.id,toegangshash:management.access_hash,pinhash:management.pin_hash,versleuteldegegevens:management.sealed_credentials,ingeschakeld:management.enabled,vastgelegdop:management.created_at},scope));
  rows.push(record('technischestatus',id+'/management/rate-limit','Showbeheer pogingslimiet',{doelsoort:'show-management-rate-limit',resourcecode:management.id,teller:management.attempt_count??0,venstereinde:management.attempt_until},{...scope,showbeheer:ref('showbeheer',id+'/management')}));
  for(const [section,value]of Object.entries(management.progress||{}))rows.push(record('zaalbijdrage',id+'/management/'+section,section,{sectie:choice('zaalsectie',section),sectiestatus:choice('zaalstatus',typeof value==='string'?value:value.status),inhoud_json:canonical(value)},{showbeheer:ref('showbeheer',id+'/management')}));
 }
 for(const receipt of source.receipts||[])rows.push(record('opdracht','receipt/'+id+'/'+receipt.command,'Bestaand ontvangstbewijs',{commandosleutel:receipt.command,opdrachtsoort:'legacy-active-show-receipt',resourcecode:digest(id),opdrachtstatus:choice('opdrachtstatus','verified'),resultaat_json:canonical(receipt.result),bevestigdop:receipt.created_at},scope));
 if(source.biography||source.photo)rows.push(history('artist-source/'+artistId+'/'+digest({biography:source.biography||null,photo:source.photo||null}),'artist-source',{artistId,biography:source.biography||null,photo:source.photo||null},scope));
 for(const [name,value]of Object.entries(docs))rows.push(history('source/'+digest(id+'/'+name+'/'+digest(value)),name.startsWith('showprofiel_risicos_v1_')?'showprofile-risks':name,{fileName:name,document:value},scope));
 if(source.activeAudit)rows.push(history(id+'/supabase/'+digest(source.activeAudit),'active-show-migration',source.activeAudit,scope));
 rows.push(record('integratiestatus','migration/'+id,'Shows-migratie',{integratiecode:'shows-dataverse-v1',scopecode:digest(id),integratiestatus:choice('integratiestatus','succeeded'),aantalgelezen:rows.length+1,aantalbevestigd:rows.length+1,aantalconflicten:0,cursor_json:canonical({sourceFingerprint:digest(source),version:1})}));
 const employee=value=>people.profiles.some(person=>person.id===value)?ref('medewerker','account/'+value):null;
 for(const row of rows){
  let originalRecord;
  if(row.table==='esmojo_barrierbeoordeling')originalRecord=barrier;
  if(row.table==='esmojo_vloerdrukbeoordeling')originalRecord=floor;
  if(row.table==='esmojo_beheersmaatregel')originalRecord=production.measureImplementations?.[row.fields.esmojo_oudmaatregelid];
  if(row.table==='esmojo_analyse')originalRecord=profile.analyses?.[row.fields.esmojo_vraagnummer];
  if(row.table==='esmojo_analyseafronding')originalRecord=final.categories?.[row.fields.esmojo_categorie===choice('categorie','visitors')?'visitors':'artist'];
  if(originalRecord){const author=employee(originalRecord.updatedBy||originalRecord.completedBy);if(author)row.links.esmojo_gewijzigddoor=author;const completed=employee(originalRecord.completedBy);if(completed&&Object.hasOwn(row.fields,'esmojo_afgerondop'))row.links.esmojo_afgeronddoor=completed;}
  validateRecord(row);
 }
 if(barrier?.attachment?.fileId){const file=files.find(file=>file.fileId===barrier.attachment.fileId);if(!file)throw Error('MIGRATION_DEPENDENCY');deferredLinks.push({source:ref('barrierbeoordeling',id+'/barrier'),field:'esmojo_actiefdocument',target:ref('document',file.identity)});}

 return{records:rows,files,deferredLinks,series:seriesRef,researchKeys:shows.map(show=>researchKeyForConcert(show)).filter(Boolean)};
}
export function documentRecord(file){return record('document',file.identity,file.name,{bestandsnaam:file.name,mimetype:file.mime,bestandsgrootte:file.size,sha256:file.sha256,documentsoort:choice('documentsoort',file.kind),documentgroep:digest(file.kind+'/'+(file.owner||file.identity)),versienummer:file.version||1,documentstatus:choice('bronstatus','pending'),bronfingerprint:file.sha256});}
export function documentLink(file,links,active=true){return record('documentkoppeling',file.identity+'/link/'+digest(links),file.kind,{rolcode:file.kind,bronuploadid:file.uploadId||undefined,koppelstatus:choice('koppelstatus',active?'active':'retired'),volgorde:0},{document:reference('document',file.identity),...links});}
