export type RiskFactor = 'environment' | 'visitors' | 'artist'
export type RiskSignal = { key: string; title: string; detail: string; evidence: 'confirmed' | 'previous_show' | 'to_confirm'; context: string; sources: { label: string; url: string }[] }
export type RiskRating = 'Niet van toepassing' | 'Laag' | 'Medium' | 'Hoog'
export type RiskDraft = { rating: RiskRating | null; not_applicable: string; manageable: string; measures: string }
export type ImplementationStatus='in_progress'|'implemented'
export type RiskImplementation={status:ImplementationStatus;manager:string;updated_at:string}
export type RiskMeasureNote={text:string;manager:string;created_at:string}
export type RiskItem = RiskSignal & RiskDraft & { id: string; category: RiskFactor; order: number; origin: 'analysis' | 'manual'; withdrawn: boolean; archived: boolean; completed_at: string | null; reviewer: string; revision: number; implementation?:RiskImplementation;measure_notes?:RiskMeasureNote[] }
export type RiskCategory = { revision: number; processed_at: string | null; source_version: string; items: RiskItem[] }
export type RiskReviews = Partial<Record<RiskFactor, RiskCategory>>
export type RiskUpdate = { action: 'risk'; factor: RiskFactor; expected_revision: number } & (
  { op: 'sync'; signals: RiskSignal[]; research_token?: string } | { op: 'add'; title: string; draft: RiskDraft } |
  { op: 'save'; id: string; draft: RiskDraft; complete: boolean } | { op: 'reopen'; id: string } |
  { op: 'resolve'; id: string; resolution: 'retain' | 'archive'; reason: string } | { op: 'finish' } | {op:'implementation';id:string;status:ImplementationStatus;note?:string}
)
export const emptyRiskCategory = (): RiskCategory => ({revision:0,processed_at:null,source_version:'',items:[]})
export const emptyRiskDraft = (): RiskDraft => ({rating:null,not_applicable:'',manageable:'',measures:''})
function riskText(value: unknown, max: number, required = false): asserts value is string { if(typeof value!=='string' || value.length>max || required && !value.trim()) throw new Error('Ongeldige risicotekst.') }
export function parseRiskSignals(value: unknown): RiskSignal[] {
  if(!Array.isArray(value) || value.length>30) throw new Error('Ongeldige aandachtspunten.')
  const keys = new Set<string>(), titles = new Set<string>()
  return value.map(raw=>{
    if(!raw || typeof raw!=='object' || Object.keys(raw).some(k=>!['key','title','detail','evidence','context','sources'].includes(k))) throw new Error('Ongeldig aandachtspunt.')
    riskText(raw.key,100,true);if(!/^[a-z0-9][a-z0-9_-]*$/.test(raw.key) || keys.has(raw.key)) throw new Error('Dubbel aandachtspunt.');keys.add(raw.key)
    riskText(raw.title,180,true);const titleKey=raw.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');if(titles.has(titleKey))throw new Error('Dubbel aandachtspunt.');titles.add(titleKey);riskText(raw.detail,1800,true);riskText(raw.context,800,true)
    if(!['confirmed','previous_show','to_confirm'].includes(raw.evidence) || !Array.isArray(raw.sources) || raw.sources.length>8) throw new Error('Ongeldige herkomst.')
    const sources=raw.sources.map((source: {label:unknown;url:unknown})=>{riskText(source.label,240,true);riskText(source.url,1500);if(source.url && !/^https?:\/\/[^\s]+$/.test(source.url)) throw new Error('Ongeldige bron.');return {label:source.label,url:source.url}})
    return {key:raw.key,title:raw.title,detail:raw.detail,evidence:raw.evidence,context:raw.context,sources}
  })
}
export function parseRiskDraft(value: unknown): RiskDraft {
  if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Ongeldige beoordeling.')
  const d=value as Record<string,unknown>
  if(Object.keys(d).some(k=>!['rating','not_applicable','manageable','measures'].includes(k)) || d.rating!==null && !['Niet van toepassing','Laag','Medium','Hoog'].includes(String(d.rating))) throw new Error('Ongeldige beoordeling.')
  for(const key of ['not_applicable','manageable','measures']) riskText(d[key],1800)
  return d as RiskDraft
}
export function riskMissing(draft: RiskDraft, manual = false): string[] {
  if(!draft.rating) return ['Kies een beoordeling.']
  if(manual && draft.rating==='Niet van toepassing') return ['Een zelf toegevoegd risico kan niet Geen risico zijn.']
  if(draft.rating==='Niet van toepassing') return draft.not_applicable.trim()?[]:['Licht toe waarom dit risico niet van toepassing is.']
  if(draft.rating==='Medium' || draft.rating==='Hoog') return draft.measures.trim()?[]:['Vul de concrete beheersmaatregelen in.']
  return []
}
export function validateRiskUpdate(raw: unknown): RiskUpdate {
  if(!raw || typeof raw!=='object') throw new Error('Ongeldig risico.')
  const d=raw as Record<string,unknown>
  if(d.action!=='risk' || !['environment','visitors','artist'].includes(String(d.factor)) || !Number.isInteger(d.expected_revision) || Number(d.expected_revision)<0) throw new Error('Ongeldige risicoversie.')
  const fields: Record<string,string[]> = {sync:['signals','research_token'],add:['title','draft'],save:['id','draft','complete'],reopen:['id'],resolve:['id','resolution','reason'],finish:[],implementation:['id','status','note']}
  if(!Object.prototype.hasOwnProperty.call(fields,String(d.op)) || Object.keys(d).some(k=>!['action','factor','expected_revision','op',...fields[String(d.op)]].includes(k))) throw new Error('Ongeldige risicoactie.')
  if('id' in d) riskText(d.id,160,true)
  if(d.op==='implementation'&&!['in_progress','implemented'].includes(String(d.status)))throw new Error('Ongeldige uitvoeringsstatus.')
  if(d.op==='implementation'&&d.note!==undefined){riskText(d.note,1200);if(d.status!=='implemented'&&String(d.note).trim())throw new Error('Een toelichting hoort bij de bevestiging Geïmplementeerd.')}
  if(d.op==='sync'){parseRiskSignals(d.signals);if(d.research_token!==undefined)riskText(d.research_token,5000,true)}
  if(d.op==='add'){riskText(d.title,180,true);const draft=parseRiskDraft(d.draft);if(riskMissing(draft,true).length) throw new Error(riskMissing(draft,true).join(' '))}
  if(d.op==='save'){const draft=parseRiskDraft(d.draft);if(typeof d.complete!=='boolean' || d.complete && riskMissing(draft).length) throw new Error('Vul de verplichte beoordelingsvelden in.')}
  if(d.op==='resolve'){if(!['retain','archive'].includes(String(d.resolution))) throw new Error('Ongeldige afhandeling.');riskText(d.reason,1800,true)}
  return d as RiskUpdate
}
export function applyRiskUpdate(previous: RiskCategory | undefined, update: RiskUpdate, reviewer: string, now: string): RiskCategory {
  validateRiskUpdate(update)
  if(!reviewer) throw new Error('Wijs eerst een Event Safety manager toe.')
  const state: RiskCategory = JSON.parse(JSON.stringify(previous || emptyRiskCategory()))
  if(state.revision!==update.expected_revision) throw new Error('Deze risico’s zijn intussen gewijzigd. Herlaad de show voordat je opslaat.')
  if(update.op==='sync') {
    const signals=parseRiskSignals(update.signals), seen=new Set<string>()
    for(const signal of signals){
      const id='ai:'+signal.key;seen.add(id)
      const existing=state.items.find(item=>item.id===id || item.origin==='analysis' && item.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')===signal.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu,''))
      if(existing)seen.add(existing.id)
      if(existing){
        const before={key:existing.key,title:existing.title,detail:existing.detail,evidence:existing.evidence,context:existing.context,sources:existing.sources}
        if(JSON.stringify(before)!==JSON.stringify(signal) || existing.withdrawn || existing.archived){Object.assign(existing,signal,{completed_at:null,reviewer:'',withdrawn:false,archived:false,revision:existing.revision+1})}
      }else state.items.push({...signal,...emptyRiskDraft(),id,category:update.factor,order:state.items.length,origin:'analysis',withdrawn:false,archived:false,completed_at:null,reviewer:'',revision:1})
    }
    for(const item of state.items) if(item.origin==='analysis' && !seen.has(item.id) && !item.archived && !item.withdrawn){item.withdrawn=true;item.completed_at=null;item.reviewer='';item.revision++}
    state.processed_at=now;state.source_version=riskFingerprint(signals)
  }else if(update.op==='add') {
    const id='manual:'+String(state.revision+1)
    state.items.push({key:id,title:update.title.trim(),detail:'',evidence:'to_confirm',context:'Handmatig toegevoegd door '+reviewer,sources:[],...parseRiskDraft(update.draft),id,category:update.factor,order:state.items.length,origin:'manual',withdrawn:false,archived:false,completed_at:null,reviewer:'',revision:1})
  }else if(update.op==='finish') {
    if(!state.processed_at) throw new Error('De aandachtspunten zijn nog niet succesvol verwerkt.')
    if(state.items.some(item=>!item.archived && (!item.completed_at || item.withdrawn))) throw new Error('Rond eerst alle open risico’s af.')
  }else if(update.op==='implementation'){
    const item=state.items.find(item=>item.id===update.id)
    if(!item||item.archived||item.withdrawn||!item.completed_at||!['Medium','Hoog'].includes(item.rating||'')||!item.measures.trim())throw new Error('Rond eerst dit Medium of Hoog risico met beheersmaatregel af.')
    const note=update.note?.trim()
    if(note){if((item.measure_notes?.length??0)>=30)throw new Error('Deze beheersmaatregel bevat te veel toelichtingen.');item.measure_notes=[...(item.measure_notes??[]),{text:note,manager:reviewer,created_at:now}]}
    if(item.implementation?.status!==update.status||note)item.implementation={status:update.status,manager:reviewer,updated_at:now}
  }else {
    const item=state.items.find(item=>item.id===update.id)
    if(!item || item.archived) throw new Error('Dit risico is niet beschikbaar.')
    if(update.op==='resolve'){
      if(!item.withdrawn) throw new Error('Dit risico wacht niet op afhandeling.')
      item.context+='\nAfhandeling: '+update.reason.trim();item.withdrawn=false;item.archived=update.resolution==='archive';item.completed_at=item.archived?now:null;item.reviewer=item.archived?reviewer:''
    }else if(update.op==='reopen'){item.completed_at=null;item.reviewer=''}
    else {
      if(item.completed_at) throw new Error('Open dit risico eerst opnieuw om het te bewerken.')
      if(item.withdrawn) throw new Error('Handel eerst het verdwenen aandachtspunt af.')
      const draft=parseRiskDraft(update.draft);const missing=riskMissing(draft,item.origin==='manual');if(update.complete && missing.length) throw new Error(missing.join(' '))
      if(item.origin==='manual' && draft.rating==='Niet van toepassing') throw new Error('Ongeldige beoordeling voor een zelf toegevoegd risico.')
      Object.assign(item,draft,{completed_at:update.complete?now:null,reviewer:update.complete?reviewer:''})
    }
    item.revision++
  }
  for(const item of state.items){const before=previous?.items.find(previous=>previous.id===item.id);if(!item.completed_at||item.archived||item.withdrawn||before&&before.revision!==item.revision)delete item.implementation}
  if(state.items.length>80) throw new Error('Deze categorie bevat te veel risico-items. Niets is overschreven.')
  state.revision++
  return state
}
export function parseRiskCategory(value: unknown): RiskCategory | undefined {
  if(value===undefined || value==='') return undefined
  const d=typeof value==='string'?JSON.parse(value):value
  if(!d || !Number.isInteger(d.revision) || d.revision<0 || (d.processed_at!==null && !Number.isFinite(Date.parse(d.processed_at))) || typeof d.source_version!=='string' || !Array.isArray(d.items) || d.items.length>80) throw new Error('Ongeldige opgeslagen risico’s.')
  const ids=new Set<string>()
  for(const item of d.items){parseRiskDraft({rating:item.rating,not_applicable:item.not_applicable,manageable:item.manageable,measures:item.measures});riskText(item.id,160,true);riskText(item.title,180,true);riskText(item.detail,1800);riskText(item.context,4000,true)
    if(ids.has(item.id) || !['analysis','manual'].includes(item.origin) || !['environment','visitors','artist'].includes(item.category) || !Number.isInteger(item.order) || !Number.isInteger(item.revision) || typeof item.withdrawn!=='boolean' || typeof item.archived!=='boolean' || !['confirmed','previous_show','to_confirm'].includes(item.evidence) || !Array.isArray(item.sources) || item.sources.some((source: {label:unknown;url:unknown})=>typeof source.label!=='string'||typeof source.url!=='string'||source.url!==''&&!/^https?:\/\/[^\s]+$/.test(source.url)) || typeof item.reviewer!=='string' || item.completed_at!==null && !Number.isFinite(Date.parse(item.completed_at))) throw new Error('Ongeldig opgeslagen risico.')
    // Older records allowed an empty explanation: reopen these without losing the assessment.
    if(item.completed_at&&!item.archived&&item.origin==='analysis'&&item.rating==='Niet van toepassing'&&!item.not_applicable.trim()){item.completed_at=null;item.reviewer=''}
    if(item.completed_at && !item.archived && riskMissing(item,item.origin==='manual').length) throw new Error('Ongeldige afgeronde beoordeling.')
    if(item.measure_notes!==undefined){if(!Array.isArray(item.measure_notes)||item.measure_notes.length>30)throw new Error('Ongeldige toelichtingen.');for(const note of item.measure_notes){if(!note||typeof note.manager!=='string'||!note.manager.trim()||note.manager.length>200||typeof note.created_at!=='string'||!Number.isFinite(Date.parse(note.created_at)))throw new Error('Ongeldige toelichting.');riskText(note.text,1200,true)}}
    if(item.implementation){const implementation=item.implementation;
      if(!['in_progress','implemented'].includes(implementation.status)||!implementation.manager||typeof implementation.manager!=='string'||implementation.manager.length>200||typeof implementation.updated_at!=='string'||!Number.isFinite(Date.parse(implementation.updated_at))||!item.completed_at||item.archived||item.withdrawn||!['Medium','Hoog'].includes(item.rating))throw new Error('Ongeldige opgeslagen uitvoeringsstatus.')
    }
    ids.add(item.id)
  }
  return d as RiskCategory
}
export function riskFingerprint(value: unknown): string {const text=JSON.stringify(value);let hash=2166136261;for(let i=0;i<text.length;i++) hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16)}
export function riskReport(item: RiskItem): string {
  return `${item.title}\n${item.rating==='Niet van toepassing'?'Geen risico':item.rating || 'Nog te beoordelen'}${item.rating==='Medium'||item.rating==='Hoog'?'\n'+item.measures:''}`
}

export function riskMeasureNotes(item:Pick<RiskItem,'measure_notes'>):string{
 return (item.measure_notes??[]).map(note=>{const date=new Date(note.created_at).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',','');return `${note.manager}, ${date}:\n${note.text}`}).join('\n\n')
}
export function riskMeasuresText(item:Pick<RiskItem,'measures'|'measure_notes'>):string{
 return [item.measures,riskMeasureNotes(item)].filter(Boolean).join('\n\n')
}
