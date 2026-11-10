# Artiestenrisicoscore en historische incidentreferenties

De gegevens zijn door de gebruiker op 8 november 2026 Vertrouwelijk verklaard.
De herberekenbare tellingcache staat uitsluitend in
`_esmojo_incident_metrics_v1.json` in de afgesproken Drive-root. Oude handmatige
bevestigingen blijven bewaard, maar worden sinds het aanvullende gebruikersverzoek
niet meer voor de berekening gebruikt. Geen Supabase-, log-, analytics- of
persistente browseropslag van deze gegevens.

## Gebruik

Beheerder → Incidenten heeft drie hoofdkaarten. Overzicht bevat uitklapbaar
Concertgegevens bekijken, uitsluitend alleen-lezen. Geen bevestigingsformulier.
Een aanwezige CSV maakt beveiliging en medisch automatisch volledig. De bron moet
wel geldig, actueel en eenduidig aan het juiste concert gekoppeld zijn voordat
tellingen meetellen. Zonder CSV blijven tellingen onbekend; geen fictieve nullen.

Voor historische CSV-importconcerten vóór 1 november 2026 is de geïmporteerde
`ticket_sales` de bezoekersbasis (100%). Bij nieuwe concerten is dat exact 97,5%
van de opgeslagen, afgeronde ticketverkoop van die showdag. Reekstotalen worden
niet naar een willekeurige dag gekopieerd. De verkoopbron zelf blijft intact.
Een ontbrekende/conceptverkoop blijft onbekend; nul bezoekers telt niet als noemer.
De rekenbasis staat in de alleen-lezen concertgegevens. Twintig tickets geven
bijvoorbeeld exact 19,5 als rekenbasis, zonder tussentijds afronden op personen.

Referenties gebruiken alle geschikte, volledige incidentregistraties met >0
bezoekers volgens deze automatische rekenbasis, ook zonder artiestanalyse. Totaalindicatoren komen uit de
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
De maxima zijn 25+25+25+10+15. Klassegrenzen zijn 55/75/90 zonder afronding.
Afwijkingen worden exact met gehele aantallen vergeleken (BigInt-kruisproducten)
voor 25%, 50% en 75%; 75% geeft het volledige categoriegewicht.
Bezoekersnoemers worden exact als 1/40-eenheden bijgehouden: nieuwe verkoop ×39,
historische bezoekers ×40. Zo blijft ook 2,5% van een oneven verkoopaantal exact.
De nulregel: nul/nul → 0; positief/nul → onbetrouwbaar, geen totaalscore.
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
de volgende paginalezing; open pagina's controleren iedere minuut. De bestaande webworkflow herberekent automatisch iedere vijf minuten. Na een
publicatie wordt een begrensde herbouw tot gereed gestart, afzonderlijk van
mail/import en zonder cijfers of broninhoud naar GitHub te sturen. Eén telling per interactief verzoek
wordt op de server verwerkt, met gedeeld lopend verzoek; de browser vraagt verder
zolang er nog bronhashes ontbreken. Tijdens een onvolledige referentieherbouw
geen gedeeltelijke artiestscore presenteren.

De artiestlanding wacht niet op score of historische showverzoeken. De bestaande
showwachtrij laadt na de eerste paint één show tegelijk, nieuwste eerst; een
klik krijgt voorrang. Score en rapporten blijven afzonderlijke leesverzoeken.
Bij verlaten: AbortController en paginaversiecontrole; geen oude resultaten op
een andere artiest. De scorekaart reserveert ruimte om verschuiving te beperken.

`incidents` ondersteunt uitsluitend GET en vereist actieve beheerder/MFA, plus dezelfde actuele
Drive-profielcontrole. `artist-risk` vereist Artiesten/MFA. De HTTP-laag accepteert
geen actor, bronbestand, tellingen of score. Intern berekent Vercel de telling uit
de hashgecontroleerde CSV; alleen de ondertekende serverbrug mag de tellingcache
schrijven. Incidentgegevens worden niet via de score-API teruggestuurd.

## Verificatie

`node --test server/incident-metrics.test.js` controleert gewichten, grenswaarden,
nulreferenties, bezoekersweging, onvolledigheid, duplicate detectie, Drive-opslag,
automatische bronregels, broncorrecties, rapportagepariteit, autorisatie en actuele voorbereiding.
`node tools/ui/check-incident-registration.mjs` test automatisch verversen van de rekenbasis en ontbreken van handmatige
bevestiging in echte Chrome.
Daarnaast bestaande rapportage-, account-, analyse-, wachtrij- en publicatietests.
Browsercontroles gebruiken uitsluitend fictieve fixtures: volle/lege kaart,
batterij/legenda, twaalf uitklappers en formules, desktop/mobiel en licht/donker.
Echte aanwezigheid en volledigheid worden nooit voor tests ingevuld.

De herberekenfase gebruikt de eigen vaste audience en alias
`/api/incident-references-sync`, die pas met de bijbehorende Vercel-publicatie
beschikbaar is. Dit voorkomt dat een gereedheidsprobe op een oude webworker
onbedoeld de normale rapport-/mailroute aanroept. Geen extra serverfunctie.

## Herbouw en voortgang (V1.98)

