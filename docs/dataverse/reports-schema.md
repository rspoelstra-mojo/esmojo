# Dataverse-inrichting voor Rapportages

Dit is uitsluitend de voorbereiding van het opslagmodel en de beveiligde
inrichtingsknop. Deze wijziging importeert geen CSV, kopieert geen rapportage,
verandert geen opslagroute en genereert of verstuurt niets. De huidige
rapportageweergave, berekeningen en Drive-bronnen blijven werken.

Het uitvoerbare contract staat in [reports-schema.json](reports-schema.json).
Het actieve [Shows-contract](shows-schema.json) blijft byte-identiek. De setup
gebruikt dezelfde vaste Dataverse-omgeving, onbeheerde ESMOJO-oplossing,
publisher `esmojo`, servercredentials en omgevingsbasistaal als Shows.

## Inventaris en scope

De huidige module bestaat uit meer dan incidenttellingen:

| Bestaand onderdeel | Huidige bron / contract | Voorbereide bestemming |
| --- | --- | --- |
| Canonieke artiest, zaal, uitvoering, bestaande URL | Concertcatalogi, historische concertkoppelingen, `report-routes` | Bestaande Artiest, Locatie, Concertreeks, Concert, Routealias |
| Exacte CSV, bron-ID, wijziging, hash, validatie en context | `WebReports.gs`, `_esmojo_web_reports_v1.json`, historische bronregisters | Document File + Rapportagebron |
| Momenteel beschikbare dataset en oudere geldige versies | Bestaande bronselectie per concert, bron/context/rekenversie | Rapportage + Rapportageversie |
| Alle 17 oorspronkelijke CSV-velden en oorspronkelijke rijvolgorde | `server/ontrack-report/data.js` | Rapportincident + alleen indien nodig Rapporttekstblok |
| Bestaande KPI's, grafieken, locatietellingen en waarschuwingen | Dezelfde `calculateReport`, `report-web`, gedeelde filters/tijdlijn | Getypeerde versie-KPI's en versiegebonden afgeleide projectie |
| Verkochte kaarten, werkelijke TSC-bezoekers en algemene context | Historische showmetadata, `artist-preparation`, bestaande broncontext | Rapportagecontext; oorspronkelijke betekenis blijft gescheiden |
| Vastgelegde showdagtijdschema's, TSC-tijden en herkomst | `show-timetable`, `WebReports.gs`, TSC-bronkop | Rapportagecontext + Rapportagetijdpunt |
| Reeds bestaande PDF's en layout-/bronbinding | OnTrack-rapportregister en bestaande bestanden | Document File + Rapport-PDF |
| Bestaande mailgroepen, aflevering en eerste bevestigde opening | OnTrack-/online-mailregister en `OnlineReportMail.gs` | Rapportverzending + Rapportaflevering |
| Bestaande ontvangerselectie | OnTrack-register `recipientIds` en revisie | Rapportontvangerinstelling |

Mailtabellen zijn voorbereide afhankelijkheden om bestaande status later niet
kwijt te raken. Deze opdracht verplaatst of herontwerpt de mailflow niet. Hetzelfde
geldt voor CSV-aanlevering: geen nieuwe upload-/importmethode in deze stap.

## Wat de knop aanmaakt en wat hij alleen controleert

- **11 nieuwe tabellen**, met **222 kolommen**, waaronder **29 N:1-relaties**.
- **24 unieke sleutels**, inclusief de primaire applicatiesleutel per tabel.
- **3 nieuwe globale keuzelijsten**: bronformaat, mailkanaal en afleverstatus.
- **11 bestaande gedeelde tabellen** worden uitsluitend gecontroleerd: Artiest,
  Locatie, Concertreeks, Concert, Medewerker, Document, Historieversie, Opdracht,
  Integratiestatus, Paginaweergave en Routealias. Geen aanpassing aan hun bestaande
  kolommen, opties, sleutels of gegevens.

De 761 vaste inrichtings-/controlestappen omvatten voorbereiding én volledige
terugleescontrole. Het getal is geen aantal te importeren rapporten.

