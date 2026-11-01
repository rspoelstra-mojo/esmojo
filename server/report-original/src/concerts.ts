import type { TicketMarket } from './popularity.ts'
export type Concert = { id: string | number; artist: string; venue: string; city: string; genre: string; date: string; time: string; genres?: string[]; url?: string; image?: string; description?:string; market?: TicketMarket; shows?: { date: string; time: string; id: string | number }[] }
export const dateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
export function concertShows(concert: Concert) {
  return concert.shows ?? [{ date: concert.date, time: concert.time, id: concert.id }]
}
export function groupConcerts(concerts: Concert[]): Concert[] {
  const groups = new Map<string, Concert[]>()
  for (const concert of concerts) {
    const key = JSON.stringify([concert.artist.trim().toLocaleLowerCase('nl'), concert.venue, concert.city])
    groups.set(key, [...(groups.get(key) ?? []), concert])
  }
  return [...groups.values()].map(group => {
    const shows = [...new Map(group.flatMap(concertShows).map(show => [show.date + '|' + show.time, show])).values()].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    const anchor = [...group].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0]
    const first = anchor.shows ? { date: anchor.date, time: anchor.time, id: anchor.id } : shows[0]
    const concert = group.find(item => String(item.id) === String(first.id)) ?? group[0]
    const genres = [...new Set(group.flatMap(item => item.genres?.length ? item.genres : [item.genre]))]
    return { ...concert, id: first.id, date: first.date, time: first.time, shows, genres, genre: genres.join(' / ') }
  }).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}
export const AGENDA_DAYS = 365
export function upcoming(concerts: Concert[], now: Date, query = '', genre = 'Alle genres', city = 'Alle steden', days = 30) {
  const start = dateKey(now)
  const end = new Date(start + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + days)
  const within = (date: string) => date >= start && date < end.toISOString().slice(0,10)
  return concerts.filter(c => concertShows(c).some(show => within(show.date)) && (genre === 'Alle genres' || (c.genres ?? [c.genre]).includes(genre)) && (city === 'Alle steden' || c.city === city) && `${c.artist} ${c.venue} ${c.city}`.toLowerCase().includes(query.trim().toLowerCase())).map(c => c.shows ? { ...c, shows: c.shows.filter(show => within(show.date)) } : c).sort((a,b) => (a.shows?.[0]?.date ?? a.date).localeCompare(b.shows?.[0]?.date ?? b.date) || a.time.localeCompare(b.time))
}
export function demoConcerts(now: Date): Concert[] {
  return [
    ['Velvet Echo','Paradiso','Amsterdam','Indie'], ['Luna & the Waves','TivoliVredenburg','Utrecht','Soul'], ['Neon District','Melkweg','Amsterdam','Electronic'], ['The Wild Pines','Rotown','Rotterdam','Rock'], ['Mila Sol','Paard','Den Haag','Jazz'], ['Atlas Avenue','Effenaar','Eindhoven','Indie'], ['Midnight Bloom','Vera','Groningen','Pop'], ['Sunday People','Doornroosje','Nijmegen','Soul'], ['After Hours','De Oosterpoort','Groningen','Jazz'],
  ].map(([artist,venue,city,genre],id) => {
    const date = new Date(dateKey(now) + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + [1,3,5,8,12,16,21,26,35][id])
    return {id,artist,venue,city,genre,date:date.toISOString().slice(0,10),time:id % 2 ? '20:30' : '20:00'}
  })
}
