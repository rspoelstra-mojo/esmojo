// Local native business rules. Loaded only in the bounded document sandbox.
// No external service, credentials, filesystem access or network is available.
// Shows business rules
function esmojoShowFile_(folder, name) {
  const files = folder.getFilesByName(name), file = files.hasNext() ? files.next() : null;
  if (files.hasNext()) throw new Error('FILE_DUPLICATE');
  return file;
}

// Research business rules
function esmojoResearchName_(number) { return 'onderzoek_' + ('0' + number).slice(-2) + '.json'; }

function esmojoReadResearch_(file, concertId, number) {
  const value = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (value.managedBy !== 'ESMOJO/Research-v1' || value.classification !== 'openbaar' || value.schemaVersion !== 1 || value.concertId !== concertId || value.questionNumber !== number) throw new Error('CONFLICT');
  return value;
}

// ShowProfile business rules
function esmojoReadShowProfile_(file, concertId) {
  if (!file) return { managedBy: 'ESMOJO/ShowProfile-v1', classification: 'openbaar', concertId, revision: 0, analyses: {} };
  const value = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (value.managedBy !== 'ESMOJO/ShowProfile-v1' || value.classification !== 'openbaar' || value.concertId !== concertId
      || !Number.isSafeInteger(value.revision) || value.revision < 0 || !value.analyses || typeof value.analyses !== 'object' || Array.isArray(value.analyses)) throw new Error('PROFILE_CONFLICT');
  for (const key of Object.keys(value.analyses)) {
    const row = value.analyses[key];
    if (!/^(?:[1-9]|10|11)$/.test(key) || !row || !['draft', 'completed'].includes(row.status) || typeof row.summary !== 'string'
        || row.summary.length > 400 || !Number.isFinite(Date.parse(row.updatedAt))) throw new Error('PROFILE_CONFLICT');
  }
  return value;
}

function esmojoShowProfile_(request,openTarget) {
  const saving = request.operation === 'profile-save';
  const allowed = saving ? ['operation', 'concertId', 'questionNumber', 'status', 'summary', 'revision'] : ['operation', 'concertId', 'questionNumber'];
  if (Object.keys(request).some(key => !allowed.includes(key)) || typeof request.concertId !== 'string' || !request.concertId || request.concertId.length > 240 || /[\x00-\x1f/\\]/.test(request.concertId)) throw new Error('VALIDATION');
  if ((saving || request.questionNumber !== undefined) && (!Number.isInteger(request.questionNumber) || request.questionNumber < 1 || request.questionNumber > 11)) throw new Error('VALIDATION');
  if (saving && (!['draft', 'completed'].includes(request.status) || typeof request.summary !== 'string' || request.summary.length > 400 || /\x00/.test(request.summary)
      || (request.status === 'completed' && !request.summary.trim()) || !Number.isSafeInteger(request.revision) || request.revision < 0)) throw new Error('VALIDATION');
  const target = openTarget||esmojoResearchTarget_(request.concertId), filename = 'showprofiel.json';
  const file = esmojoShowFile_(target.folder, filename), document = esmojoReadShowProfile_(file, target.primary.concertId);
  if (!saving) {
    // Eén maplisting voor het overzicht; geen elf losse bestandszoekopdrachten.
    const researchFiles = {};
    if (request.questionNumber === undefined) {
      const files = target.folder.getFiles();
      while (files.hasNext()) {
        const file = files.next(), name = file.getName();
        if (/^onderzoek_(?:0[1-9]|1[01])\.json$/.test(name)) (researchFiles[name] || (researchFiles[name] = [])).push(file);
      }
    }
    const readResearch = number => {
      const matches = researchFiles[esmojoResearchName_(number)] || [];
      if (matches.length > 1) throw new Error('CONFLICT');
      const source = request.questionNumber === undefined ? matches[0] : esmojoShowFile_(target.folder, esmojoResearchName_(number));
      if (!source) return null;
      const value = esmojoReadResearch_(source, target.primary.concertId, number);
      if (typeof value.answer !== 'string' || !value.answer.trim() || value.answer.length > 30000
          || typeof value.question !== 'string' || !Array.isArray(value.sources) || value.sources.length > 40
          || !Number.isFinite(Date.parse(value.researchedAt))) throw new Error('CONFLICT');
      return { questionNumber: number, question: value.question, answer: value.answer, sources: value.sources, researchedAt: value.researchedAt };
    };
    if (request.questionNumber !== undefined) return { revision: document.revision, analyses: document.analyses, research: readResearch(request.questionNumber), finalization: esmojoAnalysisFinalState_(target,document) };
    const researchByNumber = {}, researchErrors = {};
    for (let number = 1; number <= 11; number++) {
      try { const research = readResearch(number); if (research) researchByNumber[number] = research; }
      catch { researchErrors[number] = 'Onderzoeksbestand kon niet worden gelezen. Vernieuw de pagina of laat het bestand controleren.'; }
    }
    return { revision: document.revision, analyses: document.analyses, researchByNumber, researchErrors, research: null, finalization: esmojoAnalysisFinalState_(target,document) };
  }
  if (request.revision !== document.revision) throw new Error('PROFILE_CONFLICT');
  esmojoInvalidateAnalysisFinal_(target.folder,target.primary.concertId,request.questionNumber<=4?'visitors':'artist');
  document.analyses[String(request.questionNumber)] = { summary: request.summary, status: request.status, updatedAt: new Date().toISOString() };
  document.revision++;
  const body = JSON.stringify(document, null, 2);
  const saved = file ? (file.setContent(body), file) : target.folder.createFile(codec.newBlob(body, 'application/json', filename));
  const verified = esmojoReadShowProfile_(saved, target.primary.concertId);
  if (JSON.stringify(verified) !== JSON.stringify(document)) throw new Error('UNAVAILABLE');
  return { revision: verified.revision, analyses: verified.analyses, finalization: esmojoAnalysisFinalState_(target,verified) };
}

// TicketData business rules
function esmojoReadTicketData_(file, concertId) {
  if (!file) return { managedBy: 'ESMOJO/TicketData-v1', classification: 'vertrouwelijk', concertId, workflow_json: JSON.stringify({ visitors: { fields: {} } }), leases: {}, history: [] };
  const data = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (data.managedBy !== 'ESMOJO/TicketData-v1' || data.classification !== 'vertrouwelijk' || data.concertId !== concertId
      || typeof data.workflow_json !== 'string' || !data.leases || !Array.isArray(data.history)) throw Error('TICKET_CONFLICT');
  const workflow = JSON.parse(data.workflow_json);
  if (!workflow.visitors || !workflow.visitors.fields || Array.isArray(workflow.visitors.fields)) throw Error('TICKET_CONFLICT');
  for (const field of Object.keys(workflow.visitors.fields)) {
    const row = workflow.visitors.fields[field];
    if (!ticketFields.includes(field) || !row || typeof row.content !== 'string' || row.content.length > 3200
        || !Number.isSafeInteger(row.version) || row.version < 1 || (row.completed_at !== null && !Number.isFinite(Date.parse(row.completed_at)))) throw Error('TICKET_CONFLICT');
  }
  return data;
}

function esmojoTicketData_(request,openTarget) {
  const op = request.operation.slice(7), allowed = ['operation','concertId','actor','field','token','expectedVersion','content'];
  if (Object.keys(request).some(key => !allowed.includes(key)) || !['read','reserve','renew','release','review','reopen'].includes(op)
      || typeof request.actor !== 'string' || !request.actor || request.actor.length > 100) throw Error('VALIDATION');
  if (op !== 'read' && (!ticketFields.includes(request.field) || !/^[a-f0-9-]{36}$/.test(request.token || '') || !Number.isSafeInteger(request.expectedVersion) || request.expectedVersion < 0)) throw Error('VALIDATION');
  const target = openTarget||esmojoResearchTarget_(request.concertId), file = esmojoShowFile_(target.folder, 'bezoekersdata.json');
  const data = esmojoReadTicketData_(file, target.primary.concertId), workflow = JSON.parse(data.workflow_json), visitors = workflow.visitors;
  const shows = saleShows({ shows: target.seriesShows });
  const result = () => ({ workflow, shows });
  if (op === 'read') return result();
  const field = request.field, stored = visitors.fields[field], version = stored?.version || 0, now = Date.now(), lease = data.leases[field];
  const owned = lease && lease.actor === request.actor && lease.token === request.token;
  const live = owned && lease.expiresAt > now;
  const write = () => {
    data.workflow_json = JSON.stringify(workflow);
    const body = JSON.stringify(data);
    const saved = file ? (file.setContent(body), file) : target.folder.createFile(codec.newBlob(body, 'application/json', 'bezoekersdata.json'));
    if (saved.getBlob().getDataAsString('UTF-8') !== body) throw Error('UNAVAILABLE');
  };
  if (op === 'release') { if (owned) { delete data.leases[field]; write(); } return result(); }
  if (op === 'reserve' || op === 'renew') {
    if ((lease && lease.expiresAt > now && !owned) || request.expectedVersion !== version || (op === 'renew' && !live)) throw Error('TICKET_CONFLICT');
    data.leases[field] = { actor: request.actor, token: request.token, expiresAt: now + 120000 };
    write(); return Object.assign(result(), { lease: { expiresAt: data.leases[field].expiresAt } });
  }
  if (!live || request.expectedVersion !== version) throw Error('TICKET_CONFLICT');
  if (op === 'review') {
    if (stored?.completed_at || visitors.completed_at || !validTicketContent(field, request.content, shows)) throw Error('VALIDATION');
    const content = field === 'ticket_sales' ? normalizedTicketSales(request.content, shows) : request.content;
    esmojoInvalidateAnalysisFinal_(target.folder,target.primary.concertId,'visitors');
    visitors.fields[field] = { content, completed_at: new Date(now).toISOString(), version: version + 1 };
  } else {
    if (!stored?.completed_at) throw Error('VALIDATION');
    if (field !== 'ticket_sales' && visitors.completed_at) throw Error('TICKET_CONFLICT');
    esmojoInvalidateAnalysisFinal_(target.folder,target.primary.concertId,'visitors');
    visitors.fields[field] = Object.assign({}, stored || { content: '' }, { completed_at: null, version: version + 1 });
    visitors.completed_at = null; delete visitors.score; delete workflow.completed_at;
  }
  data.history.push({ at: new Date(now).toISOString(), actor: request.actor, field, action: op === 'review' ? 'review' : 'review_reopen', before: stored || null, after: visitors.fields[field] });
  delete data.leases[field]; write(); return result();
}

// TicketValidators business rules
const countries=[
 'Nederland','Duitsland','België','Polen','Zweden','Oostenrijk','Finland','Denemarken','Tsjechië','Noorwegen',
 'Verenigd Koninkrijk','Zwitserland','Italië','Frankrijk','Verenigde Staten','Hongarije','Slowakije','Ukraine','Ierland','Roemenië',
 'Estonia','Spanje','Griekenland','Lithuania','Bulgarije','Portugal','Luxemburg','Turkije','Latvia','Kroatië','Serbia','Israël',
 'Slovenia','Cyprus','Japan','Canada','Malta','Australië','Belarus','Ijsland','Kazakhstan','Taiwan','Zuid-Afrika','Georgia',
 'Zuid-Korea','Mexico','Republic of Moldova','United Arab Emirates','Netherlands Antilles','Brazilië','Qatar',"Côte d'Ivoire",
 'Thailand','Rusland','Monaco','Bosnia and Herzegovina','Grenada','Albania','Faroe Islands','China','Colombia','Chili',
 'Curaçao','Nepal','Saoedi-Arabië','Tajikistan','Argentinië','Macedonië','Caribisch Nederland','Tunisia','Guinea-Bissau',
 'Azerbaijan','Andorra','Swaziland','Viet Nam','Engeland','Nieuw-Zeeland','Costa Rica','Afghanistan','Wallis and Futuna Islands',
]

