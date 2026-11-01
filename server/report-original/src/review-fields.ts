import {parseTicketSales} from './ticket-sales.ts'
import {parseDomesticOrigins} from './domestic-origins.ts'
import {parseVisitorOrigins} from './visitor-origins.ts'
import { researchFields } from './research-fields.ts'

// Editable workspaces are independent of the AI prompt, which is revised separately.
export const reviewFields = {
  environment: researchFields.environment,
  visitors: [
    {id:'gender_ratio',title:'Man/vrouw verhouding'},
    {id:'age_range',title:'Leeftijdscategorie'},
    {id:'arrival',title:'Aankomstprofiel'},
    {id:'typical_traits',title:'Typische kenmerken'},
    {id:'ticket_sales',title:'Huidige kaartverkoopstand'},
    {id:'visitor_origins',title:'Buitenlandse bezoekers'},
    {id:'domestic_origins',title:'Binnenlandse herkomst'},
  ],
  artist: [
    {id:'artist_description',title:'Artiest'},
    {id:'tour_route',title:'Tourroute'},
    {id:'movement',title:'Show karakter'},
    {id:'punctuality',title:'Curfew'},
    {id:'popularity',title:'Populariteit'},
    {id:'social_sensitivity',title:'Maatschappelijke gevoeligheid'},
    {id:'special_notes',title:'Bijzonderheden'},
  ],
} as const
export const ticketFieldIds = ['ticket_sales','visitor_origins','domestic_origins'] as const
export function isTicketField(id: string) { return (ticketFieldIds as readonly string[]).includes(id) }
export function validTicketCount(value: unknown): value is string {
  return typeof value==='string' && /^\d{1,9}$/.test(value) && Number.isSafeInteger(Number(value))
}

export function validTicketFieldContent(id:string,content:unknown){return id==='domestic_origins'?typeof content==='string'&&Boolean(parseDomesticOrigins(content)):id==='visitor_origins'?typeof content==='string'&&Boolean(parseVisitorOrigins(content)):validTicketCount(content)||Boolean(parseTicketSales(content))}

export function isManualReviewField(id:string){return id==='popularity'}
export function requiredReviewFields(factor:keyof typeof reviewFields){return reviewFields[factor].filter(field=>!isManualReviewField(field.id))}
