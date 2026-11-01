import type { ResearchCard } from './research-fields.ts'
import type { ResearchFactor } from './research.ts'
export type AttentionScore = { score: number | null; reason: string; dates: { date: string; score: number | null; reason: string }[] }
export type ConfirmedAttention = { score: number; reason: string; completed_at: string; manager: string }
export const attentionTitles: Record<ResearchFactor,string> = { environment:'Omgeving', visitors:'Bezoekers', artist:'Artiest' }
export const attentionRules: Record<ResearchFactor,string> = {
 environment: '1: relevante routes, OV en omliggende evenementen gecontroleerd, geen bijzondere aandachtspunten vastgesteld. 3: beperkte werkzaamheden of één evenement boven 2.000 verwachte bezoekers zonder duidelijke overlap in routes/tijden. 5: relevant evenement met overlappende bezoekersstromen of belangrijke route geraakt met beschikbare alternatieven. 8: meerdere grote evenementen met overlappende aankomst/vertrek OF grote beperking van belangrijke weg/OV-verbinding. 10: meerdere grote evenementen met overlappende stromen EN beperkte bereikbaarheid, OF ernstige blokkade van belangrijke toegangs-/uitstroomroutes. Werkzaamheden binnen 1 km krijgen aandacht, maar afstand alleen bepaalt geen score. Bepaal voor ELKE showdatum afzonderlijk een score en reden in dates; score is de hoogste niet-lege dagscores. Noem in reason de datum met de hoogste score en meld als andere dagen nog te beoordelen zijn.',
 visitors: '1: beschikbare informatie beschrijft rustig/regulier concertgedrag zonder bijzondere aandachtspunten. 3: veel meezingen/dansen of kleine groep vroegkomers zonder beschreven sterke publieksdruk. 5: gedocumenteerde moshpits/crowdsurfen of grote groep die meerdere uren vroeg arriveert. 8: meerdere van deze gedragingen, overnachtende fans OF gedocumenteerde sterke druk op eerste rij. 10: eerdere ernstige verdrukking/crowd crush/verlies van crowd-beheersing waarvan omstandigheden relevant zijn voor deze show. Moshpits of overnachten zijn niet automatisch 10. Leeftijd, geslacht, afkomst en andere groepskenmerken bepalen de score nooit. Ticketdata is context en bepaalt op zichzelf geen veiligheidsscore.',
 artist: '1: beschikbare informatie beschrijft regulier showverloop zonder bijzondere operationele aandachtspunten. 3: incidentele vertraging of bijzonderheid met beperkte gevolgen voor showverloop. 5: herhaaldelijke vertragingen van minstens 30 minuten, afwijkende publieksaansturing OF concreet aangekondigde protestactie rond de show. 8: herhaaldelijke vertragingen van minstens 60 minuten, gedocumenteerde conflicten over veiligheidsinstructies OF oproepen tot gevaarlijk publieksgedrag. 10: gedocumenteerde weigering om mee te werken aan stoppen van een onveilige situatie OF artiestgedrag dat aantoonbaar betrokken was bij ernstig veiligheidsincident en relevant blijft. Vergelijk geplande en werkelijke artieststart, niet deurentijd. Nieuwsbekendheid/controverse alleen telt niet; concrete relevante gebeurtenis vereist.',
}
// Intermediate values refine the five described anchors on the 1–10 scale.
const scoreSchema={type:['integer','null'],minimum:1,maximum:10}
export const attentionSchema={type:'object',additionalProperties:false,required:['score','reason','dates'],properties:{score:scoreSchema,reason:{type:'string'},dates:{type:'array',maxItems:40,items:{type:'object',additionalProperties:false,required:['date','score','reason'],properties:{date:{type:'string'},score:scoreSchema,reason:{type:'string'}}}}}}
function validScore(score: unknown) { return score===null || typeof score==='number' && Number.isInteger(score) && score>=1 && score<=10 }
export function parseAttention(raw: unknown, factor: ResearchFactor): AttentionScore {
 const value=raw as AttentionScore
 if(!value || !validScore(value.score) || typeof value.reason!=='string' || !value.reason.trim() || value.reason.length>1200 || !Array.isArray(value.dates) || value.dates.length>40) throw new Error('Invalid attention score')
 const dates=value.dates.map(item=>{
  if(!item || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(Date.parse(item.date)) || new Date(item.date).toISOString().slice(0,10)!==item.date || !validScore(item.score) || typeof item.reason!=='string' || !item.reason.trim() || item.reason.length>1200)throw new Error('Invalid daily score')
  return {date:item.date,score:item.score,reason:item.reason}
 })
 if(new Set(dates.map(item=>item.date)).size!==dates.length || factor!=='environment' && dates.length)throw new Error('Invalid score dates')
 if(factor==='environment' && dates.length && value.score!==(dates.some(item=>item.score!==null)?Math.max(...dates.flatMap(item=>item.score===null?[]:[item.score])):null))throw new Error('Invalid highest score')
 return {score:value.score,reason:value.reason,dates}
}
export function proposedAttention(cards?: ResearchCard[]) { return cards?.[0]?.attention }
