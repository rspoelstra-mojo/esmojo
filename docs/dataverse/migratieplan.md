> **Actualisatie 12 november 2026:** voor de Shows-module is
> [shows-schema.md](shows-schema.md) het concrete actuele aanmaakcontract.
> Het nieuwere gebruikersbesluit vervangt alle PDF-naar-SharePoint-passages in
> dit oudere ontwerp: PDF’s worden opgeslagen in **Dataverse File**;
> SharePoint/ESMOJO Bibliotheek is uitsluitend voor ChatGPT-uitwisseling.
> De bestaande onderzoekstabel met volledige Markdown blijft behouden.

# Proef, migratie, omschakeling en volledige exit

Status: voorstel, geen uitvoerbare productiemigratie en geen verwijderopdracht.
Dataverse voor applicatiegegevens, SharePoint voor PDF/skillbestanden,
Supabase Auth voor identiteit. Bestaande ESMOJO-functionaliteit/URLs blijven.

## Fase 0 — voorwaarden en volledig manifest

- Productieomgeving/regio, capaciteit, licenties inclusief indirecte toegang en
  externe Showbeheer-gebruikers door Microsoft-beheerder laten vaststellen.
- Beperkte productie-app-rollen voor Dataverse en gekozen SharePoint-site;
  geen voortzetting van brede ontwikkelrol als standaardproductietoegang.
- Afgesproken classificaties blijven geldig; nieuwe opslag-/verwerkingsroute
  expliciet vastleggen vóór vertrouwelijke inhoud wordt gekopieerd. De huidige
  Amerikaanse ontwikkelomgeving ontvangt uitsluitend fictieve proefgegevens.
- Werkelijke broninventaris uit broninventaris.md uitvoeren met bevoegde toegang.
  Vast manifest: sourceKind/sourceId/scope/classificatie/schemaVersion/bytes/hash/
  oorspronkelijke tijden/doelobject/versie/importstatus/controle/verwijderbesluit.
  Manifest bevat gevoelige metadata en hoort niet in Git of Actions-logs.
- Iedere beheerde bron een uitkomst: migreren, afgeleid opnieuw opbouwen,
  technische toestand veilig afsluiten of bewaren/verwijderen na expliciet besluit.
  Onbekende bron en onopgeloste koppeling blokkeren definitieve purge.
- Source-of-truth per veld vastleggen: actieve Supabase-snapshot voor eigen
  velden; Drive voor tickets/floor/bestanden en historische inhoud. Niet alleen
  modifiedAt vergelijken. Nog niet gespiegeld commando eerst verzoenen.

Volumeberekening: aantallen × gemiddelde/grootste recordomvang, plus benodigde
historie/bronbestanden en verwachte jaarlijkse groei. Los rapporteren voor
Dataverse-database, Dataverse-files, audit/log, SharePoint-bestanden/versies,
API-verzoeken en worker-/downloadverkeer. Geen prijzen/capaciteit uitvinden;
werkelijke tenanttoewijzingen en licentievoorwaarden opvragen.

## Fase 1 — schema en verticale fictieve proef

Maak een eigen solution/publisher en versieer schema/choices/relaties. Geen 36
handmatige losse tabellen zonder herhaalbare installatie/export en gecontroleerde
upgrade. Begin met de subset voor artiest → reeks → concert → voorbereiding →
bronrapport/incident → document → paginaweergave/opdracht. Voeg de overige tabellen
voor volledige scope pas gecontroleerd toe.

De proef bevat:

- Eén artiest/reeks met meerdere data/uitvoeringen en vier bezoekerskaarten.
- Showprofiel/Risicoanalyse/Maatregelen direct en via deeplink; basisbound opslag.
- Barrier/vloer/tickets, standaard + afwijkend en transactieraces.
- Kleine/normale/grote rapporten met behoud van parser/filter/scorecontract.
- PDF-publicatie/download in SharePoint en alle vier skillmappen; eerst fictieve
  bestanden. Bestaande connector- of Dataverse-toegang niet als Graph-sitegrant aannemen.
- Volledige/partiële/onbeschikbare score; dagreferenties/dagranking.
- Fouten, herstel, retries, workerconcurrency en daadwerkelijke meetmatrix.

Alle resultaten en fysieke aantallen van de proef blijven herkenbaar als fictief.
Een geslaagde CRUD-proef op crf9f_tabel1 wordt niet gebruikt als productie-proof.