const provinces=['Drenthe','Flevoland','Friesland','Gelderland','Groningen','Limburg','Noord-Brabant','Noord-Holland','Overijssel','Utrecht','Zeeland','Zuid-Holland']

function parseDomesticOrigins(content){
 try{
  const rows=JSON.parse(content)
  if(!Array.isArray(rows)||rows.length!==3)return null
  const used=new Set();let total=0
  for(const row of rows){
   if(!row||Object.keys(row).sort().join(',')!=='percentage,province'||!provinces.some(province=>province===row.province)||used.has(row.province)||typeof row.percentage!=='string'||!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(row.percentage))return null
   const percent=Number(row.percentage.replace(',','.'));if(percent>100)return null
   total+=Math.round(percent*100);used.add(row.province)
  }
  return total<=10000?rows:null
 }catch{return null}
}

const percentage=(value)=>typeof value==='string'&&/^\d{1,3}(?:[.,]\d{1,2})?$/.test(value)&&Number(value.replace(',','.'))<=100

function parseVisitorOrigins(content){
 try{
  const value=JSON.parse(content)
  if(!value||Object.keys(value).sort().join(',')!=='foreign,netherlands'||!percentage(value.netherlands)||!Array.isArray(value.foreign)||value.foreign.length!==3)return null
  const countries=new Set()
  for(const row of value.foreign){
   if(!row||Object.keys(row).sort().join(',')!=='country,percentage'||typeof row.country!=='string'||!row.country.trim()||row.country.length>80||(/[<>]/.test(row.country)||[...row.country].some(char=>char.charCodeAt(0)<32))||!percentage(row.percentage))return null
   const country=row.country.trim().toLocaleLowerCase('nl-NL')
   if(['nederland','netherlands','nl'].includes(country)||countries.has(country))return null
   countries.add(country)
  }
  if([value.netherlands,...value.foreign.map(row=>row.percentage)].reduce((sum,p)=>sum+Math.round(Number(p.replace(',','.'))*100),0)>10000)return null
  return value
 }catch{return null}
}

const ticketFields = ['ticket_sales','visitor_origins','domestic_origins'];

function validSaleCount(value){return typeof value==='string'&&/^\d{1,9}$/.test(value)}

function parseTicketSales(content,allowEmpty=false){
 if(typeof content!=='string')return null
 try{
  const rows=JSON.parse(content)
  if(!Array.isArray(rows)||!rows.length||rows.length>5)return null
  const seen=new Set()
  for(const row of rows){
   if(!row||Object.keys(row).sort().join(',')!=='count,date,time'||typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date))||new Date(row.date).toISOString().slice(0,10)!==row.date||typeof row.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)&&row.time!=='Niet vermeld'||!(validSaleCount(row.count)||allowEmpty&&row.count===''))return null
   const key=row.date+'|'+row.time;if(seen.has(key))return null;seen.add(key)
  }
  return rows
 }catch{return null}
}

function saleShows(concert){const shows=concert.shows?.length?concert.shows:[{date:concert.date,time:concert.time||'Niet vermeld'}];return [...new Map(shows.map(show=>[show.date+'|'+show.time,{date:show.date,time:show.time}])).values()].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))}

function ticketSalesMatch(content,shows){
 if(validSaleCount(content))return shows.length<=1
 const rows=parseTicketSales(content)
 return Boolean(rows&&rows.length===shows.length&&shows.every(show=>rows.some(row=>row.date===show.date&&row.time===show.time)))
}

function validTicketContent(field,content,shows){return typeof content==='string'&&content.length<=3200&&(field==='ticket_sales'?shows.length>=1&&shows.length<=5&&ticketSalesMatch(content,shows):field==='visitor_origins'?Boolean(parseVisitorOrigins(content)):field==='domestic_origins'?Boolean(parseDomesticOrigins(content)):false)}

function normalizedTicketSales(content,shows){if(shows.length===1){const rows=parseTicketSales(content);return String(Number(rows?rows[0].count:content))}return JSON.stringify(parseTicketSales(content).map(row=>({...row,count:String(Number(row.count))})))}

// FinalValidators business rules
const finalCategories = {
  visitors: { title: 'Bezoekersanalyse', questionNumbers: [1,2,3,4], low: 'Rustig publiek met hoge naleving van instructies.', high: 'Extreem energiek publiek met verhoogde kans op ongehoorzaamheid en incidenten.' },
  artist: { title: 'Artiestanalyse', questionNumbers: [5,6,7,8,9,10,11], low: 'Statische, voorspelbare productie.', high: 'Intensieve show met veel dynamiek en onvoorspelbaar artiestgedrag.' },
};

function categoryReady(category, analyses, ticketsReady) {
  return Boolean(finalCategories[category] && finalCategories[category].questionNumbers.every(number => analyses[number]?.status === 'completed' && analyses[number].summary.trim()) && (category !== 'visitors' || ticketsReady));
}

function validateFinalRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input).length > 12000) throw Error('VALIDATION');
  const allowed = input.operation === 'read' ? ['operation','concertId'] : ['operation','concertId','category','score','note','basis'];
  if (Object.keys(input).some(key => !allowed.includes(key)) || !['read','complete'].includes(input.operation) || typeof input.concertId !== 'string' || !input.concertId || input.concertId.length > 240 || /[\x00-\x1f/\\]/.test(input.concertId)) throw Error('VALIDATION');
  if (input.operation === 'complete') {
    const basis=input.basis;
    if (!Object.hasOwn(finalCategories,input.category) || !Number.isInteger(input.score) || input.score < 1 || input.score > 10 || typeof input.note !== 'string' || !input.note.trim() || input.note.length > 2000 || /\x00/.test(input.note)
      || !basis || typeof basis!=='object' || Object.keys(basis).sort().join(',')!=='finalRevision,profileRevision,ticketVersions'
      || !Number.isSafeInteger(basis.profileRevision) || basis.profileRevision<0 || !Number.isSafeInteger(basis.finalRevision) || basis.finalRevision<0
      || !basis.ticketVersions || typeof basis.ticketVersions!=='object' || Object.keys(basis.ticketVersions).sort().join(',')!=='domestic_origins,ticket_sales,visitor_origins'
      || Object.values(basis.ticketVersions).some(value=>!Number.isSafeInteger(value)||value<0)) throw Error('VALIDATION');
  }
  return input;
}

// AnalysisFinal business rules
function esmojoReadAnalysisFinal_(file,concertId) {
  if(!file)return {managedBy:'ESMOJO/AnalysisFinal-v1',classification:'openbaar',concertId,revision:0,categories:{},history:[]};
  const value=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if(value.managedBy!=='ESMOJO/AnalysisFinal-v1'||value.classification!=='openbaar'||value.concertId!==concertId||!Number.isSafeInteger(value.revision)||value.revision<0||!value.categories||Array.isArray(value.categories)||!Array.isArray(value.history))throw Error('FINAL_CONFLICT');
  for(const key of Object.keys(value.categories)){const row=value.categories[key];if(!Object.hasOwn(finalCategories,key)||!row||!Number.isInteger(row.score)||row.score<1||row.score>10||typeof row.note!=='string'||!row.note.trim()||row.note.length>2000||!Number.isFinite(Date.parse(row.completedAt)))throw Error('FINAL_CONFLICT');}
  return value;
}

function esmojoAnalysisFinalState_(target,profile) {
  const file=esmojoShowFile_(target.folder,'analyseafronding.json'),document=esmojoReadAnalysisFinal_(file,target.primary.concertId);
  let fields={},ticketVerified=true;
  try{const ticketFile=esmojoShowFile_(target.folder,'bezoekersdata.json'),ticketData=esmojoReadTicketData_(ticketFile,target.primary.concertId);fields=JSON.parse(ticketData.workflow_json).visitors.fields;}catch{ticketVerified=false;}
  const shows=saleShows({shows:target.seriesShows}),ticketsReady=ticketVerified&&ticketFields.every(field=>fields[field]?.completed_at&&validTicketContent(field,fields[field].content,shows));
  const categories={};
  for(const category of Object.keys(finalCategories)){const ready=categoryReady(category,profile.analyses,ticketsReady);const stored=ready?document.categories[category]:null;categories[category]={ready,completedAt:stored?.completedAt||null,score:stored?.completedAt&&Number.isInteger(stored.score)?stored.score:null};}
  return {categories,ticketsReady,basis:{profileRevision:profile.revision,finalRevision:document.revision,ticketVersions:Object.fromEntries(ticketFields.map(field=>[field,fields[field]?.version||0]))}};
}

function esmojoAnalysisFinal_(request) {
  const input=Object.assign({},request,{operation:request.operation.slice(6)});validateFinalRequest(input);
  const target=esmojoResearchTarget_(request.concertId),profile=esmojoReadShowProfile_(esmojoShowFile_(target.folder,'showprofiel.json'),target.primary.concertId);
  const state=esmojoAnalysisFinalState_(target,profile);
  const response=()=>({analyses:profile.analyses,revision:profile.revision,finalization:esmojoAnalysisFinalState_(target,profile)});
  if(input.operation==='read')return {analyses:profile.analyses,revision:profile.revision,finalization:state};
  const category=input.category;
  if(!state.categories[category].ready)throw Error('FINAL_NOT_READY');
  if(state.categories[category].completedAt||input.basis.profileRevision!==state.basis.profileRevision||input.basis.finalRevision!==state.basis.finalRevision
    ||(category==='visitors'&&ticketFields.some(field=>input.basis.ticketVersions[field]!==state.basis.ticketVersions[field])))throw Error('FINAL_CONFLICT');
  const file=esmojoShowFile_(target.folder,'analyseafronding.json'),document=esmojoReadAnalysisFinal_(file,target.primary.concertId);
  document.categories[category]={score:input.score,note:input.note.trim(),completedAt:new Date().toISOString()};document.revision++;
  const body=JSON.stringify(document,null,2),saved=file?(file.setContent(body),file):target.folder.createFile(codec.newBlob(body,'application/json','analyseafronding.json'));
  if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('UNAVAILABLE');
  return response();
}

function esmojoInvalidateAnalysisFinal_(folder,concertId,category) {
  const file=esmojoShowFile_(folder,'analyseafronding.json');if(!file)return;
  const document=esmojoReadAnalysisFinal_(file,concertId);if(!document.categories[category])return;
  document.history.push(Object.assign({category,invalidatedAt:new Date().toISOString()},document.categories[category]));delete document.categories[category];document.revision++;
  const body=JSON.stringify(document,null,2);file.setContent(body);if(file.getBlob().getDataAsString('UTF-8')!==body)throw Error('UNAVAILABLE');
}

// ShowProfilePdf business rules
const ESMOJO_PDF_LAYOUT = 'gashouder-showprofile-v6-confidential-footer';

const ESMOJO_PDF_SOURCE = 'eb2fa1a532267d7963f3d2358308c04b3bf8cfe6';

function esmojoPdfHash_(value){const bytes=typeof value==='string'?codec.computeDigest(codec.DigestAlgorithm.SHA_256,value,codec.Charset.UTF_8):codec.computeDigest(codec.DigestAlgorithm.SHA_256,value);return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}