Historische bron-/commitreads lopen niet opnieuw alle CSV-bestanden door: het
bestaande register, validatie-indexcontext, bronhash en actuele parent-/metadata-
controle bepalen de bron. De achtergrondwerker behandelt vijf bronnen per ronde;
interactieve reads blijven begrensd. Lopende cache wordt hergebruikt. Een nieuwe
publicatie vervangt een verouderde herbouwtaak; idempotente Drive-writes blijven
veilig hervatbaar. READY/BATCH_CONFIRMED/COMPLETE-meldingen bevatten geen privédata.
De beheerkaart toont tijdens verwerking het aantal geschikte concerten, hun
bezoekersbasis en hoeveel rapportages verwerkt zijn. Onberekende gemiddelden
heten expliciet Nog niet berekend; geen fictieve nul of gedeeltelijke score.

V1.99: interactieve Incidenten- en artiestscore-reads voeren geen CSV-herbouw uit.
Eén metadata-/cacheread geeft direct de stand en voortgang terug. Uitsluitend de
achtergrondwerker leest en verwerkt de CSV-bronnen. Geen wachtrij van writes
voor het weergeven van de beheerpagina.

## Vaste dagstand rond Nederlandse middernacht

De aanvullende gebruikersopdracht vervangt de actualisatie gedurende de dag.
`_esmojo_incident_daily_v1.json` bewaart één complete vertrouwelijke dagstand in
Drive. Dagstand bevat de referenties, twaalf volledige rekensommen en de compacte
alleen-lezen concertgegevens. `incident-daily-read` controleert actuele rechten
en leest uitsluitend dit bestand; geen inventarisatie, CSV of berekening.
De beheerpagina leest eenmaal bij openen en heeft geen automatische polling.

De webworkflow behoudt zijn gewone vijfminutenplanning voor rapportages/mail,
maar verandert daarbij geen incidentcijfers meer. De afzonderlijke cron
`0 22,23 * * *` controleert Europe/Amsterdam en voert uitsluitend om lokaal 00:00
de incidenttaak uit. De andere UTC-ronde stopt zonder API-aanroep. GitHub kan
geplande taken later starten; het opgeslagen tijdstip is de echte publicatietijd.
Een nachtelijke herbouw toont de vorige complete stand tot de nieuwe klaar is.
Eerste installatie mag eenmalig direct de reeds complete tellingen publiceren.

Server en Drive bewaken de kalenderdag: dezelfde dagstand wordt nooit door een
herhaalde workflow, nieuwe CSV of paginabezoek overschreven. Een begonnen nacht-
taak kan gecontroleerd afronden (maximaal vier uur); daarna blijven alleen de
vorige complete cijfers staan. Fouten of onvolledige bronnen publiceren niets.
Artiestenscores gebruiken dezelfde gepubliceerde referenties; de eigen actuele
volledige analyses blijven apart leesbaar. Alle opslag blijft vertrouwelijk in
Drive. Geen nieuwe browseropslag, Supabase-tabel of openbare leesroute.


De nieuwste rekenopdracht vervangt de eerdere incident-only fallback. Alleen
volledige beoordelingen krijgen een score. Status complete en groen label blijven;
onvolledige of onbetrouwbare gegevens tonen de lege kaart zonder gedeeltelijke som.

## Incidentmodel met uitschieters (10 november 2026)

Centrale configuratie shared/artist-risk-model.js: beveiliging25, medisch10,
uitschietermaximum19, volledige afwijkingsfactor bij +300%, aantalfactor vanaf7.
Reguliere beveiligingsmaxima: 3,75 / 2,50 / 6,25 / 3,75 / 3,75 / 5,00.
De vijf specifieke categorieën gebruiken dezelfde uitschieterformule. De hoogste
bijdrage telt eenmaal; overige specifieke categorieën leveren hun reguliere punten.
Totaal beveiligingsmeldingen levert uitsluitend reguliere basispunten. Definitief:
min(25,max(A,B)). Bij gelijke uitschieters geldt vaste categorievolgorde. Medische
categorieverhoudingen blijven gelijk met exact factor10/15 en maximum10, zonder
uitschieterberekening. Geen wijziging van bezoekersgewogen referentiewaarden,
TSC-brontellingen of dagactualisatie.

De centrale assessArtistRisk rapporteert score plus betrouwbaarheid. Positief
tegenover nulreferentie krijgt ZERO_REFERENCE en geen totaalscore; nul/nul=0.
De beveiligde API geeft de beoordeling door, de kaart markeert zo'n vergelijking
als niet betrouwbaar. Ontbrekende analyses leveren INCOMPLETE_DATA. Geen extra
opslag. calculateArtistRisk blijft voor bestaande afnemers score/null retourneren.
Rekenbreuken vergelijken bezoekersunits met BigInt, zonder afgeronde schermcijfers.
De vier batterijsegmenten blijven25/25/15/35; labels tellen op tot het totaal.

Gelijke dubbele rekenregistraties worden vóór aggregatie en beoordelingen verwijderd
(op concert-ID of dezelfde genormaliseerde artiest/datum/zaal/voorstelling). Bij
afwijkende tellingen/beoordelingen voor dezelfde registratie stopt de berekening
met DUPLICATE_CONCERT; geen willekeurige keuze of mutatie van Drive-bronnen.
