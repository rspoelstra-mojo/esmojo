const matchText={matched:'Concert gevonden','not-found':'Concert nog niet in ESMOJO (wordt bij verwerking aangemaakt)',ambiguous:'Meerdere concerten mogelijk','performance-required':'Voorstelling (S1/S2) vereist','invalid-filename':'Bestandsnaam niet herkend','not-checked':'Concert niet gecontroleerd'};
export function describeIntakeReceipt(row){
 const file=row.file?.present===false?'bestand ontbreekt':row.file?.present===null?'bestand niet leesbaar':row.file?.tooLarge?'bestand te groot':`${row.file?.bytes} bytes, ${row.file?.complete?'compleet':'onvolledig'}, controle ${row.file?.sha256}`;
 const csv=row.csv?(row.csv.valid?`CSV geldig, ${row.csv.incidents} incidenten${row.csv.showDay===false?', datum sluit niet aan':''}`:`CSV ongeldig (${row.csv.code})`):'CSV niet gecontroleerd';
 return `${row.filename||'(geen naam)'} · status ${row.status||'onbekend'} · ${file} · ${csv} · ${matchText[row.match?.status]||'Concert onbekend'}${row.hints?` [catalogus ${row.hints.catalogue} concerten, ${row.hints.sameDay} op die dag: ${row.hints.sameDayVenue.join('; ')||'geen'}]`:''}`;
}