function esmojoPdfFileName_(show){const part=value=>value.replace(/[<>:"/\\|?*]/g,'_').replace(/\s+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');const [y,m,d]=show.date.split('-');return 'SP_'+part(show.artist)+'_'+part(show.venue)+'_'+d+m+y+'.pdf';}

function esmojoPdfSnapshot_(concertId,target=esmojoResearchTarget_(concertId)){
  const profile=esmojoReadShowProfile_(esmojoShowFile_(target.folder,'showprofiel.json'),target.primary.concertId),state=esmojoAnalysisFinalState_(target,profile);
  if(!state.categories.visitors.completedAt||!state.categories.artist.completedAt||(target.primary.venue&&target.primary.venue!=='Gashouder'&&!target.primary.dataverseSourceKey&&!(target.primary.concertId==='Hatsune-Miku_AFAS-Live_15112026'&&target.primary.venue==='AFAS Live')))throw Error('REPORT_NOT_READY');
  const final=esmojoReadAnalysisFinal_(esmojoShowFile_(target.folder,'analyseafronding.json'),target.primary.concertId),ticketData=esmojoReadTicketData_(esmojoShowFile_(target.folder,'bezoekersdata.json'),target.primary.concertId),tickets=JSON.parse(ticketData.workflow_json).visitors.fields;
  const visitorIds=['gender_ratio','age_range','arrival','typical_traits'],artistIds=['artist_description','tour_route','movement','punctuality','popularity','social_sensitivity','special_notes'];
  const workflow={visitors:{fields:{}},artist:{fields:{}}},times=[];
  for(let number=1;number<=11;number++){const row=profile.analyses[number];if(row?.status!=='completed'||typeof row.summary!=='string'||!row.summary.trim())throw Error('REPORT_NOT_READY');const factor=number<=4?'visitors':'artist',id=number<=4?visitorIds[number-1]:artistIds[number-5];workflow[factor].fields[id]={content:row.summary,completed_at:row.updatedAt};times.push(row.updatedAt);}
  for(const field of ticketFields){const row=tickets[field];workflow.visitors.fields[field]={content:row.content,completed_at:row.completed_at};times.push(row.completed_at);}
  for(const factor of ['visitors','artist']){const row=final.categories[factor];workflow[factor].score_review={score:row.score,reason:row.note,completed_at:row.completedAt};times.push(row.completedAt);}
  const shows=saleShows({shows:target.seriesShows}),show={artist:target.primary.artist,venue:target.primary.venue||'Gashouder',date:target.primary.date};
  const updatedAt=new Date(Math.max(...times.map(value=>Date.parse(value)))).toISOString();
  const record={concert_id:target.primary.concertId,status:'pending',updated_at:updatedAt,workflow,concert:{id:target.primary.concertId,artist:show.artist,venue:show.venue,city:target.primary.city||'',date:show.date,time:shows[0]?.time||'Niet vermeld',genre:'',shows:shows.map(row=>({...row,id:row.date+'|'+row.time}))}};
  const revision=esmojoPdfHash_(JSON.stringify({layout:ESMOJO_PDF_LAYOUT,source:ESMOJO_PDF_SOURCE,record,basis:state.basis}));
  return {target,record,show,revision,fileName:esmojoPdfFileName_(show)};
}

function esmojoReadPdfRegister_(file,concertId){
  if(!file)return{managedBy:'ESMOJO/ShowProfilePdf-v1',classification:'vertrouwelijk',concertId,nextVersion:1,reports:{},job:null};
  const data=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if(data.managedBy!=='ESMOJO/ShowProfilePdf-v1'||data.classification!=='vertrouwelijk'||data.concertId!==concertId||!Number.isSafeInteger(data.nextVersion)||data.nextVersion<1||!data.reports||Array.isArray(data.reports))throw Error('REPORT_CONFLICT');
  return data;
}

function esmojoPdfStoredFile_(row,folder,otherFolder){
  if(!row||!Number.isSafeInteger(row.version)||row.version<1||typeof row.fileId!=='string'||!row.fileId||!/^[a-f0-9]{64}$/.test(row.sha256)||row.layoutVersion!==ESMOJO_PDF_LAYOUT||row.sourceCommit!==ESMOJO_PDF_SOURCE)throw Error('REPORT_UNAVAILABLE');
  const file=documentFiles.getById(row.fileId),parents=file.getParents();
  const parentId=parents.hasNext()?parents.next().getId():null;
  if(file.isTrashed()||file.getMimeType()!=='application/pdf'||file.getName()!==row.fileName||![folder.getId(),otherFolder?.getId()].includes(parentId)||!parentId||parents.hasNext())throw Error('REPORT_UNAVAILABLE');
  return file;
}

function esmojoShowProfilePdf_(request,openTarget){
  const op=request.operation.slice(7),allowed={status:['operation','concertId'],reserve:['operation','concertId','jobId','manager','layoutVersion'],commit:['operation','concertId','jobId','revision','version','layoutVersion','fileName','pdfBase64','sha256'],fail:['operation','concertId','jobId','revision','errorCode'],download:['operation','concertId']}[op];
  if(!allowed||Object.keys(request).some(key=>!allowed.includes(key))||typeof request.concertId!=='string'||!request.concertId||request.concertId.length>240||/[\x00-\x1f/\\]/.test(request.concertId))throw Error('VALIDATION');
  if(['reserve','commit','fail'].includes(op)&&!/^[a-f0-9-]{36}$/.test(request.jobId||''))throw Error('VALIDATION');
  if(['reserve','commit'].includes(op)&&request.layoutVersion!==ESMOJO_PDF_LAYOUT)throw Error('REPORT_CONFLICT');
  const snapshot=esmojoPdfSnapshot_(request.concertId,openTarget),{target,revision,fileName}=snapshot;
  const metadata=esmojoShowFile_(target.folder,'showprofiel-pdf.json'),data=esmojoReadPdfRegister_(metadata,target.primary.concertId),existing=data.reports[revision];
  const save=()=>{const body=JSON.stringify(data);const saved=metadata?(metadata.setContent(body),metadata):target.folder.createFile(codec.newBlob(body,'application/json','showprofiel-pdf.json'));if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('UNAVAILABLE');};
  const ready=()=>({state:'ready',revision,fileName:existing.fileName,version:existing.version});
  if(op==='commit'&&request.revision!==revision)throw Error('REPORT_CONFLICT');
  if(existing){
    if(op==='commit'&&(request.version!==existing.version||request.sha256!==existing.sha256||request.fileName!==existing.fileName))throw Error('REPORT_CONFLICT');
    const file=esmojoPdfStoredFile_(existing,target.folder);
    if(op==='download'){const bytes=file.getBlob().getBytes();if(bytes.length>2*1024*1024||esmojoPdfHash_(bytes)!==existing.sha256)throw Error('REPORT_UNAVAILABLE');return Object.assign(ready(),{pdfBase64:codec.base64Encode(bytes),sha256:existing.sha256});}
    return ready();
  }
  if(op==='download')throw Error('REPORT_NOT_READY');
  const job=data.job,now=Date.now(),live=job&&job.revision===revision&&job.state==='generating'&&job.expiresAt>now;
  if(op==='status')return {state:live?'generating':job?.revision===revision&&job.state==='failed'?'failed':'pending',revision,...(job?.revision===revision&&job.state==='failed'?{errorCode:job.errorCode}:{})};
  if(op==='reserve'){
    if(typeof request.manager!=='string'||!request.manager.trim()||request.manager.length>300||/[\x00-\x1f]/.test(request.manager))throw Error('VALIDATION');
    if(live)return{state:'generating',revision};
    const manager=job?.revision===revision?job.manager:request.manager.trim();
    data.job={id:request.jobId,revision,manager,version:data.nextVersion,state:'generating',expiresAt:now+300000};save();
    return {state:'reserved',revision,version:data.job.version,layoutVersion:ESMOJO_PDF_LAYOUT,sourceCommit:ESMOJO_PDF_SOURCE,concertId:target.primary.concertId,selectedConcertId:target.selected.concertId,fileName,record:Object.assign({},snapshot.record,{manager}),show:snapshot.show};
  }
  if(!live||job.id!==request.jobId||request.revision!==revision)throw Error('REPORT_CONFLICT');
  if(op==='fail'){if(!['LAYOUT_ERROR','GENERATION_FAILED','PDF_TOO_LARGE'].includes(request.errorCode))throw Error('VALIDATION');data.job.state='failed';data.job.errorCode=request.errorCode;save();return{state:'failed',revision,errorCode:request.errorCode};}
  if(request.version!==job.version||request.fileName!==fileName||typeof request.pdfBase64!=='string'||request.pdfBase64.length>2796204||!/^[A-Za-z0-9+/]+={0,2}$/.test(request.pdfBase64)||!/^[a-f0-9]{64}$/.test(request.sha256||''))throw Error('VALIDATION');
  const bytes=codec.base64Decode(request.pdfBase64);
  if(bytes.length>2*1024*1024||bytes.length<100||[37,80,68,70,45].some((byte,index)=>bytes[index]!==byte)||esmojoPdfHash_(bytes)!==request.sha256)throw Error('VALIDATION');
  // Hervat ook na createFile + verloren antwoord: identieke bytes niet nogmaals opslaan.
  let file=null,count=0;const candidates=target.folder.getFilesByName(fileName);
  while(candidates.hasNext()){const candidate=candidates.next();if(++count>100)throw Error('REPORT_CONFLICT');if(candidate.getMimeType()==='application/pdf'&&!candidate.isTrashed()){const saved=candidate.getBlob().getBytes();if(saved.length<=2*1024*1024&&esmojoPdfHash_(saved)===request.sha256){file=candidate;break;}}}
  if(!file)file=target.folder.createFile(codec.newBlob(bytes,'application/pdf',fileName));
  if(esmojoPdfHash_(file.getBlob().getBytes())!==request.sha256)throw Error('REPORT_UNAVAILABLE');
  data.reports[revision]={fileId:file.getId(),fileName,version:job.version,sha256:request.sha256,layoutVersion:ESMOJO_PDF_LAYOUT,sourceCommit:ESMOJO_PDF_SOURCE,sourceUpdatedAt:snapshot.record.updated_at};data.nextVersion=job.version+1;data.job=null;save();
  return{state:'ready',revision,fileName,version:request.version};
}

// RiskValidators business rules
const RISK_PROMPT_VERSION = 1;

function riskKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw Error('VALIDATION');
}

function riskText(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw Error('VALIDATION');
  return value;
}

function validateRiskReference(value) {
  riskKeys(value, ['revision', 'sha256']);
  for (const key of ['revision', 'sha256']) if (!/^[a-f0-9]{64}$/.test(value[key] || '')) throw Error('VALIDATION');
  return { revision: value.revision, sha256: value.sha256 };
}

function validateRiskResult(value) {
  riskKeys(value, ['promptVersion', 'analysedAt', 'risks', 'limitations']);
  if (JSON.stringify(value).length > 32000 || value.promptVersion !== RISK_PROMPT_VERSION
      || typeof value.analysedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value.analysedAt)
      || !Number.isFinite(Date.parse(value.analysedAt)) || new Date(value.analysedAt).toISOString().replace('.000Z','Z') !== value.analysedAt.replace('.000Z','Z')
      || !Array.isArray(value.risks) || value.risks.length > 30 || !Array.isArray(value.limitations) || value.limitations.length > 10
      || (!value.risks.length && !value.limitations.length)) throw Error('VALIDATION');
  const titles = new Set();
  value.risks.forEach((risk, index) => {
    riskKeys(risk, ['id', 'title', 'description', 'consequence', 'basis', 'evidence']);
    if (risk.id !== 'R' + String(index + 1).padStart(2,'0') || !['explicit','inferred'].includes(risk.basis)
        || !Array.isArray(risk.evidence) || !risk.evidence.length || risk.evidence.length > 3) throw Error('VALIDATION');
    const title = riskText(risk.title, 120).trim().toLowerCase();
    if (titles.has(title)) throw Error('VALIDATION');
    titles.add(title); riskText(risk.description, 800); riskText(risk.consequence, 600);
    for (const evidence of risk.evidence) {
      riskKeys(evidence, ['page', 'quote']);
      if (!Number.isInteger(evidence.page) || evidence.page < 1 || evidence.page > 20) throw Error('VALIDATION');
      riskText(evidence.quote, 400);
    }
  });
  value.limitations.forEach(text => riskText(text, 300));
  return value;
}

function riskFilename(reference) {
  validateRiskReference(reference);
  return 'showprofiel_risicos_v1_' + reference.revision + '.json';
}

// ProductionRiskValidators business rules
const productionRiskGroups = [
  { title:'Zaalindeling', items:[
    {id:'entrance_process',title:'Entreeproces'},
    {id:'barrier_layout',title:'Barrieropstelling'},
    {id:'floor_pressure',title:'Vloerdruk'},
    {id:'escape_routes',title:'Vluchtweg beperkingen',conditional:true},
  ] },
  { title:'Special effects', items:[
    {id:'fireworks',title:'Vuurwerk',conditional:true},
    {id:'open_fire',title:'Open vuur',conditional:true},
    {id:'lasers',title:'Lasers',conditional:true},
    {id:'drones',title:'Drones',conditional:true},
  ] },
];

const productionRiskFields = productionRiskGroups.flatMap(group=>group.items.filter(item=>item.conditional).map(item=>item.id));

function validateProductionRiskSelection(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='concertId,field,revision,value'
    ||typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)
    ||!productionRiskFields.includes(input.field)||typeof input.value!=='boolean'||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('VALIDATION');
  return {concertId:input.concertId,field:input.field,value:input.value,revision:input.revision};
}