| Nieuwe tabel | Betekenis en identiteit |
| --- | --- |
| Rapportage | Eén header per echte concertuitvoering. Een versiepointer en generatie bepalen welke volledig gecontroleerde dataset zichtbaar mag zijn. |
| Rapportagebron | Eén fysieke CSV-versie met exacte Document File, bronnamespace/-ID, hash, brontype, wijzigingsmoment en validatie. |
| Rapportageversie | Eén bron-/context-/rekenversie met versie-KPI's en afgeleide webstatistiek. Oude versies blijven behouden. |
| Rapportincident | Eén CSV-rij per versie. Uniek op versie + bronpositie en op versie + hash van de oorspronkelijke incident-ID. |
| Rapporttekstblok | Verliesvrije overloop voor zeer lange bestaande cellen of projecties, met aansluitende bloknummers, manifest en hash. |
| Rapportagecontext | Eén contextsnapshot per versie: algemene informatie, aparte ticket-/bezoekersaantallen, TSC-koptotalen, fotoherkomst en bestaand tijdschema. |
| Rapportagetijdpunt | Eén oorspronkelijk tijdschemapunt in die versiecontext, met volgorde, lokaal tijdstip, label en bron. |
| Rapport-PDF | Eén reeds bestaand PDF-artifact per versie/layoutvingerafdruk, met eigen Document File. |
| Rapportverzending | Eén bestaande online- of PDF-mailgroep met bevroren identiteit/status; geen nieuw verzendcommando. |
| Rapportaflevering | Persoonlijke verzend-/openingsstatus per groep en ontvanger, inclusief bestaande pogingen en idempotentie. |
| Rapportontvangerinstelling | Bestaande toekomstige verzendselectie. Dit verleent nooit moduletoegang. |

Nieuwe lookups krijgen Restrict bij verwijderen en geen cascade voor delen,
toewijzen, reparent, merge of verwijderen. Naam is een leesbaar label; identiteit
wordt niet opnieuw uit een gewijzigde artiestnaam opgebouwd. Unieke sleutels
blijven onder de Dataverse-limiet van 900 bytes. Onder meer **versie én rij-ID**
zijn samen uniek: hetzelfde CSV-incident-ID mag bij een ander concert terugkomen.

## Uitvoering, historische concerten en bestandsversies

Een uitvoering gebruikt het bestaande Concert-model: lokale datum plus een
stabiele uitvoeringscode binnen een reeks. Middag en avond blijven aparte
concerten en dus aparte rapportages, met hun bestaande `_S1`/`_S2`-identiteiten.
Bestaande concert-ID's, aliassen en bevestigde koppelingen blijven leidend; een
afwijkende CSV-bestandsnaam wordt niet stilzwijgend een andere concertdatum.

Rapportage-only concerten passen in diezelfde gedeelde tabellen met
`tooninshows = false`. Er zijn geen AI-analyse-, voorbereiding- of Showbeheer-
records vereist om een historische rapportage te kunnen bewaren. Een bestaande
Native Show wordt hergebruikt; geen tweede artiest-, zaal- of concertmodel.
De bestaande reeksregels blijven gelden: een interval buiten 31 dagen is geen
nieuwe datum binnen dezelfde reeks. De vijf nieuwste datumtabs en het 45-dagenmenu
zijn uitsluitend weergaveregels, geen bewaartermijn of maximum in Dataverse.

Meerdere fysieke exports kunnen dezelfde inhoud hebben. Bewaar hun herkomst,
maar voeg CSV's niet samen en maak er geen dubbele concerten van. De bestaande
selectieregel blijft: nieuwste geldige bronwijziging, daarna stabiele bron-ID
bij gelijkstand. Een bron-/contextwijziging kan een nieuwe versie opleveren;
alleen de volledig gecontroleerde versie mag de actuele pointer vervangen.
De versie-identiteit bindt inhoud, concert en echte rekencontext; fysieke
duplicaatbestanden worden niet vanzelf een nieuwe logische dataset.

Een oude PDF of verzendregistratie kan nog bestaan terwijl de toenmalige CSV
inhoud inmiddels ontbreekt of is vervangen. Daarom mogen de bronbestandslookup,
gekozen CSV en niet meer bekende parser-/rekencontext voor zo'n historische
versie leeg blijven. Haar PDF/mailhistorie kan wel worden bewaard. Zo'n versie
mag niet als complete webrapportage gepubliceerd worden; de nieuwste CSV wordt
nooit als vervanging van onbekende oude bytes voorgesteld.

CSV's en PDF's gebruiken de bestaande **Document File**; geen base64 in tekst,
geen openbare downloadlink en geen extra permanente SharePoint-kopie. De
Rapportagebron-/Rapport-PDF-lookups geven hun expliciete functie aan. De algemene
bestaande documentsoort `other-show-document` volstaat: de actieve gedeelde
Documentsoort-keuzelijst hoeft niet te worden uitgebreid. Een later Reports-
downloadpad moet via deze rapportkoppeling en Reports/MFA worden gecontroleerd;
het bestaande Shows-downloadpad wordt niet als moduleomweg gebruikt.

## CSV en berekeningen: betekenis behouden

Alle huidige bronnen zijn al Vertrouwelijk geclassificeerd. Het schema bewaart
dezelfde informatie, zonder nieuwe persoonlijke kenmerken af te leiden.