## Fase 2 — gecontroleerde proefmigratie met echte bronnen

Pas in een goedgekeurde omgeving en met vastgestelde rechten:

1. Read-only export van een representatieve bronselectie, met manifest/hashes.
2. Bestaande IDs en Supabase Auth user-ID's behouden of expliciet mappen. Namen
   zijn geen sleutel. Historische, afwezige medewerkers niet vervangen door huidige
   beheerder; oorspronkelijke actorreferentie/tijd bewaren en ontbrekende mapping melden.
3. Bronbytes als bron bewaren. Normale gegevens naar getypeerde kolommen/relaties;
   complexe historische inhoud zo nodig begrensd gevalideerd JSON in Historieversie.
4. Oude PDF/CSV/afbeelding exact kopiëren en SHA-256 vergelijken; geen verplichte
   regeneratie die een bestand of generatiebron kan veranderen.
5. OnTrack/TSC per broncontract importeren, inclusief ontbrekend/nul, bronregel-ID,
   middag/avond, S1/S2, werkelijke of beleidsmatige bezoekersbasis en tijdlabels.
   Alleen bewezen identieke duplicaten volgens bestaand beleid overslaan.
6. Berekeningen regenereren met dezelfde centrale code/modelversie. Waarden,
   bronset, classificatie en zichtbaar afgeronde onderdelen vergelijken. Geen
   Dataverse-afgeronde decimalen opnieuw gebruiken voor risicoklassengrenzen.
7. Documentkoppelingen, referenties, volledige historie, afrondingen, veldstatussen,
   maatregelbriefing en oude URLs/aliases controleren.
8. Reconciliatie: per bronobject één gecontroleerd doel of expliciete uitzondering.
   Geen stille 'best effort'-import en geen onbekende records als nul waarderen.

Koppeling van meerdere bronrapporten aan dezelfde feitelijke uitvoering kan
conflicterende tellingen bevatten. Niet optellen of kiezen op bestandsnaam; apart
verzoenen met bronherkomst. Eén bezoekersnoemer per uitvoering voor referenties.

## Fase 3 — nieuwe leesroute gecontroleerd valideren

Nieuwe provider achter een expliciete configuratie/proefroute, afgescheiden van
live writes. Geen dubbele schrijvers naar twee databases. Vergelijk oude en nieuwe
antwoorden via de bestaande bevoegdheden. Geen onbeveiligde 'debug everything'-route.

Bevestig de prestatie-/correctheidspoorten uit meetplan.md en het exacte
SharePoint-publicatie-/download-/skillcontract. Test Microsoft-storing en
service protection. Geen stille terugval op oude Drive-inhoud om groen te blijven.

## Fase 4 — omschakeling

Een concrete runbook met eigenaar, tijdstip en herstelbesluit is verplicht:

1. Stop nieuwe imports, mailtriggers, AI/PDF-jobs en legacy writers gecontroleerd;
   drain lopende saves/leases. Klanten niet laten denken dat onbevestigde invoer is opgeslagen.
2. Korte afgesproken schrijfstop. Leg de definitieve bronversie/watermark vast.
3. Laatste delta's, documenten en opdracht-/bezorg-/grantstatus migreren en controleren.
4. Alle lees- én schrijfproviders naar Dataverse/SharePoint; Supabase Auth blijft.
   Normale aanvragen mogen niet meer onbedoeld een Drive-bridge starten.
5. Current-view/generaties publiceren, bestaande sessies/rollen/MFA en alle
   deeplinks testen. Showbeheer UUID/hash/credentials en bestaande URL-fragmenten
   behouden; cryptografische AAD en sleutelgebruik vooraf vastleggen.
6. Nieuwe workers activeren vanuit nieuwe autoriteit; oude archiverings- en
   Drive-syncworkers uit. Herstart geen reeds bezorgde mail/PDF-import als nieuwe taak.
7. Live rookproef met bestaande bevoegdheden, inclusief PDF en resultaatimport.
   Oude bronnen blijven voorlopig gecontroleerd read-only, niet als tweede schrijver.

Supabase storage-control/legacy-guards niet blind uitzetten: bestaande beschermingen
kunnen uitschakelen blokkeren zolang actieve rijen bestaan. Uitfasering heeft een
apart gecontroleerd schema-/workerplan; geen guard omzeilen om een snelle purge te doen.