// ProductionRisks business rules
function esmojoReadProductionRisks_(target) {
  const file=esmojoShowFile_(target.folder,'productionele-risicos.json');
  if(!file)return {file:null,document:{managedBy:'ESMOJO/ProductionRisks-v1',classification:'vertrouwelijk',concertId:target.primary.concertId,revision:0,choices:{},history:[]}};
  const document=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if(document.managedBy!=='ESMOJO/ProductionRisks-v1'||document.classification!=='vertrouwelijk'||document.concertId!==target.primary.concertId
    ||!Number.isSafeInteger(document.revision)||document.revision<0||!document.choices||typeof document.choices!=='object'||Array.isArray(document.choices)||!Array.isArray(document.history)
    ||Object.keys(document.choices).some(key=>!productionRiskFields.includes(key)||typeof document.choices[key]!=='boolean'))throw Error('CONFLICT');
  return {file,document};
}

function esmojoProductionRiskState_(document){return {revision:document.revision,choices:document.choices};}

function esmojoSaveProductionRisk_(request,target) {
  const input=validateProductionRiskSelection({concertId:request.concertId,field:request.field,value:request.value,revision:request.revision});
  if(typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
  const {file,document}=esmojoReadProductionRisks_(target);
  // Identieke herpoging na verloren antwoord is veilig; afwijkende revisie nooit overschrijven.
  if(input.revision!==document.revision){if(document.revision===input.revision+1&&document.choices[input.field]===input.value)return esmojoProductionRiskState_(document);throw Error('CONFLICT');}
  if(document.choices[input.field]===input.value)return esmojoProductionRiskState_(document);
  document.history.push({at:new Date().toISOString(),actor:request.actor,field:input.field,before:document.choices[input.field]??null,after:input.value});
  document.choices[input.field]=input.value;document.revision++;
  const body=JSON.stringify(document,null,2),saved=file?(file.setContent(body),file):target.folder.createFile(codec.newBlob(body,'application/json','productionele-risicos.json'));
  if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('VERIFY');
  return esmojoProductionRiskState_(document);
}

// MeasureValidators business rules
const measureLevels=['none','low','medium','high'];

const measureUploadLimit=2*1024*1024;

const measureUploadTypes={'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'};

function measureDefinitions(show,risks={}){
 const rows=[];let known=true;
 for(const group of productionRiskGroups)for(const item of group.items){
  if(item.id==='entrance_process'&&show.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder'||item.conditional&&risks.production?.choices[item.id]===false)continue;
  const key={barrier_layout:'barrier',floor_pressure:'floor'}[item.id]||item.id,record=risks.assessments?.[key];
  if(!record||!measureLevels.includes(record.riskLevel)){known=false;continue;}
  if(!['medium','high'].includes(record.riskLevel))continue;
  const text=key==='floor'?record.note:record.riskNote;
  if(typeof text!=='string'||!text.trim()){known=false;continue;}
  rows.push({id:'production:'+item.id,sourceType:'production',sourceId:item.id,title:item.title,text:text.trim(),description:typeof record.description==='string'?record.description:null,origin:group.title+' · '+item.title,originalRiskLevel:record.riskLevel});
 }
 if(risks.state==='ready'&&risks.operational?.source)for(const risk of risks.risks||[]){
  const record=risks.operational.assessments?.[risk.id];
  if(['medium','high'].includes(record?.riskLevel)&&typeof record.riskNote==='string'&&record.riskNote.trim())rows.push({id:'operational:'+risks.operational.source.revision+':'+risk.id,sourceType:'operational',sourceId:risk.id,sourceRevision:risks.operational.source.revision,title:risk.title,text:record.riskNote.trim(),description:risk.description||null,origin:'Operationele risico’s · '+risk.title,originalRiskLevel:record.riskLevel});
 }
 return{known,rows:rows.map(row=>({...row,basis:JSON.stringify([row.id,row.originalRiskLevel,row.text])}))};
}

function measureState(row,record){
 const matched=Number.isSafeInteger(record?.revision)&&record.revision>0&&record.basis===row.basis&&record.originalRiskLevel===row.originalRiskLevel;
 // Oude false was de impliciete uit-stand; alleen een expliciet nieuwe Nee telt als keuze.
 const briefing=record?.briefing===true?true:record?.briefing===false&&record.briefingChosen===true?false:null,briefingChosen=typeof briefing==='boolean';
 return{revision:record?.revision||0,basis:row.basis,originalRiskLevel:row.originalRiskLevel,riskLevelAfter:matched?record.riskLevelAfter:null,briefing,briefingChosen,completedAt:matched&&briefingChosen?record.completedAt||null:null,implemented:Boolean(matched&&briefingChosen&&measureLevels.includes(record.riskLevelAfter)&&typeof record.completedAt==='string'&&Number.isFinite(Date.parse(record.completedAt))),attachments:record?.attachments||[]};
}

function measureKeys(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))throw Error('VALIDATION');}

function validMeasureId(value){return typeof value==='string'&&(/^(?:production:(?:entrance_process|barrier_layout|floor_pressure|escape_routes|fireworks|open_fire|lasers|drones)|operational:[a-f0-9]{64}:R[0-9]{2})$/.test(value));}

function measureText(value){if(typeof value!=='string'||!value.trim()||value.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))throw Error('VALIDATION');return value.trim();}

function validMeasureUploadId(value){return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);}

function measureFileSignature(bytes,mime){const b=Array.from(bytes,x=>(x+256)%256);return mime==='application/pdf'?b.length>=8&&[37,80,68,70,45].every((v,i)=>b[i]===v):mime==='image/png'?b.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)&&String.fromCharCode(...b.slice(12,16))==='IHDR':mime==='image/jpeg'?b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255:false;}

function validateMeasureRequest(input){
 const op=input?.operation,operations={read:[],draft:['revision','basis','data'],complete:['revision','basis','data'],reopen:['revision','basis'],'edit-text':['revision','basis','text'],upload:['revision','basis','uploadId','fileName','mime','base64','sha256'],remove:['revision','basis','uploadId'],download:['uploadId']},fields=Object.hasOwn(operations,op)?operations[op]:null;
 if(!fields)throw Error('VALIDATION');measureKeys(input,['operation','concertId','measureId',...fields]);
 if(typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)||!validMeasureId(input.measureId))throw Error('VALIDATION');
 if(fields.includes('revision')&&(!Number.isSafeInteger(input.revision)||input.revision<0))throw Error('VALIDATION');
 if(fields.includes('basis')&&(typeof input.basis!=='string'||input.basis.length>25000||!input.basis))throw Error('VALIDATION');
 if(fields.includes('data')){measureKeys(input.data,['riskLevelAfter','briefing']);if(input.data.riskLevelAfter!==null&&!measureLevels.includes(input.data.riskLevelAfter)||input.data.briefing!==null&&typeof input.data.briefing!=='boolean'||op==='complete'&&(input.data.riskLevelAfter===null||typeof input.data.briefing!=='boolean'))throw Error('VALIDATION');}
 if(fields.includes('text'))measureText(input.text);
 if(fields.includes('uploadId')&&!validMeasureUploadId(input.uploadId))throw Error('VALIDATION');
 if(op==='upload'){
  if(!Object.hasOwn(measureUploadTypes,input.mime)||typeof input.fileName!=='string'||!input.fileName.trim()||input.fileName.length>180||/[\x00-\x1f/\\]/.test(input.fileName)||!(input.mime==='application/pdf'?/\.pdf$/i:input.mime==='image/png'?/\.png$/i:/\.jpe?g$/i).test(input.fileName)||typeof input.base64!=='string'||!input.base64||input.base64.length>Math.ceil(measureUploadLimit/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)||!/^[a-f0-9]{64}$/.test(input.sha256||''))throw Error('VALIDATION');
 }
 return{...input,...(op==='edit-text'?{text:measureText(input.text)}:{})};
}

// MeasureImplementations business rules
function esmojoMeasureRecord_(document,row){
 const records=document.measureImplementations;
 if(records!==undefined&&(!records||typeof records!=='object'||Array.isArray(records)||Object.keys(records).some(id=>!validMeasureId(id))))throw Error('CONFLICT');
 const value=records?.[row.id];if(!value)return null;
 measureKeys(value,['revision','basis','originalRiskLevel','riskLevelAfter','briefing','completedAt','completedBy','attachments','lastMutation',...(Object.hasOwn(value,'briefingChosen')?['briefingChosen']:[])]);
 if(!Number.isSafeInteger(value.revision)||value.revision<1||typeof value.basis!=='string'||value.basis.length>25000||!['medium','high'].includes(value.originalRiskLevel)||value.riskLevelAfter!==null&&!measureLevels.includes(value.riskLevelAfter)||value.briefing!==null&&typeof value.briefing!=='boolean'||Object.hasOwn(value,'briefingChosen')&&(typeof value.briefingChosen!=='boolean'||value.briefingChosen!==(typeof value.briefing==='boolean'))||!Array.isArray(value.attachments)||value.attachments.length>20||new Set(value.attachments).size!==value.attachments.length||value.attachments.some(id=>!validMeasureUploadId(id))||!/^[a-f0-9]{64}$/.test(value.lastMutation||'')||value.completedAt!==null&&(typeof value.completedAt!=='string'||!Number.isFinite(Date.parse(value.completedAt))||typeof value.completedBy!=='string'||!value.completedBy||!measureLevels.includes(value.riskLevelAfter))||value.completedAt===null&&value.completedBy!==null)throw Error('CONFLICT');
 return value;
}

function esmojoMeasureAttachmentMeta_(document,measureId,uploadId){
 const entry=document.measureUploads?.[uploadId];
 if(!entry||entry.measureId!==measureId||entry.uploadId!==uploadId||!Object.hasOwn(measureUploadTypes,entry.mime)||!Number.isSafeInteger(entry.size)||entry.size<1||entry.size>measureUploadLimit||!/^[a-f0-9]{64}$/.test(entry.sha256||'')||typeof entry.fileName!=='string'||!entry.fileName||typeof entry.fileId!=='string'||!entry.fileId)throw Error('ATTACHMENT_INVALID');
 return entry;
}

function esmojoMeasureProjection_(document,row){
 const record=esmojoMeasureRecord_(document,row),attachments=(record?.attachments||[]).map(id=>{const entry=esmojoMeasureAttachmentMeta_(document,row.id,id);const {uploadId,fileName,mime,size,sha256}=entry;return{uploadId,fileName,mime,size,sha256};});
 return measureState(row,record?Object.assign({},record,{attachments}):null);
}

function esmojoMeasuresOverview_(target,document,risks){
 if(document.measureImplementations===undefined)return{};
 if(!document.measureImplementations||typeof document.measureImplementations!=='object'||Array.isArray(document.measureImplementations)||Object.keys(document.measureImplementations).some(id=>!validMeasureId(id)))throw Error('CONFLICT');
 const map={};for(const row of measureDefinitions({venue:target.primary.venue},risks).rows)if(document.measureImplementations[row.id])map[row.id]=esmojoMeasureProjection_(document,row);
 return{measureImplementations:map};
}