| CSV-kolom | Incidentkolom |
| --- | --- |
| ID | `esmojo_csv_id` |
| Date and Time | `esmojo_csv_datumtijd` |
| Division | `esmojo_csv_discipline` |
| Reporting Department | `esmojo_csv_meldafdeling` |
| Type | `esmojo_csv_type` |
| Zone | `esmojo_csv_zone` |
| Priority | `esmojo_csv_prioriteit` |
| Dispatch | `esmojo_csv_dispatch` |
| Status | `esmojo_csv_status` |
| Resolved Status | `esmojo_csv_afloopstatus` |
| Resolution Note | `esmojo_csv_afhandeling` |
| Source | `esmojo_csv_bron` |
| Description | `esmojo_csv_omschrijving` |
| Dispatched Units | `esmojo_csv_eenheden` |
| Affected Person | `esmojo_csv_personen` |
| Comments | `esmojo_csv_opmerkingen` |
| Attachments | `esmojo_csv_bijlagen` |

De originele CSV blijft de bytebron. De getypeerde rijvelden bewaren de bestaande
cellen; gevalideerde UTC-tijd, lokale datum/tijd, rijpositie en personengetal staan
er apart naast. Ze veranderen de concertkoppeling niet. Nachtincidenten blijven
bij de uitvoering waarop de CSV al gevalideerd is. Europe/Amsterdam en de
bestaande keuze van de vroegste occurrence in het dubbele wintertijduur blijven;
een onmogelijke zomertijd wordt niet gerepareerd of geraden.

Types, disciplines, prioriteiten, uitkomsten en zones zijn **tekst**, geen vaste
incidenttype-keuzelijsten. Hierdoor blijven onbekende of gecombineerde waarden
geldig opgeslagen en vereisen nieuwe labels geen metadatamigratie. Er wordt geen
nieuwe vrije tekst als classificatie of medisch kenmerk afgeleid.

Een Dataverse Memo heeft een grens. Daarom zijn zeer lange bestaande cellen via
Rapporttekstblok volledig te bewaren, zonder afkappen. Een manifest moet eigenaar,
veldcode, lengte, aantal blokken en hash binden; een onvolledige tekst is geen
geldige dataset. De bronlimiet blijft 2 MiB CSV. Andere kolom-/getalgrenzen moeten
vóór een latere feitelijke kopie tegen de echte bronnen worden gecontroleerd;
buiten-bereik is een controlefout, nooit afronden, afkappen of stil nul maken.
Bijlagen in de CSV blijven oorspronkelijke tekstverwijzingen: geen automatisch
ophalen van onbekende URL's of bestanden.

De twaalf bestaande web-KPI's krijgen nullable getalkolommen op Rapportageversie,
naast de versiegebonden afgeleide kpis/types/timeline/locations/warnings. Dit is
geen nieuwe rekenbron: beide moeten uit dezelfde bronhash en rekenversie volgen.
De bestaande berekeningen blijven leidend, waaronder Baldadigheid, Contusie /
Distorsie, flauwte bij Onwelwordingen, personentellingen en de afzonderlijke
web-/PDF-selecties. Het lijstfilter wist geen bronincidenten.

Verkochte kaarten zijn geen werkelijke bezoekers. TSC behoudt zijn zes oorspronkelijke
kopwaarden: bezoekers, uitzettingen, aanhoudingen, deuren, aanvang en einde.
Onbekend blijft null; expliciete nul blijft nul. TSC-uitzettingen/aanhoudingen
worden niet uit incidenten herberekend. Gepland/feitelijk bij een tijdpunt blijft
leeg als de bron dat niet bewijst. Geen ontbrekende historische foto, contact,
bezoekerswaarde of tijdschemamoment reconstrueren.

De contextsnapshot is beperkt tot bestaande algemene/contextvelden. Geen hele
accountprofielen, AI-analyses of risicobeoordelingen naar Rapportages kopiëren.
Gedeelde actuele voorbereiding en afzonderlijke Artiesten-risicodagstanden blijven
bij hun bestaande module; eventuele toekomstige lezers moeten hun bestaande
projecties en modulegrenzen behouden.

## Mailhistorie en privacygrenzen

Bewaar, wanneer dat later expliciet wordt overgezet, bestaande groeps-/rapport-ID's,
ontvanger-ID's en reeds vastgezette ontvanger-/templategegevens. De Medewerker-
lookup is optioneel voor verwijderde accounts. Dit migreert geen profiel of rol.
Bevestigd verzonden vereist dezelfde bestaande providerbevestiging; pending,
review, overgeslagen en onzekere status worden niet automatisch opnieuw aangeboden.
Een lege eerste openingsdatum zonder bestaande trackingversie is **onbekend**,
niet bewezen ongeopend. De oorspronkelijke eerste opening blijft behouden.

