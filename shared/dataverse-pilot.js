// Expliciete uitzondering: geen algemene ontsluiting van andere zalen.
export const dataversePilot = Object.freeze({
  concertId: 'Hatsune-Miku_AFAS-Live_15112026',
  artist: 'Hatsune Miku', date: '2026-11-15', venue: 'AFAS Live', city: 'Amsterdam',
  sourceKey: 'hatsunemiku_afaslive_20261115',
  libraryId: '9c30d516-2487-48fe-bbd8-40fcee494bea',
});
export const isDataversePilot = id => id === dataversePilot.concertId;
export const pilotShow = () => ({key:dataversePilot.concertId,name:dataversePilot.artist,dates:[dataversePilot.date],venue:dataversePilot.venue,city:dataversePilot.city});