function esmojoMeasureFile_(target,entry){
 const file=documentFiles.getById(entry.fileId),parents=file.getParents();
 if(file.isTrashed()||file.getMimeType()!==entry.mime||file.getName()!=='Maatregel_'+entry.uploadId+measureUploadTypes[entry.mime]||file.getDescription()!=='ESMOJO/MeasureAttachment-v1'||!parents.hasNext()||parents.next().getId()!==target.folder.getId()||parents.hasNext())throw Error('ATTACHMENT_INVALID');
 const bytes=file.getBlob().getBytes();if(bytes.length!==entry.size||bytes.length>measureUploadLimit||esmojoPdfHash_(bytes)!==entry.sha256||!measureFileSignature(bytes,entry.mime))throw Error('ATTACHMENT_INVALID');return{file,bytes};
}

function esmojoMeasureTextEdit_(document,row,text,actor){
 let record;
 if(row.sourceType==='operational')record=document.operationalReviews?.[row.sourceRevision]?.assessments?.[row.sourceId];
 else record=row.sourceId==='barrier_layout'?document.barrier:row.sourceId==='floor_pressure'?document.floorPressure:null;
 if(!record||record.riskLevel!==row.originalRiskLevel)throw Error('SOURCE_CHANGED');
 const before=JSON.parse(JSON.stringify(record));record[row.sourceType==='production'&&row.sourceId==='floor_pressure'?'note':'riskNote']=text;record.revision++;
 document.history.push({at:new Date().toISOString(),actor,field:'measure_text',measureId:row.id,before,after:JSON.parse(JSON.stringify(record))});
 if(row.sourceType==='production')document.revision++;
 // Alleen de maatregeltekst wijzigt; de oorspronkelijke risicoklasse en afronding blijven behouden.
 return Object.assign({},row,{text,basis:JSON.stringify([row.id,row.originalRiskLevel,text])});
}

// Alleen-lezen gegevens voor de risico-PDF van één beheersmaatregel (Midden/Hoog); geen schrijfactie, geen opslag.
function esmojoMeasureExport_(request){
 const {actor,concertId,measureId}=request;
 esmojoHomeActor_(actor);
 if(typeof concertId!=='string'||!concertId.trim()||concertId.length>240||/[\x00-\x1f/\\]/.test(concertId)||!validMeasureId(measureId))throw Error('VALIDATION');
 const target=esmojoResearchTarget_(concertId),document=esmojoReadProductionRisks_(target).document;
 const risks=esmojoShowProfileRisks_({operation:'risk-view',concertId},target);
 const row=measureDefinitions({venue:target.primary.venue},risks).rows.find(item=>item.id===measureId);
 if(!row)throw Error('SOURCE_CHANGED');
 const state=esmojoMeasureProjection_(document,row),analysisRisk=row.sourceType==='operational'?(risks.risks||[]).find(item=>item.id===row.sourceId):null,review=row.sourceType==='operational'?risks.operational?.assessments?.[row.sourceId]:null;
 const shows=(target.seriesShows||[]).map(item=>item.date).filter(value=>typeof value==='string').sort();
 return{
  show:{artist:target.primary.artist,venue:target.primary.venue||'',city:target.primary.city||'',date:target.primary.date,dates:shows.length?shows:[target.primary.date]},
  risk:{id:row.id,sourceType:row.sourceType,title:row.title,origin:row.origin,description:row.description||null,consequence:analysisRisk?.consequence||null,own:Boolean(analysisRisk?.own),riskLevel:row.originalRiskLevel,assessedAt:review?.completedAt||null},
  measure:{text:row.text,implemented:state.implemented,riskLevelAfter:state.riskLevelAfter,briefing:state.briefing,briefingChosen:state.briefingChosen,completedAt:state.completedAt,attachments:(state.attachments||[]).map(item=>item.fileName)}
 };
}

function esmojoMeasureImplementation_(request){
 const {operation,actor,...payload}=request,input=validateMeasureRequest(Object.assign({operation:operation.slice(8)},payload));
 // De server controleert actuele accountactivatie en Shows-toegang.
 esmojoHomeActor_(actor);
 const target=esmojoResearchTarget_(input.concertId),storage=esmojoReadProductionRisks_(target),document=storage.document;
 if(document.measureUploads!==undefined&&(!document.measureUploads||typeof document.measureUploads!=='object'||Array.isArray(document.measureUploads)))throw Error('CONFLICT');
 const risks=esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},target);
 let row=measureDefinitions({venue:target.primary.venue},risks).rows.find(row=>row.id===input.measureId);
 if(!row)throw Error('SOURCE_CHANGED');
 const current=esmojoMeasureRecord_(document,row),view=()=>({record:esmojoMeasureProjection_(document,row),overview:esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},target)});
 if(input.operation==='read')return view();
 if(input.operation==='download'){
  if(!current?.attachments.includes(input.uploadId))throw Error('ATTACHMENT_INVALID');const entry=esmojoMeasureAttachmentMeta_(document,row.id,input.uploadId),{bytes}=esmojoMeasureFile_(target,entry),{uploadId,fileName,mime,size,sha256}=entry;
  return{attachment:{uploadId,fileName,mime,size,sha256},base64:codec.base64Encode(bytes)};
 }
 const mutation=esmojoPdfHash_(JSON.stringify({actor,input}));
 if(current?.revision===input.revision+1&&current.lastMutation===mutation&&current.basis===row.basis)return view();
 if(input.revision!==(current?.revision||0))throw Error('ASSESSMENT_CONFLICT');
 if(input.basis!==row.basis)throw Error('SOURCE_CHANGED');
 const normalized=measureState(row,current),record={revision:input.revision+1,basis:row.basis,originalRiskLevel:row.originalRiskLevel,riskLevelAfter:normalized.riskLevelAfter,briefing:normalized.briefing,briefingChosen:normalized.briefingChosen,completedAt:normalized.completedAt,completedBy:normalized.completedAt?current.completedBy:null,attachments:[...(current?.attachments||[])],lastMutation:mutation};
 if(input.operation==='edit-text'){
  if(normalized.implemented)throw Error('ASSESSMENT_COMPLETED');
  row=esmojoMeasureTextEdit_(document,row,input.text,actor);record.basis=row.basis;record.riskLevelAfter=null;record.completedAt=null;record.completedBy=null;
 }else if(['draft','complete'].includes(input.operation)){
  if(normalized.implemented&&input.operation==='draft'&&input.data.riskLevelAfter!==record.riskLevelAfter)throw Error('ASSESSMENT_COMPLETED');
  record.riskLevelAfter=input.data.riskLevelAfter;record.briefing=input.data.briefing;record.briefingChosen=typeof input.data.briefing==='boolean';if(!record.briefingChosen){record.completedAt=null;record.completedBy=null;}
  if(input.operation==='complete'){record.completedAt=new Date().toISOString();record.completedBy=actor;}
 }else if(input.operation==='reopen'){
  if(!normalized.implemented)throw Error('VALIDATION');record.completedAt=null;record.completedBy=null;
 }else if(input.operation==='upload'){
  if(record.attachments.length>=20&&!record.attachments.includes(input.uploadId))throw Error('VALIDATION');
  const bytes=codec.base64Decode(input.base64);if(bytes.length>measureUploadLimit||!measureFileSignature(bytes,input.mime)||esmojoPdfHash_(bytes)!==input.sha256)throw Error('ATTACHMENT_INVALID');
  const ledger=document.measureUploads||(document.measureUploads={}),existing=ledger[input.uploadId];
  if(existing&&(existing.measureId!==row.id||existing.sha256!==input.sha256||existing.mime!==input.mime))throw Error('ATTACHMENT_INVALID');
  const name='Maatregel_'+input.uploadId+measureUploadTypes[input.mime],files=target.folder.getFilesByName(name);let file=files.hasNext()?files.next():null;if(files.hasNext())throw Error('CONFLICT');
  if(!file){file=target.folder.createFile(codec.newBlob(bytes,input.mime,name));file.setDescription('ESMOJO/MeasureAttachment-v1');}
  const entry={measureId:row.id,uploadId:input.uploadId,fileId:file.getId(),fileName:input.fileName,mime:input.mime,size:bytes.length,sha256:input.sha256};esmojoMeasureFile_(target,entry);ledger[input.uploadId]=Object.assign({},entry,{actor,createdAt:new Date().toISOString()});
  if(!record.attachments.includes(input.uploadId))record.attachments.push(input.uploadId);record.riskLevelAfter=null;record.completedAt=null;record.completedBy=null;
 }else if(input.operation==='remove'){
  if(!record.attachments.includes(input.uploadId))throw Error('ATTACHMENT_INVALID');esmojoMeasureAttachmentMeta_(document,row.id,input.uploadId);record.attachments=record.attachments.filter(id=>id!==input.uploadId);record.riskLevelAfter=null;record.completedAt=null;record.completedBy=null;
 }
 document.measureImplementations=document.measureImplementations||{};document.measureImplementations[row.id]=record;
 document.history.push({at:new Date().toISOString(),actor,field:'measure_implementation',measureId:row.id,action:input.operation,before:current,after:record});
 esmojoWriteAssessmentDocument_(target,storage);return view();
}

// BarrierValidators business rules
const barrierTypes = [
  {value:'seated',label:'Seated',imageFile:'Minimalistische zitplaatsindeling met podium.png'},
  {value:'end_stage_no_gc',label:'End-stage zonder GC',imageFile:'Staankaart met podiumindeling.png'},
  {value:'end_stage_gc',label:'End-stage met GC',imageFile:'Minimalistische concertzaalindeling.png'},
  {value:'end_stage_catwalk_no_gc',label:'End-stage met catwalk zonder GC',imageFile:'Strakke Plattegrond met Podium en Catwalk.png'},
  {value:'end_stage_catwalk_gc',label:'End-stage met catwalk en GC',imageFile:'Concertindeling met Gouden Cirkels.png'},
  {value:'custom',label:'Afwijkend ontwerp',imageFile:null},
];

const productionRiskLevels = [
  {value:'none',label:'Geen risico',hue:140},{value:'low',label:'Laag',hue:75},
  {value:'medium',label:'Midden',hue:35},{value:'high',label:'Hoog',hue:0},
];

const barrierUploadLimit = 2*1024*1024;

function isStandardBarrierType(type){return barrierTypes.some(row=>row.value===type&&row.value!=='custom');}

function assessmentKeys(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))throw Error('VALIDATION');}

function assessmentConcert(value){if(typeof value!=='string'||!value.trim()||value.length>240||/[\x00-\x1f/\\]/.test(value))throw Error('VALIDATION');}

function assessmentRevision(value){if(!Number.isSafeInteger(value)||value<0)throw Error('VALIDATION');}

function validUploadId(value){return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);}

function validateBarrierData(value,complete=false,requireRiskNote=true){
  const keys=['barrierType','riskLevel','notes','uploadId'];
  if(value&&Object.prototype.hasOwnProperty.call(value,'riskNote'))keys.push('riskNote');
  assessmentKeys(value,keys);
  const riskNote=keys.includes('riskNote')?value.riskNote:'';
  if(typeof riskNote!=='string'||riskNote.length>4000||/\x00/.test(riskNote))throw Error('VALIDATION');
  if(value.barrierType!==null&&!barrierTypes.some(row=>row.value===value.barrierType))throw Error('VALIDATION');
  if(value.riskLevel!==null&&!productionRiskLevels.some(row=>row.value===value.riskLevel))throw Error('VALIDATION');
  if(value.barrierType==='custom'){
    if(typeof value.notes!=='string'||value.notes.length>4000||/\x00/.test(value.notes)||(value.uploadId!==null&&!validUploadId(value.uploadId)))throw Error('VALIDATION');
  }else if(value.notes!==null||value.uploadId!==null)throw Error('VALIDATION');
  if(complete&&(!value.barrierType||!value.riskLevel||(value.barrierType==='custom'&&(!value.notes.trim()||!value.uploadId))))throw Error('VALIDATION');
  const standardNoRisk=value.riskLevel==='none'&&isStandardBarrierType(value.barrierType);
  if(complete&&requireRiskNote&&['none','medium','high'].includes(value.riskLevel)&&!standardNoRisk&&!riskNote.trim())throw Error('VALIDATION');
  return {barrierType:value.barrierType,riskLevel:value.riskLevel,notes:complete&&value.barrierType==='custom'?value.notes.trim():value.notes,uploadId:value.uploadId,riskNote:value.riskLevel==='low'||standardNoRisk?'':complete?riskNote.trim():riskNote};
}

