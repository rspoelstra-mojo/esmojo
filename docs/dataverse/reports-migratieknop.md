# Alle bestaande Rapportages naar Dataverse kopiëren

Beheerder → Datatransitie → **Rapportages overzetten naar Dataverse** →
**Alle Rapportages-gegevens overzetten**. Eén bewuste productieklik start de kopie.
Vereist: actieve beheerder met Rapportages, bestaande MFA en de voltooide
Rapportages-inrichting. Shows-toegang is niet nodig. Het schema wordt opnieuw
uitsluitend-lezen gecontroleerd, met alle unieke indexen eerst Actief.

De website blijft de huidige rapportagebron gebruiken. De knop verwijdert geen
Drive-originelen, verandert geen aanlever-/opslagroute, maakt geen nieuwe PDF en
verstuurt geen e-mail. Dit is geen algemene Drive-back-up: alleen de geregistreerde
Rapportages-bronnen en hun gecontroleerde, bijbehorende bestanden worden gelezen.
Ongekoppelde CSV's stoppen voor controle in het bestaande rapportagebeheer.

## Wat wordt behouden

- Alle gekoppelde CSV's in private OnTrack en eerder geregistreerde historische
  concertmappen, ook ouder dan de45-dagenmenugrens. Alle drie brontypen behouden.
- Exacte CSV-bytes in Document File, bron-ID/hash/wijzigingsmoment, validatie en
  oorspronkelijke bron-/koppel-/verwerkingshistorie, volledige validatie-/historische
  registers en bestaande historische importcontrole/TSC-metadatadocumenten. Geen bronlinks naar buiten
  volgen en geen bijlage-URL's uit CSV ophalen.
- Alle17 oorspronkelijke CSV-cellen, oorspronkelijke rijpositie, UTC- en lokale
  tijd, Europe/Amsterdam, nachtincidenten en DST-regel. De bestaande berekeningen
  worden hergebruikt. Nieuwe datasets bevatten de bestaande web-KPI's/projecties;
  eventuele lange cellen/projecties worden verliesvrij in gehashte blokken bewaard.
- Bestaande tickets per uitvoering, contactnamen, buitenlandpercentage, fotoherkomst
  en vastgelegde tijdpunten. Geen AI-analyses of risico-inhoud naar Reports kopiëren.
  Bij native Shows komt deze beperkte actuele context uit Dataverse, niet uit de
  achtergebleven Drive-kopie. Historische TSC-bezoekers zijn geen verkochte kaarten;
  uitzettingen/aanhoudingen blijven nullable koptotalen; expliciete nul blijft nul.
- Alle geregistreerde bestaande PDF-artifacts, bron-/layoutbinding, mailgroepen,
  afleverstatus/pogingen/provider/idempotentie, bevroren ontvanger/templategegevens,
  eerste opening, ontvangerselectie/revisie en bestaande verwerkingsversietellers.
  Verwijderde accounts behouden hun oorspronkelijke ontvanger-ID. Bestaande
  medewerkers worden waar aanwezig gekoppeld; dit verleent geen nieuwe rechten.
- Raw ontvangstbewijzen worden uitsluitend als hash geëxporteerd. Geen sessie-,
  OAuth- of accountgeheimen, noncecache, mailverzending of PDF-regeneratie.

Een oude PDF/mailgroep krijgt een eigen historische versie wanneer de toenmalige
CSV/rekencontext niet meer bekend is. De huidige CSV wordt daar nooit bij verzonnen.
Zo'n archiefversie wordt niet als complete webdataset gepubliceerd. Invalid/pending
CSV's blijven als exacte bron en validatiestatus bewaard; ze worden niet stil als
valide incidentdataset aangemerkt. Onleesbare/te grote bytes of onrepresentabele
waarden stoppen de kopie, zonder afkappen of afronden.

## Identiteit en modulegrenzen

Bestaande Core-concerten worden op exact oud concert-ID gevonden en op artiest,
locatie, datum en reeksrelatie gecontroleerd. Geen kopie van een bestaande Show.
Rapportage-only concerten krijgen dezelfde Core-tabellen, met eigen herkenbare
`reports-series/`-herkomst en zonder Shows-zichtbaarheid of Shows-route. De actieve
native Shows-catalogus sluit die reeksen uit; oorspronkelijke Shows-revisies en
voorbereiding worden niet aangepast. Alle bronconcert-ID's en Reports-routes
blijven bewaard. Middag/avond blijven afzonderlijke `_S1`/`_S2`-uitvoeringen.
Leesbare artiestnamen gebruiken de bestaande bevestigde aliassen. Nieuwe historische
reeksen groeperen alleen dezelfde artiest/locatie en maximaal31 dagen vanaf de
begindatum; expliciete bronreeksidentiteiten blijven gescheiden.

Elke fysieke bron houdt haar herkomst, maar identieke inhoud/context levert geen
dubbele logische dataset. De actuele beschikbare bron volgt de bestaande sortering:
nieuwste geldige wijziging, daarna bron-ID. Bestaande ambiguïteitsregels blijven
behouden. Een header kan pas beschikbaar worden als haar gekozen versie volledig
gekopieerd/teruggelezen en haar bestanden gecontroleerd zijn; de runtime schakelt
hiermee nog niet naar deze header om.

## Duurzaam hervatten en verificatie

`reports-migration-v1` gebruikt de bestaande achtergrondengine en vaste main/OIDC-
worker. Geen aparte dienst, geheime sleutel, vrije tabelmapping of browsercursor.
Een vaste48u-delegatie begint bij de startklik; elke stap controleert actuele
beheerder-/Reports-rechten. Intrekken of verlopen stopt de taak. De pagina mag
sluiten; heropenen leest alleen de bewaarde voortgang. Korte providerwachttijden
worden door de worker overbrugd, met behoud van Retry-After en globale/per-taaklease.

