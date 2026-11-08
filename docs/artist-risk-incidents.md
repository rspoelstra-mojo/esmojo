# Artiestenrisicoscore en historische incidentreferenties

De gegevens zijn door de gebruiker op 8 november 2026 Vertrouwelijk verklaard.
Nieuwe aanwezigheid/volledigheidsbevestigingen en herberekenbare tellingcache staan
uitsluitend in `_esmojo_incident_metrics_v1.json` in de afgesproken Drive-root.
De bestaande rapportages, analyses en operationele beoordelingen blijven leidend.
Geen Supabase-, log-, analytics- of persistente browseropslag van deze gegevens.

## Gebruik

Beheerder → Incidenten heeft drie hoofdkaarten. Overzicht bevat uitklapbaar
Concertregistraties beheren. Kies een historisch concert, vul het werkelijke
bezoekersaantal in en bevestig de volledigheid van beide disciplines. Lege invoer
blijft onbekend. Nul bezoekers wordt bewaard, maar telt niet mee als noemer.
Verkoop wordt nooit overgenomen. Zonder CSV is alleen een expliciet bevestigde
nulregistratie een geldige incidentbron; een bestaande ongeldige CSV kan daarmee
niet worden omzeild. Bevestigingen hebben per concert een revisie en actor/datum.

Referenties gebruiken alle geschikte, volledige incidentregistraties met >0
werkelijk aanwezigen, ook zonder artiestanalyse. Totaalindicatoren komen uit de
bestaande brontellingen, niet uit de som van overlappende subcategorieën. De
centrale `webReportKpis` wordt ook door de gewone showrapportage gebruikt; de
bestaande PDF-rekenlaag is intact. Ambulance/uitzettingen/aanhoudingen behouden
hun bestaande personenweging. De UI toont drie decimalen en de volledige som.

De artiestscore gebruikt uitsluitend de subset met daarnaast actuele definitieve
bezoekers- en artiestcijfers én alle operationele beoordelingen. Drive controleert
onderliggende afrondingen; actieve voorbereiding gebruikt de bestaande actuele
snapshot en bronbasis. Niet terugvallen op verouderde Drive-cijfers bij een
actieve databasefout. Een lege, daadwerkelijk gereed verklaarde risicoanalyse is
nul risico; een ontbrekende analyse of beoordeling is geen nul.

## Rekenen

`shared/artist-risk-score.js` is de enige score-/referentierekenbron. Referenties
en artiestfrequenties zijn bezoekersgewogen; gemiddelden van eindcijfers en
begrensde operationele concertscores zijn ongewogen rekenkundige gemiddelden.
De maxima zijn 25+25+20+15+15. Klassegrenzen zijn 55/75/90 zonder afronding.
Afwijkingen worden exact met gehele aantallen vergeleken (BigInt-kruisproducten)
voor 25%, 50% en 75%; 75% geeft het volledige categoriegewicht.
De bevestigde nulregel: nul/nul → 0; positief/nul → volledig categoriegewicht.
Twee cijferdecimalen worden alleen voor de kaartpresentatie gebruikt; afgeronde
segmentlabels tellen exact op tot de afgeronde totaalscore. Breedtes en klasse
gebruiken de ongeronde score. De batterij blijft afwezig zonder volledige score.

## Actualisatie en toegang

Lezen vergelijkt de cache met de actuele gevalideerde bronhash en rekenversie.
Oude tellingen worden niet gebruikt na bronwijziging. Dubbele bronbestanden
worden via de bestaande canonieke rapportinventaris tot één concert herleid;
dubbele geschikte concertidentiteiten worden geweigerd in plaats van opgeteld.
Een nieuwere, ongeldige/onverwerkte export verdringt geen oude data als geldig
resultaat. Een aangevulde of gecorrigeerde bron wordt automatisch herberekend bij
de volgende paginalezing; open pagina's controleren iedere minuut. Dit is
actualisatie bij gebruik, geen extra geplande bulkimport. Eén telling per verzoek
wordt op de server verwerkt, met gedeeld lopend verzoek; de browser vraagt verder
zolang er nog bronhashes ontbreken. Tijdens een onvolledige referentieherbouw
geen gedeeltelijke artiestscore presenteren.

De artiestlanding wacht niet op score of historische showverzoeken. De bestaande
showwachtrij laadt na de eerste paint één show tegelijk, nieuwste eerst; een
klik krijgt voorrang. Score en rapporten blijven afzonderlijke leesverzoeken.
Bij verlaten: AbortController en paginaversiecontrole; geen oude resultaten op
een andere artiest. De scorekaart reserveert ruimte om verschuiving te beperken.

`incidents` GET/PATCH vereist actieve beheerder/MFA, plus dezelfde actuele
Drive-profielcontrole. `artist-risk` vereist Artiesten/MFA. De HTTP-laag accepteert
geen actor, bronbestand, tellingen of score. Intern berekent Vercel de telling uit
de hashgecontroleerde CSV; alleen de ondertekende serverbrug mag de tellingcache
schrijven. Incidentgegevens worden niet via de score-API teruggestuurd.

## Verificatie

`node --test server/incident-metrics.test.js` controleert gewichten, grenswaarden,
nulreferenties, bezoekersweging, onvolledigheid, duplicate detectie, Drive-opslag,
revisies, broncorrecties, rapportagepariteit, autorisatie en actuele voorbereiding.
`node tools/ui/check-incident-registration.mjs` test ook revisies tijdens
stille refresh en behoud van invoer na fouten in echte Chrome.
Daarnaast bestaande rapportage-, account-, analyse-, wachtrij- en publicatietests.
Browsercontroles gebruiken uitsluitend fictieve fixtures: volle/lege kaart,
batterij/legenda, twaalf uitklappers en formules, desktop/mobiel en licht/donker.
Echte aanwezigheid en volledigheid worden nooit voor tests ingevuld.
