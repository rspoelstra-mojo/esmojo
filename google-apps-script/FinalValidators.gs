// Gegenereerd uit shared/analysis-finalization.js; alleen export-keywords verwijderd.
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