Een versleutelde technische Opdracht bevat het checkpoint. Inventaris-/instellingen-
pagina's en controlebewijzen staan als afzonderlijke, onveranderlijke versleutelde
Opdracht-records, gebonden aan initiatiefnemer, taakgeneratie en dezelfde eindtijd.
Deze pagina's zijn geen uitvoerbare taken. Hun payload bevat geen CSV-/PDF-bytes of
raw receipt-tokens. Maximaal één rapport/dataset blijft tijdelijk in server-RAM;
geen vertrouwelijke browseropslag, algemene rechten-cache of broninhoud in CI-logs.

De kopie is create-only met deterministische sleutels en conditionele wijzigingen.
Onafhankelijke incidentregels gaan in changesets van maximaal32 records/2MB. Eerst
bestaande inhoud vergelijken, daarna alleen ontbrekende records schrijven en alle
velden/lookups opnieuw lezen. Een verloren bevestiging kan geen dubbele records
maken; een afwijkend bestaand record wordt niet hersteld/overschreven.

Bestanden gaan in blokken van1MiB naar Dataverse File en worden onafhankelijk per
blok teruggelezen/vergeleken met de bron. Een bestaand bestand wordt opnieuw gelezen,
nooit opnieuw geüpload om een verschil te maskeren. Pas daarna wordt de technische
bestandsstatus geverifieerd. Nog open native sessies blijven alleen versleuteld in
het checkpoint; oude sessies worden veilig opnieuw geopend.

Daarna worden alle module-records read-only teruggelezen en de bron opnieuw vergeleken.
Een aparte eindronde controleert de bronvingerafdruk en header/version-binding per
concert en daarna de gehele inventaris/validatie-/mailregistratie opnieuw. Verandert
de zakelijke bron tijdens de kopie (ook door een gewone worker), dan stopt de taak voor controle.
Dit is een gecontroleerde kopie, geen stille deltareplicatie of bron-schrijfstop.

Een onzekere write behoudt vijftien minuten uitsluiting. Hervatten gebruikt hetzelfde
controlepunt. Opnieuw starten na een conflict/voltooiing maakt een nieuwe taakgeneratie;
exact dezelfde bestaande doelinhoud wordt herkend. Werkelijk gewijzigde doelinhoud of
bronversienummers worden niet automatisch aangepast door een hercontrole. Bewaar de
foutstatus voor onderzoek; druk niet herhaald op opnieuw starten bij een inhoudelijk
conflict. De veilige fouttekst en technische counters bevatten geen incidentinhoud.

## Controles en publicatie

Build en doelgerichte tests omvatten de ondertekende Apps Script-export, metadata-
preflight, rechten/MFA/productie, conditionele Dataverse-wireprovider, batches,
actuele bron/doelvergelijking, echte upload/download-blokken, bestaande Files,
hervatten na serverrestart, duplicaten, bronwijziging, corruptie, TSC, middernacht,
grote tekst en behouden native Shows-modulegrenzen. Browsercontroles omvatten
Reports-only beheerders, één start bij dubbelklikken, terugkomst bij een opgeslagen
taak en mobiel/desktop in licht/donker.

Vercel en **Publish Apps Script** moeten beide op dezelfde geteste main gereed zijn
voordat de knop wordt gebruikt. Gebruik de bestaande script/deployment-ID en vaste
webapp-URL. Codepublicatie voert de kopie niet uit. Alleen de expliciete klik van de
beheerder start de broninventaris en bedrijfswrites. Een groene build bewijst nog
geen productie-kopie; daarvoor moet de servertaak voltooid melden met de aantallen
gecontroleerde rapportages, records en bestanden. Native Reports lezen/schrijven en
omschakeling vragen een volgende afzonderlijke stap.

## Catalogusscope bij de broneindinventaris

De migratie gebruikt dezelfde concertcatalogusscope als de bestaande Reports-
runtime. De OnTrack- en historische registers omvatten daarin al alle vaste
locaties. Het optioneel verbreden naar alle achtergebleven Shows-rijen en het
vóór deduplicatie toevoegen van reeksmetadata veroorzaakt anders extra conflicten
op retained duplicaten die de gewone Reports-runtime terecht niet gebruikt.
Oorspronkelijke reeksinformatie wordt daarom pas na een exacte identiteitsovereenkomst
uit de gesloten bronregisters toegevoegd. Een echt verschil in artiest/zaal/datum/
stad binnen de Reports-catalogus blijft een harde controlestop. Geen bronrij
verwijderen, aanpassen of willekeurig als winnaar aanwijzen.

## Operationele heartbeat versus bronwijzigingen

De normale OnTrack-worker wijzigt ook zonder nieuwe rapportages het tijdelijke
`pipeline`-object. De oorspronkelijke instellingen worden ongewijzigd gekopieerd.
Bij een afwijkende eindvingerafdruk leest de migratie de versleutelde oorspronkelijke
instellingen terug en controleert eerst hun volledige opgeslagen hash. Alleen het
gesloten object `pipeline` (status idle/running/assets-missing en geldige updatedAt)
mag bij een tweede actuele bronvergelijking door die oorspronkelijke baseline
worden vervangen. De ondertekende Apps Script-route geeft uitsluitend matches terug.
Alle andere huidige inventaris-, bron-, context-, versie-, ontvanger- en mailvelden
moeten exact dezelfde oorspronkelijke vingerafdruk opleveren. Extra pipelinevelden,
verwijdering van een bestaande pipeline of zakelijke wijzigingen blijven blokkeren.
Geen gewijzigde bron of doelinhoud wordt gerepareerd, en de bestaande taakgeneratie
en oorspronkelijke48u-eindtijd blijven behouden.