Alleen de hash van het bestaande opaque ontvangstbewijs is voorbereid. Geen
ruwe klik-/sessie-/OAuth-tokens, pincodes, accountcredentials of servicegeheimen
in deze tabellen, vrije JSON-velden, logs of browseropslag. Bestaande mailinhoud-
parameters bevatten alleen eerder vastgezette templateparameters, geen bijlagebytes.
Een schemapublicatie activeert geen mailflow en verstuurt ook geen testmail.

## De ene beheerknop

**Beheerder → Datatransitie → Rapportages klaarzetten in Dataverse**.
De knop start de geregistreerde `reports-schema-v1`-taak met de bestaande duurzame
Opdracht-infrastructuur. Vereist: productie, geldige sessie/MFA, geactiveerd account,
actuele beheerderrol en actuele **Rapportages**-toegang. Shows-toegang is niet
vereist; een Reports-beheerder krijgt geen Shows-bediening of Shows-rechten erbij.

1. Controleer alle benodigde gedeelde keuzes, tabellen, kolommen, relaties en
   actieve indexen uitsluitend-lezen.
2. Maak/controlleer de drie vaste nieuwe globale keuzelijsten, voeg die aan ESMOJO
   toe en publiceer alleen die lijsten.
3. Maak ontbrekende nieuwe tabellen/kolommen/relaties aan. Bestaande afwijkingen
   stoppen de taak; geen bestaande inhoud of definities overschrijven.
4. Publiceer uitsluitend de nieuwe rapportagetabellen en controleer alle sleutels.
   Pending/InProgress is wachten, nooit succes. Failed stopt voor controle.
5. Lees het hele nieuwe schema opnieuw terug. Pas daarna meldt de taak voltooid.

De bekende native Naam-standaard mag alleen bij een lege **nieuwe rapportagetabel**
van optioneel/850 naar het overeengekomen primaire tekstveld/200 worden genormaliseerd,
met behoud van de overige metadata en gerichte terugleescontrole. Gedeelde tabellen
krijgen nooit die correctie. Geen PublishAll, vrije scripts, vrije definities of
bedrijfsrecord-writes. De browser verstuurt uitsluitend vaste start/status/hervat-
acties; het schema en het controlepunt komen uitsluitend van de server.

De voortgang is versleuteld opgeslagen, met bestaande globale sloten, taaklease,
ETag en maximaal 48 uur machtiging. De browser mag sluiten; de bestaande main/OIDC-
achtergrondworker hervat alleen bewust gestarte geregistreerde taken. Voor elke
serverstap worden de actuele rol en Reports-toegang opnieuw gecontroleerd. Er
worden enkele kleine metadatastappen gebundeld; een herhaling controleert vóór
creatie opnieuw de vaste identiteit. Alle keuzes/tabellen zijn allowlisted.
Bij een code-/schemaversiewijziging stopt een oud controlepunt voor controle.

## Wat hiermee nog niet gebeurt

Geen rapportages kopiëren, CSV-aanlevering bouwen, parser-/UI-regels veranderen,
bronbestanden verwijderen, rapporten/PDF's genereren, mails verzenden of de
Rapportages-provider activeren. De knop maakt evenmin testincidenten aan.

Metadata gereed betekent nog niet dat een toekomstige migratie of applicatieroute
getest is. Vóór die latere stap zijn volledige broninventarisatie, bestaande
ID-/hash-/status- en aantallenvergelijking, bestands-terugleescontrole en beproefde
Reports-autorisatie nodig. Controleer dan ook de noodzakelijke dataprivileges van
de bestaande Dataverse-app op de nieuwe tabellen; deze setup verruimt geen rollen.
Het huidige opslag- en aanlevergedrag blijft tot een afzonderlijke opdracht actief.

## Controles bij implementatie/publicatie

Tests bewaken alle 17 CSV-velden/brontypen, nullable broncijfers, grote tekst,
unieke sleutelomvang, geen wijziging van het actieve Shows-contract, geen writes
naar gedeelde definities, complete metadata-aanmaak én veilige herhaling met een
providerfixture, definitieconflicten, Pending, actuele autorisatie/MFA/productie,
en browsergedrag met Reports-only beheerder in licht/donker en op mobiel.
Een code-deployment maakt zelf geen Dataverse-metadata aan; alleen een expliciete
beheerderklik doet dat. Claims over live schema-aanmaak vereisen de bevestigde
serverstatus, niet alleen een geslaagde build/deployment.

De toekomstige recordlaag moet ook eigenaarschap binnen de relaties bewijzen:
actuele versie en gekozen bron behoren bij dezelfde rapportage; tekstblok en
incident bij dezelfde versie; PDF en mailgroep bij de bedoelde oorspronkelijke
versie. Een lookup alleen bewijst dit niet. Opslag betekent geen extra API-toegang:
Reports-projecties blijven de huidige whitelist, Artiesten-detail behoudt zijn
eigen modulecontrole en ontvanger-/afleverdetails blijven beheerdergegevens.