function emptyBarrier(){return {revision:0,barrierType:null,riskLevel:null,notes:null,attachment:null,riskNote:'',completed:false,completedBy:null,completedAt:null};}

function barrierData(record){return {barrierType:record.barrierType,riskLevel:record.riskLevel,notes:record.barrierType==='custom'?record.notes||'':null,uploadId:record.barrierType==='custom'?record.attachment?.uploadId||null:null,riskNote:record.riskNote??''};}

function barrierSignature(record){return JSON.stringify([record.barrierType,record.barrierType==='custom'?record.attachment?.sha256||null:null]);}

function attachmentSignatureValid(bytes,mime){
  const b=Array.from(bytes,x=>(x+256)%256);
  return mime==='image/png'?b.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)&&String.fromCharCode(...b.slice(12,16))==='IHDR':mime==='application/pdf'?b.length>=8&&[37,80,68,70,45].every((v,i)=>b[i]===v):false;
}

// FloorPressureValidators business rules
const floorSectionDefinitions={
  end_stage_no_gc:[['standing','Staanplaatsen']],end_stage_catwalk_no_gc:[['standing','Staanplaatsen']],
  end_stage_gc:[['standing','Staanplaatsen'],['gc','Golden Circle']],
  end_stage_catwalk_gc:[['standing','Staanplaatsen'],['gc_left','Golden Circle Left'],['gc_right','Golden Circle Right']],
  custom:[['standing','Staanplaatsen']],seated:[],
};

function emptyFloorSections(type){return (floorSectionDefinitions[type]||[]).map(([id,name])=>({id,name,visitors:null,area:null}));}

function floorDensity(visitors,area){
  if(!Number.isSafeInteger(visitors)||visitors<0||typeof area!=='number'||!Number.isFinite(area)||area<=0)return null;
  const result=Math.round((visitors/area+Number.EPSILON)*100)/100;return Number.isFinite(result)?result:null;
}

function validateFloorData(value,type,complete=false){
  assessmentKeys(value,['rows','riskLevel','note']);
  if(!barrierTypes.some(row=>row.value===type)||type==='seated'||!Array.isArray(value.rows)||!value.rows.length||JSON.stringify(value).length>80000
    ||(value.riskLevel!==null&&!productionRiskLevels.some(row=>row.value===value.riskLevel))||typeof value.note!=='string'||value.note.length>4000||/\x00/.test(value.note))throw Error('VALIDATION');
  const fixed=floorSectionDefinitions[type],names=new Set(),ids=new Set();
  value.rows.forEach((row,i)=>{
    assessmentKeys(row,['id','name','visitors','area']);
    if(typeof row.id!=='string'||!/^[a-z0-9_-]{1,80}$/.test(row.id)||ids.has(row.id)||typeof row.name!=='string'||row.name.length>120||/[\x00-\x1f]/.test(row.name))throw Error('VALIDATION');
    ids.add(row.id);
    if(type!=='custom'||i===0){if(!fixed[i]||row.id!==fixed[i][0]||row.name!==fixed[i][1])throw Error('VALIDATION');}
    const key=row.name.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
    if(complete&&(!key||names.has(key)))throw Error('VALIDATION');names.add(key);
    if(row.visitors!==null&&(!Number.isSafeInteger(row.visitors)||row.visitors<0))throw Error('VALIDATION');
    if(row.area!==null&&(typeof row.area!=='number'||!Number.isFinite(row.area)||row.area<0))throw Error('VALIDATION');
    if(complete&&floorDensity(row.visitors,row.area)===null)throw Error('VALIDATION');
  });
  if(type!=='custom'&&value.rows.length!==fixed.length)throw Error('VALIDATION');
  if(complete&&(!value.riskLevel||(['none','medium','high'].includes(value.riskLevel)&&!value.note.trim())))throw Error('VALIDATION');
  return value;
}

// BarrierLayout business rules
function esmojoBarrierRecord_(document){
  const record=document.barrier||emptyBarrier();assessmentRevision(record.revision);validateBarrierData(barrierData(record),record.completed===true,Object.prototype.hasOwnProperty.call(record,'riskNote'));
  if(typeof record.completed!=='boolean'||(record.completed&&(!record.completedBy||!Number.isFinite(Date.parse(record.completedAt)))))throw Error('CONFLICT');
  return record;
}

function esmojoBarrierSummary_(document){const r=esmojoBarrierRecord_(document);return {revision:r.revision,completed:r.completed,riskLevel:r.riskLevel,riskNote:r.riskNote??null,active:r.completed&&r.riskLevel!=='none'};}

function esmojoBarrierFile_(target,attachment){
  if(!attachment||!validUploadId(attachment.uploadId)||!['image/png','application/pdf'].includes(attachment.mime)||typeof attachment.fileId!=='string'||!/^[a-f0-9]{64}$/.test(attachment.sha256||''))throw Error('ATTACHMENT_INVALID');
  const file=documentFiles.getById(attachment.fileId),parents=file.getParents();
  if(file.isTrashed()||file.getMimeType()!==attachment.mime||file.getName()!=='Barrieropstelling_'+attachment.uploadId+(attachment.mime==='image/png'?'.png':'.pdf')||file.getDescription()!=='ESMOJO/BarrierAttachment-v1'||!parents.hasNext()||parents.next().getId()!==target.folder.getId()||parents.hasNext())throw Error('ATTACHMENT_INVALID');
  const bytes=file.getBlob().getBytes();if(bytes.length!==attachment.size||bytes.length>barrierUploadLimit||esmojoPdfHash_(bytes)!==attachment.sha256||!attachmentSignatureValid(bytes,attachment.mime))throw Error('ATTACHMENT_INVALID');
  return {file,bytes};
}

function esmojoWriteAssessmentDocument_(target,storage){
  const body=JSON.stringify(storage.document,null,2);
  const saved=storage.file?(storage.file.setContent(body),storage.file):target.folder.createFile(codec.newBlob(body,'application/json','productionele-risicos.json'));
  if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('VERIFY');storage.file=saved;
}

function esmojoBarrierSave_(target,storage,record,actor,action){
  const before=esmojoBarrierRecord_(storage.document);
  storage.document.history.push({at:new Date().toISOString(),actor,field:'barrier_layout',action,before,after:record});
  storage.document.barrier=record;storage.document.revision++;
  if(typeof esmojoSyncFloor_==='function')esmojoSyncFloor_(storage.document,record,actor);
  esmojoWriteAssessmentDocument_(target,storage);return {record,overview:esmojoAssessmentOverview_(storage.document)};
}