## Herstelpad

Vóór de eerste nieuwe Dataverse-write kan terugschakelen op de ongewijzigde oude
bron eenvoudig zijn. **Na nieuwe writes is blind een providerflag terugzetten
onveilig.** Nieuwe data/bestanden/opdrachten bestaan dan alleen in de nieuwe opslag.

Vóór cutover kiezen en oefenen:

- Fail-forward herstel van de nieuwe provider met behouden canonieke gegevens en
  idempotente opdrachten; of
- Schrijfstop, volledig delta-/documentexport uit Dataverse/SharePoint, gecontroleerde
  terugvertaling naar oude contracts, reconciliatie en pas daarna terugschakelen.

Herstelduur en maximaal dataverlies concreet meten en door eigenaar laten accepteren.
Een nog niet geteste rollback mag niet als 'we kunnen altijd terug' worden beloofd.
Terugvalvenster en definitieve verwijderdatum zijn nog open keuzes, geen automatisch
vastgestelde bewaartermijn. Auth-project blijft bij herstel onaangetast.

## Fase 5 — echt niets achterlaten in Drive en Supabase-applicatieopslag

Alleen na geaccepteerde migratie, herstelperiode en sluitend manifest:

- Verwijder de oude Supabase-applicatietabellen, functies, receipts en eventuele
  applicatie-storagebuckets. Supabase Auth en vereiste Auth-configuratie blijven.
- Verwijder alle beheerde Drive-bedrijfsbestanden, bron-CSV's, PDF's, privéreferenties,
  oude versies/exports en afgeleide registers binnen de vastgestelde scope.
- Prullenbak legen en oude bestandsversies/back-ups volgens providerbeleid beoordelen.
  Niet zomaar andere bestanden in dezelfde persoonlijke Drive opruimen.
- Ontkoppel de oude Apps Script-webapp, Drive-API-routes en sync/archiveringsworkflows
  wanneer ze uitsluitend ESMOJO bedienen. Gedeeld project niet ongericht verwijderen.
- Secrets/OAuth-grants veilig intrekken zodra geen andere noodzakelijke functie
  ze gebruikt. Supabase Auth servicekey niet blind verwijderen: sommige bestaande
  sessie-/Showbeheerbeveiliging gebruikt afgeleide sleutels die behouden of veilig
  gemigreerd moeten worden. Geen onbedoelde invalidatie van links/accounts.
- Tijdelijke exports, lokale kopieën, workflow-artifacts, staginguploads en oude
  gegevenskopieën in andere diensten via afzonderlijke inventaris afhandelen.
  Externe mailboxen/ontvangers zijn geen automatisch geautoriseerde verwijderdoelen.
- Huidige Redis-klikdata naar Dataverse en uit oude keys verwijderen na controle;
  korte MFA/OAuth-technische caches blijven alleen binnen bestaande uitzondering.
- Bewijs dat oude routes/credentials geen bedrijfsgegevens meer kunnen lezen of
  schrijven en nieuwe productie geen Google-storage-call meer doet.

Supabase-projectback-ups kunnen nog historische applicatiedata bevatten terwijl
Auth moet blijven werken. Selectieve onmiddellijke verwijdering uit provider-
back-ups niet aannemen. Exacte retentie en einddatum bevestigen. Hetzelfde geldt
voor Drive-retentie, herstelkopieën en eventuele juridische bewaarplichten.
'Niets achter' krijgt dus een verifieerbare scope én datum, niet alleen lege tabellen.

## Oplevercriteria

- 100% manifestitems verzoend; nul onbeoordeelde objecten/dubbele doelen.
- Alle bestaande businessregels/relaties/URLs/MFA/modulegrenzen aantoonbaar intact.
- Scores en twaalf indicatoren gelijk aan golden referenties op dezelfde bronversies.
- Performance-eisen gehaald met meetrapport; geen kosten-/quotaoverschrijding onder piek.
- PDF-binary en versie correct; vier SharePoint-mappen en bron/resultaatrichting bewezen.
- Echte gebruikers kunnen werken zonder oude opslag; Auth blijft functioneren.
- Herstel geoefend; monitoring zonder gevoelige inhoud; bewaartermijnen vastgesteld.
- Na afgesproken termijn oude bronnen, kopieën, koppelingen en relevante credentials
  aantoonbaar beëindigd, met resterende providerretentie expliciet gerapporteerd.