function esmojoBarrierLayout_(request,openTarget){
  const op=request.operation.slice(8),fields={read:[],download:['uploadId'],draft:['revision','data'],complete:['revision','data'],reopen:['revision'],'remove-upload':['revision','uploadId'],upload:['revision','uploadId','fileName','mime','base64','sha256']}[op];
  if(!fields)throw Error('VALIDATION');
  riskKeys(request,['operation','concertId','actor',...fields]);assessmentConcert(request.concertId);
  if(typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
  if(fields.includes('revision'))assessmentRevision(request.revision);
  if(fields.includes('uploadId')&&!validUploadId(request.uploadId))throw Error('VALIDATION');
  const target=openTarget||esmojoResearchTarget_(request.concertId),storage=esmojoReadProductionRisks_(target),document=storage.document,current=esmojoBarrierRecord_(document);
  if(op==='read')return {record:current,overview:esmojoAssessmentOverview_(document)};
  if(op==='download'){
    if(current.attachment?.uploadId!==request.uploadId)throw Error('ATTACHMENT_INVALID');
    const {bytes}=esmojoBarrierFile_(target,current.attachment);return {attachment:current.attachment,base64:codec.base64Encode(bytes)};
  }
  if(['draft','complete'].includes(op))request.data=validateBarrierData(request.data,op==='complete');
  if(current.completed){
    if(op==='complete'&&JSON.stringify(barrierData(current))===JSON.stringify(request.data))return {record:current,overview:esmojoAssessmentOverview_(document)};
    if(op!=='reopen')throw Error('ASSESSMENT_COMPLETED');
  }
  if(op==='upload'&&current.attachment?.uploadId===request.uploadId&&current.attachment.sha256===request.sha256){esmojoBarrierFile_(target,current.attachment);return {record:current,overview:esmojoAssessmentOverview_(document)};}
  if(request.revision!==current.revision){
    if(op==='draft'&&current.revision===request.revision+1&&JSON.stringify(barrierData(current))===JSON.stringify(request.data))return {record:current,overview:esmojoAssessmentOverview_(document)};
    if(op==='remove-upload'&&!current.attachment&&current.revision===request.revision+1)return {record:current,overview:esmojoAssessmentOverview_(document)};
    throw Error('ASSESSMENT_CONFLICT');
  }
  const record=Object.assign({},current,{revision:current.revision+1});
  const ledger=document.barrierUploads||(document.barrierUploads={});
  if(op==='reopen'){
    if(!current.completed)throw Error('VALIDATION');record.completed=false;record.completedBy=null;record.completedAt=null;
    return esmojoBarrierSave_(target,storage,record,request.actor,'reopen');
  }
  if(op==='upload'){
    if(current.barrierType!=='custom'||!['image/png','application/pdf'].includes(request.mime)||typeof request.fileName!=='string'||!request.fileName.trim()||request.fileName.length>180||/[\x00-\x1f/\\]/.test(request.fileName)
      ||!(request.mime==='image/png'?/\.png$/i:/\.pdf$/i).test(request.fileName)||typeof request.base64!=='string'||request.base64.length>Math.ceil(barrierUploadLimit/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(request.base64))throw Error('VALIDATION');
    const bytes=codec.base64Decode(request.base64);
    if(bytes.length>barrierUploadLimit||!attachmentSignatureValid(bytes,request.mime)||esmojoPdfHash_(bytes)!==request.sha256)throw Error('VALIDATION');
    const name='Barrieropstelling_'+request.uploadId+(request.mime==='image/png'?'.png':'.pdf'),files=target.folder.getFilesByName(name);
    let file=files.hasNext()?files.next():null;if(files.hasNext())throw Error('CONFLICT');
    if(!file){file=target.folder.createFile(codec.newBlob(bytes,request.mime,name));file.setDescription('ESMOJO/BarrierAttachment-v1');}
    const attachment={uploadId:request.uploadId,fileId:file.getId(),fileName:request.fileName,mime:request.mime,size:bytes.length,sha256:request.sha256};
    esmojoBarrierFile_(target,attachment);ledger[request.uploadId]=Object.assign({},attachment,{uploadedBy:request.actor,createdAt:new Date().toISOString()});
    record.attachment=attachment;
    return esmojoBarrierSave_(target,storage,record,request.actor,'upload');
  }
  if(op==='remove-upload'){
    if(current.attachment?.uploadId!==request.uploadId)throw Error('ASSESSMENT_CONFLICT');
    const {file}=esmojoBarrierFile_(target,current.attachment);if(!ledger[request.uploadId])throw Error('ATTACHMENT_INVALID');
    const historical=document.history.some(item=>item.field==='barrier_layout'&&[item.before,item.after].some(r=>r?.completed&&r.attachment?.uploadId===request.uploadId));ledger[request.uploadId].removedAt=new Date().toISOString();record.attachment=null;
    const result=esmojoBarrierSave_(target,storage,record,request.actor,'remove-upload');
    try{if(!historical)file.setTrashed(true);}catch{/* Ontkoppeling is bevestigd; een achtergebleven privébestand geeft geen app-toegang. */}
    return result;
  }
  const data=request.data;record.barrierType=data.barrierType;record.riskLevel=data.riskLevel;record.notes=data.barrierType==='custom'?data.notes:null;record.riskNote=data.riskNote;record.attachment=null;
  if(data.barrierType==='custom'&&data.uploadId){
    const attachment=ledger[data.uploadId];if(!attachment||attachment.removedAt)throw Error('ATTACHMENT_INVALID');
    const {uploadId,fileId,fileName,mime,size,sha256}=attachment;record.attachment={uploadId,fileId,fileName,mime,size,sha256};esmojoBarrierFile_(target,record.attachment);
  }
  if(op==='complete'){
    if(record.barrierType==='custom'){if(!record.attachment)throw Error('VALIDATION');record.notes=record.notes.trim();}
    record.completed=true;record.completedBy=request.actor;record.completedAt=new Date().toISOString();
  }
  if(op==='draft'&&JSON.stringify(barrierData(current))===JSON.stringify(barrierData(record)))return {record:current,overview:esmojoAssessmentOverview_(document)};
  return esmojoBarrierSave_(target,storage,record,request.actor,op);
}

function esmojoAssessmentOverview_(document){return {production:esmojoProductionRiskState_(document),assessments:{barrier:esmojoBarrierSummary_(document),floor:esmojoFloorSummary_(document)}};}

// FloorPressure business rules
function esmojoFloorTickets_(target){
  try{
    const data=esmojoReadTicketData_(esmojoShowFile_(target.folder,'bezoekersdata.json'),target.primary.concertId),row=JSON.parse(data.workflow_json).visitors.fields.ticket_sales,shows=saleShows({shows:target.seriesShows});
    if(!row?.completed_at||!validTicketContent('ticket_sales',row.content,shows))return {soldTickets:null,shows:[],ticketVersion:row?.version||0};
    const values=validSaleCount(row.content)?[{...shows[0],count:Number(row.content)}]:parseTicketSales(row.content).map(r=>({date:r.date,time:r.time,count:Number(r.count)}));
    values.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
    return {soldTickets:Math.max(...values.map(r=>r.count)),selection:values.length===1?'single_show':'highest_show_date',shows:values,ticketVersion:row.version,updatedAt:row.completed_at};
  }catch{return {soldTickets:null,shows:[],ticketVersion:0,unavailable:true};}
}

function esmojoSyncFloor_(document,barrier,actor){
  const signature=barrierSignature(barrier),old=document.floorPressure;
  if(!barrier.barrierType){if(!old)return false;document.history.push({at:new Date().toISOString(),actor,field:'floor_pressure',action:'barrier_cleared',before:old});document.floorPressure=null;return true;}
  if(old?.barrierSignature===signature&&(barrier.barrierType!=='seated'||(old.completed&&old.riskLevel==='none')))return false;
  if(old)document.history.push({at:new Date().toISOString(),actor,field:'floor_pressure',action:'barrier_changed',before:old});
  let rows=emptyFloorSections(barrier.barrierType);
  if(barrier.barrierType==='custom'&&old?.barrierType==='custom')rows=old.rows.map(({id,name,visitors,area})=>({id,name,visitors,area}));
  else rows=rows.map(row=>{const previous=old?.rows.find(r=>r.id===row.id);return previous?{...row,visitors:previous.visitors,area:previous.area}:row;});
  const seated=barrier.barrierType==='seated';
  document.floorPressure={revision:(old?.revision||0)+1,barrierType:barrier.barrierType,barrierSignature:signature,rows,riskLevel:seated?'none':null,note:'',completed:seated,automated:seated,completedBy:seated?actor:null,completedAt:seated?new Date().toISOString():null,ticketReference:null,invalidatedAt:old?new Date().toISOString():null};
  return true;
}

function esmojoFloorData_(record){return {rows:record.rows.map(({id,name,visitors,area})=>({id,name,visitors,area})),riskLevel:record.riskLevel,note:record.note};}

function esmojoFloorSummary_(document){const r=document.floorPressure;return r?{revision:r.revision,completed:r.completed,riskLevel:r.riskLevel,note:r.note,active:r.completed&&r.riskLevel!=='none'}:null;}

function esmojoFloorPressure_(request,openTarget){
  const op=request.operation.slice(6),fields={read:[],draft:['revision','basis','data'],complete:['revision','basis','data'],reopen:['revision','basis']}[op];
  if(!fields)throw Error('VALIDATION');riskKeys(request,['operation','concertId','actor',...fields]);assessmentConcert(request.concertId);
  if(typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
  const target=openTarget||esmojoResearchTarget_(request.concertId),storage=esmojoReadProductionRisks_(target),document=storage.document,barrier=esmojoBarrierRecord_(document),tickets=esmojoFloorTickets_(target);
  if(esmojoSyncFloor_(document,barrier,request.actor)){document.revision++;esmojoWriteAssessmentDocument_(target,storage);}
  const record=document.floorPressure||null,basis={barrierSignature:barrierSignature(barrier),ticketVersion:tickets.ticketVersion};
  const response=()=>({record:document.floorPressure||null,barrierType:barrier.barrierType,basis,tickets,overview:esmojoAssessmentOverview_(document)});
  if(op==='read')return response();
  assessmentRevision(request.revision);assessmentKeys(request.basis,['barrierSignature','ticketVersion']);
  if(!record||request.basis.barrierSignature!==basis.barrierSignature||record.barrierSignature!==basis.barrierSignature)throw Error('ASSESSMENT_CONFLICT');
  if(record.barrierType==='seated')throw Error('ASSESSMENT_COMPLETED');
  if(['draft','complete'].includes(op))validateFloorData(request.data,barrier.barrierType,op==='complete');
  if(record.completed){
    if(op==='complete'&&record.ticketReference?.ticketVersion===request.basis.ticketVersion&&JSON.stringify(esmojoFloorData_(record))===JSON.stringify(request.data))return response();
    if(op!=='reopen')throw Error('ASSESSMENT_COMPLETED');
  }
  if(request.revision!==record.revision){if(op==='draft'&&record.revision===request.revision+1&&JSON.stringify(esmojoFloorData_(record))===JSON.stringify(request.data))return response();throw Error('ASSESSMENT_CONFLICT');}
  if(op==='complete'&&request.basis.ticketVersion!==tickets.ticketVersion)throw Error('ASSESSMENT_CONFLICT');
  const next=Object.assign({},record,{revision:record.revision+1});
  if(op==='reopen'){if(!record.completed)throw Error('VALIDATION');next.completed=false;next.completedAt=null;next.completedBy=null;}
  else{
    next.rows=request.data.rows.map(row=>Object.assign({},row,{density:floorDensity(row.visitors,row.area)}));next.riskLevel=request.data.riskLevel;next.note=request.data.note;
    if(op==='draft'&&JSON.stringify(esmojoFloorData_(record))===JSON.stringify(request.data))return response();
    if(op==='complete'){next.completed=true;next.completedBy=request.actor;next.completedAt=new Date().toISOString();next.ticketReference=tickets;next.invalidatedAt=null;}
  }
  document.history.push({at:new Date().toISOString(),actor:request.actor,field:'floor_pressure',action:op,before:record,after:next});document.floorPressure=next;document.revision++;esmojoWriteAssessmentDocument_(target,storage);return response();
}

// OperationalRiskValidators business rules
const operationalRiskLabels={none:'Geen risico',low:'Laag',medium:'Midden',high:'Hoog'};

function validateOperationalReview(input){
 const keys=['concertId','source','riskId','revision','riskLevel','riskNote'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.sort().join(','))throw Error('VALIDATION');
 if(typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)||!/^R[0-9]{2}$/.test(input.riskId||'')||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('VALIDATION');
 if(!input.source||Object.keys(input.source).sort().join(',')!=='revision,sha256'||!['revision','sha256'].every(key=>/^[a-f0-9]{64}$/.test(input.source[key]||'')))throw Error('VALIDATION');
 if(!Object.hasOwn(operationalRiskLabels,input.riskLevel)||typeof input.riskNote!=='string'||input.riskNote.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(input.riskNote)||input.riskLevel!=='low'&&!input.riskNote.trim())throw Error('VALIDATION');
 return {...input,source:{...input.source},riskNote:input.riskLevel==='low'?'':input.riskNote.trim()};
}

// OperationalRisks business rules
function esmojoOperationalState_(document,source){
 if(document.operationalReviews!==undefined&&(!document.operationalReviews||typeof document.operationalReviews!=='object'||Array.isArray(document.operationalReviews)))throw Error('CONFLICT');
 const state=document.operationalReviews?.[source.revision];
 if(!state)return{source,assessments:{}};
 if(!state.source||state.source.revision!==source.revision||state.source.sha256!==source.sha256||!state.assessments||Array.isArray(state.assessments)||!Array.isArray(state.history))throw Error('CONFLICT');
 const assessments={};
 for(const [riskId,row]of Object.entries(state.assessments)){
  validateOperationalReview({concertId:document.concertId,source,riskId,revision:row.revision,riskLevel:row.riskLevel,riskNote:row.riskNote});
  if(row.revision<1||typeof row.completedAt!=='string'||!Number.isFinite(Date.parse(row.completedAt)))throw Error('CONFLICT');
  assessments[riskId]={revision:row.revision,riskLevel:row.riskLevel,riskNote:row.riskNote,completedAt:row.completedAt};
 }
 return{source,assessments};
}

// Eigen operationele risico's van de ESM (Vertrouwelijk, zelfde opslag als de overige risicobeoordelingen): gedefinieerd risico en mogelijk
// gevolg staan op showniveau in productionele-risicos.json (ownRisks) en worden bij iedere nieuwe analyse opnieuw aangeboden; de beoordeling
// staat, net als bij AI-risico's, per analyserevisie in operationalReviews. Id's R31 t/m R99; samen met de analyse maximaal 30 risico's.
const OWN_RISK_TOTAL_MAX=30;
function esmojoOwnRisks_(document){
 const list=document.ownRisks;if(list===undefined)return[];
 if(!Array.isArray(list)||list.length>69)throw Error('CONFLICT');
 const seen=new Set();
 for(const item of list){
  if(!item||typeof item!=='object'||Array.isArray(item)||!/^R(?:3[1-9]|[4-9][0-9])$/.test(item.id||'')||seen.has(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>200||item.description!==undefined&&(typeof item.description!=='string'||!item.description.trim()||item.description.length>600)||typeof item.consequence!=='string'||!item.consequence.trim()||item.consequence.length>600||!/^[a-f0-9-]{36}$/.test(item.requestId||'')||!Number.isFinite(Date.parse(item.createdAt))||typeof item.actor!=='string')throw Error('CONFLICT');
  seen.add(item.id);
 }
 return list;
}
function validateOwnRiskInput(input){
 const keys=['concertId','source','requestId','title','description','consequence','riskLevel','riskNote'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.slice().sort().join(','))throw Error('VALIDATION');
 const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value);
 if(!/^[a-f0-9-]{36}$/.test(input.requestId||'')||!text(input.title,120)||!text(input.description,600)||!text(input.consequence,600))throw Error('VALIDATION');
 // Dezelfde regels voor risicoklasse en toelichting/maatregel als bij iedere operationele beoordeling.
 const review=validateOperationalReview({concertId:input.concertId,source:input.source,riskId:'R31',revision:0,riskLevel:input.riskLevel,riskNote:input.riskNote});
 return{concertId:input.concertId,source:review.source,requestId:input.requestId,title:input.title.trim().replace(/\s+/g,' '),description:input.description.trim(),consequence:input.consequence.trim(),riskLevel:review.riskLevel,riskNote:review.riskNote};
}
function esmojoOwnRiskAdd_(request){
 const {operation,actor,...payload}=request,input=validateOwnRiskInput(payload);
 if(typeof actor!=='string'||!actor||actor.length>100)throw Error('VALIDATION');
 const source=esmojoRiskSource_(input.concertId,input.source,true),analysis=esmojoRiskDocument_(esmojoShowFile_(source.target.folder,riskFilename(source.source)),source);
 if(!analysis)throw Error('SOURCE_CHANGED');
 const {file,document}=esmojoReadProductionRisks_(source.target),own=esmojoOwnRisks_(document),state=esmojoOperationalState_(document,source.source),overview=()=>esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},source.target);
 // Een herhaalde opdracht (verloren bevestiging) maakt geen tweede risico.
 const known=own.find(item=>item.requestId===input.requestId);
 if(known)return{riskId:known.id,record:state.assessments[known.id]||null,overview:overview()};
 if(analysis.result.risks.length+own.length>=OWN_RISK_TOTAL_MAX)throw Error('OWN_RISK_LIMIT');
 const id='R'+String(Math.max(30,...own.map(item=>Number(item.id.slice(1))))+1).padStart(2,'0'),now=new Date().toISOString();
 const record={revision:1,riskLevel:input.riskLevel,riskNote:input.riskNote,completedAt:now};
 if(document.operationalReviews!==undefined&&(!document.operationalReviews||Array.isArray(document.operationalReviews)||typeof document.operationalReviews!=='object'))throw Error('CONFLICT');
 document.ownRisks=[...own,{id,title:input.title,description:input.description,consequence:input.consequence,requestId:input.requestId,createdAt:now,actor}];
 document.operationalReviews=document.operationalReviews||{};
 const stored=document.operationalReviews[source.source.revision]||{source:source.source,assessments:{},history:[]};
 stored.history.push({at:now,actor,riskId:id,before:null,after:record});stored.assessments[id]=record;document.operationalReviews[source.source.revision]=stored;
 const text=JSON.stringify(document,null,2),saved=file?(file.setContent(text),file):source.target.folder.createFile(codec.newBlob(text,'application/json','productionele-risicos.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('VERIFY');
 return{riskId:id,record,overview:overview()};
}

function esmojoOperationalSave_(request){
 const {operation,actor,...payload}=request,input=validateOperationalReview(payload);
 if(typeof actor!=='string'||!actor||actor.length>100)throw Error('VALIDATION');
 const source=esmojoRiskSource_(input.concertId,input.source,true),analysis=esmojoRiskDocument_(esmojoShowFile_(source.target.folder,riskFilename(source.source)),source);
 if(!analysis)throw Error('SOURCE_CHANGED');
 const {file,document}=esmojoReadProductionRisks_(source.target);
 // Een beoordeling hoort bij een risico uit de actuele analyse of bij een eigen risico van de ESM.
 if(!analysis.result.risks.some(risk=>risk.id===input.riskId)&&!esmojoOwnRisks_(document).some(own=>own.id===input.riskId))throw Error('SOURCE_CHANGED');
 const state=esmojoOperationalState_(document,source.source),previous=state.assessments[input.riskId];
 if(input.revision!==(previous?.revision||0)){
  if(previous?.revision!==input.revision+1||previous.riskLevel!==input.riskLevel||previous.riskNote!==input.riskNote)throw Error('ASSESSMENT_CONFLICT');
  return{record:previous,overview:esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},source.target)};
 }
 if(document.operationalReviews!==undefined&&(!document.operationalReviews||Array.isArray(document.operationalReviews)||typeof document.operationalReviews!=='object'))throw Error('CONFLICT');
 document.operationalReviews = document.operationalReviews || {};
 const stored=document.operationalReviews[source.source.revision]||{source:source.source,assessments:{},history:[]};
 const record={revision:input.revision+1,riskLevel:input.riskLevel,riskNote:input.riskNote,completedAt:new Date().toISOString()};
 stored.history.push({at:record.completedAt,actor,riskId:input.riskId,before:previous||null,after:record});stored.assessments[input.riskId]=record;document.operationalReviews[source.source.revision]=stored;
 const text=JSON.stringify(document,null,2),saved=file?(file.setContent(text),file):source.target.folder.createFile(codec.newBlob(text,'application/json','productionele-risicos.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('VERIFY');
 return{record,overview:esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},source.target)};
}

// ShowProfileRisks business rules
function esmojoRiskSource_(concertId, source, current, target=esmojoResearchTarget_(concertId)) {
  const register = esmojoReadPdfRegister_(esmojoShowFile_(target.folder,'showprofiel-pdf.json'),target.primary.concertId);
  if(!Object.keys(register.reports).length)throw Error('REPORT_NOT_READY');
  const revision = current ? esmojoPdfSnapshot_(concertId,target).revision : source.revision;
  if (source && revision !== source.revision) throw Error('SOURCE_CHANGED');
  const row = register.reports[revision];
  if (!row) throw Error('REPORT_NOT_READY');
  if (source && row.sha256 !== source.sha256) throw Error('SOURCE_CHANGED');
  const file = esmojoPdfStoredFile_(row,target.folder);
  return {target,row,file,source:{revision,sha256:row.sha256}};
}

function esmojoRiskDocument_(file, source) {
  if (!file) return null;
  const document=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  riskKeys(document,['managedBy','schemaVersion','classification','status','concertId','source','pdfVersion','createdAt','result']);
  if(document.managedBy!=='ESMOJO/ShowProfileRisks-v1'||document.schemaVersion!==1||document.classification!=='vertrouwelijk'
    ||document.status!=='concept'||document.concertId!==source.target.primary.concertId||document.pdfVersion!==source.row.version
    ||!Number.isFinite(Date.parse(document.createdAt)))throw Error('CONFLICT');
  validateRiskReference(document.source);
  if(document.source.revision!==source.source.revision||document.source.sha256!==source.source.sha256)throw Error('CONFLICT');
  validateRiskResult(document.result);
  return document;
}

function esmojoRiskBytes_(source) {
  const bytes=source.file.getBlob().getBytes();
  if(bytes.length>2*1024*1024||esmojoPdfHash_(bytes)!==source.source.sha256)throw Error('REPORT_UNAVAILABLE');
  return bytes;
}

function esmojoRiskStatus_(concertId) {
  let source;
  try{source=esmojoRiskSource_(concertId,null,true);}catch(error){if(error.message==='REPORT_NOT_READY')return{concertId,state:'not-ready'};throw error;}
  const filename=riskFilename(source.source),document=esmojoRiskDocument_(esmojoShowFile_(source.target.folder,filename),source);
  return {concertId:source.target.primary.concertId,state:'ready',classification:'vertrouwelijk',source:source.source,
    pdf:{version:source.row.version,fileName:source.row.fileName,sourceUpdatedAt:source.row.sourceUpdatedAt},
    analysis:{exists:Boolean(document),filename,promptVersion:RISK_PROMPT_VERSION}};
}

function esmojoShowProfileRisks_(request,openTarget) {
  if(request.operation==='risk-operational-save')return esmojoOperationalSave_(request);
  if(request.operation==='risk-own-add')return esmojoOwnRiskAdd_(request);
  if(request.operation==='risk-measure-export')return esmojoMeasureExport_(request);
  const op=request.operation.slice(5),allowed={pending:['operation','after'],status:['operation','concertId'],view:['operation','concertId'],'production-save':['operation','concertId','field','value','revision','actor'],pdf:['operation','concertId','source'],read:['operation','concertId','source'],save:['operation','concertId','source','result']}[op];
  if(!allowed)throw Error('VALIDATION');riskKeys(request,allowed);
  if(op==='pending')throw Error('VALIDATION');
  riskText(request.concertId,240);if(/[\x00-\x1f/\\]/.test(request.concertId))throw Error('VALIDATION');
  if(op==='status')return esmojoRiskStatus_(request.concertId);
  if(op==='production-save')return esmojoSaveProductionRisk_(request,esmojoResearchTarget_(request.concertId));
  if(op==='view'){
    const target=openTarget||esmojoResearchTarget_(request.concertId),productionDocument=esmojoReadProductionRisks_(target).document,production=esmojoProductionRiskState_(productionDocument);
    const assessments={barrier:typeof esmojoBarrierSummary_==='function'?esmojoBarrierSummary_(productionDocument):null,floor:typeof esmojoFloorSummary_==='function'?esmojoFloorSummary_(productionDocument):null};
    let source;
    try{source=esmojoRiskSource_(request.concertId,null,true,target);}catch(error){if(error.message==='REPORT_NOT_READY')return Object.assign({state:'not-ready',risks:[],production,assessments},esmojoMeasuresOverview_(target,productionDocument,{state:'not-ready',risks:[],production,assessments}));throw error;}
    const document=esmojoRiskDocument_(esmojoShowFile_(source.target.folder,riskFilename(source.source)),source);
    // Browser krijgt alleen de gevraagde definitie; geen PDF-bytes, ticketdata of interne bestandsidentificaties.
    const result={state:document?'ready':'pending',risks:document?[...document.result.risks.map(risk=>({id:risk.id,title:risk.title,description:risk.description,consequence:risk.consequence})),...esmojoOwnRisks_(productionDocument).map(own=>({id:own.id,title:own.title,description:own.description||own.title,consequence:own.consequence,own:true}))]:[],production,assessments,...(document?{operational:esmojoOperationalState_(productionDocument,source.source)}:{})};return Object.assign(result,esmojoMeasuresOverview_(target,productionDocument,result));
  }
  validateRiskReference(request.source);if(op==='save')validateRiskResult(request.result);
  // Nieuwe analyse uitsluitend voor de huidige definitieve PDF. Oude analyses blijven leesbaar.
  const source=esmojoRiskSource_(request.concertId,request.source,op!=='read');
  if(op==='pdf')return {concertId:source.target.primary.concertId,source:source.source,pdfVersion:source.row.version,pdfBase64:codec.base64Encode(esmojoRiskBytes_(source))};
  const filename=riskFilename(source.source),file=esmojoShowFile_(source.target.folder,filename),existing=esmojoRiskDocument_(file,source);
  if(op==='read')return {concertId:source.target.primary.concertId,filename,document:existing};
  esmojoRiskBytes_(source);
  if(existing){if(JSON.stringify(existing.result)!==JSON.stringify(request.result))throw Error('CONFLICT');return{concertId:source.target.primary.concertId,filename,created:false};}
  const document={managedBy:'ESMOJO/ShowProfileRisks-v1',schemaVersion:1,classification:'vertrouwelijk',status:'concept',concertId:source.target.primary.concertId,
    source:source.source,pdfVersion:source.row.version,createdAt:new Date().toISOString(),result:request.result};
  const saved=source.target.folder.createFile(codec.newBlob(JSON.stringify(document,null,2),'application/json',filename));
  if(JSON.stringify(esmojoRiskDocument_(saved,source))!==JSON.stringify(document))throw Error('VERIFY');
  return {concertId:source.target.primary.concertId,filename,created:true};
}

// ShowOpen business rules
function esmojoOpenShow_(request,openTarget){
  assessmentKeys(request,['operation','concertId','actor']);assessmentConcert(request.concertId);
  if(typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
  const target=openTarget||esmojoResearchTarget_(request.concertId),concertId=request.concertId,actor=request.actor;
  const profile=esmojoShowProfile_({operation:'profile-read',concertId},target);
  const tickets=esmojoTicketData_({operation:'ticket-read',concertId,actor},target);
  const barrier=esmojoBarrierLayout_({operation:'barrier-read',concertId,actor},target);
  // Seated synchroniseren vóór het overzicht, zodat productierevisies overeenkomen.
  const floor=esmojoFloorPressure_({operation:'floor-read',concertId,actor},target);
  const risks=esmojoShowProfileRisks_({operation:'risk-view',concertId},target);
  const overview={production:risks.production,assessments:risks.assessments};barrier.overview=overview;floor.overview=overview;
  let pdf=null;
  if(profile.finalization?.categories.visitors.completedAt&&profile.finalization?.categories.artist.completedAt){
    try{pdf=esmojoShowProfilePdf_({operation:'report-status',concertId},target);}
    catch(error){if(error.message!=='REPORT_NOT_READY')throw error;pdf={state:'not-ready'};}
  }
  return {profile,tickets,barrier,floor,risks,pdf};
}
