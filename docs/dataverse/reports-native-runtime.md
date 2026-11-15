# Rapportages: runtime en onafhankelijke validatie

De read-only eindvalidatie en een interne read-only native repository zijn
gebouwd. De repository is nog niet aangesloten op de productieprovider. Volledige
native lees-/schrijfdekking en activering zijn niet afgerond. Een groene validatie
of bestandsproef is geen omschakeling.

Statusrun 43640860595 bevestigt op 14 november 2026, main 1df6184 / V1.112:
Rapportages-kopie complete, 221 rapportages, 8517 records, 226 bestanden;
schema complete, 761 controles. Geen foutcode/actieve lease. Dit is het opgeslagen
migratiecheckpoint, geen nieuwe vergelijking met de actuele bron.

## Runtime-inventaris

| Pad | Huidige uitvoering | Benodigde native opslag |
| --- | --- | --- |
| Catalogus/directe links/datum-/uitvoeringstabs | accounts-api report-menu/web → web-report-catalogue/report-web → OnTrackReportStore web-* → WebReports.gs | Rapportage, geverifieerde actuele versie, Concert/Routealias. 45 dagen is uitsluitend menu; oudere directe links blijven geldig. |
| CSV-aanlevering/bronselectie/publicatie | web-reports-sync, web-scan/source/commit, historische import | Rapportagebron + originele Document File, alle fysieke bronversies en herkomst; dezelfde nieuwste-geldige-bronselectie. Drive mag uitsluitend expliciete ingestgrens worden. |
| Incidenten, KPI, filters, types, tijdlijn, locaties | ontrack-report/data.js, report-web.js, shared/report-medical/security/source/timeline.js | Rapportincident, alle CSV17-cellen/posities/identiteiten, verliesvrije tekstblokken; Rapportageversie met dezelfde rekencontracten en getypeerde cijfers. |
| Context, foto, tickets, contacten, TSC-koppen, tijden | report-source, artist-preparation, show-timetables/ShowTimetables.gs, TSC | Rapportagecontext/Rapportagetijdpunt per versie, behoud bronherkomst. Verkoop is geen bezoek; null blijft anders dan nul. |
| PDF-verwerking/private download | ontrack-reports-sync → ontrack-report/service.js scan/pipeline/reserve/commit/fail/download → OnTrackReports.gs | Rapport-PDF + File; bestaande bron/layoutidentiteit, generatie, lease en versies behouden. |
| Online/PDF-mail, bewust verzenden | online-report-mail.js, ontrack-report/service.js, OnlineReportMail.gs online-*/delivery-*/send | Rapportverzending/Rapportaflevering; dezelfde providerkey, bevroren inhoud/ontvanger, pogingen, lease en status. Geen nieuwe migratiemails. |
| Eerste opening/mailhistorie | report-email-open/history → email-open/history → OnlineReportMail.gs | Ontvanger/concert/receipthashbinding, oorspronkelijk eerste moment, beheerdergrens behouden. |
| Ontvangers, queue, koppelen, retry, meldingen | OnTrack-admin/accounts-api → OnTrackStore status/recipients en OnTrackReportStore link/retry/pdf-alerts | Rapportontvangerinstelling, bron-/verwerkingsstatus, bestaande revisie-/admincontroles. |
| Artiesten en incidentreferenties | artist-service → Shows related.js → artist-show/incident-* → bestaande Drive-projecties | Alleen Reports-afhankelijkheid vervangen; geen 45-dagenfilter op historische koppeling. |

Canoniek bij Reports: bronnen/bytes, incidenten, rapportversies/context, PDF's,
verzend-/aflever-/openingshistorie, ontvangerinstellingen en verwerkingsstatus.
Afhankelijkheden behouden hun autoriteit: native Shows-voorbereiding, Artiesten-
profiel/risico/dagstand, accountrollen/profielen en actuele accountrechten.
Supabase Auth/MFA blijven intact. Geen actief Shows-schema of gedeelde betekenis
wijzigen. CSV-bijlageverwijzingen zijn tekst, geen opdracht om externe URL's te halen.

Alle drie brontypen, middag/avond, afzonderlijke dagen en nachtincidenten blijven
behouden. Dezelfde parser en Europe/Amsterdam-/DST-regels; vijf nieuwste datumtabs.
Webfilters wijzigen de oorspronkelijke KPI/PDF-berekening niet.

## Onafhankelijke eindvalidatie

**Validate copied Reports data** (`reports-validation.yml`) start uitsluitend
via workflow_dispatch of bij wijziging van uitsluitend de eigen workflow op main,
binnen de expliciet geautoriseerde opdracht. Eigen vaste OIDC-audience/workflow,
POST `{}` op `/api/reports-validation-sync`. Geen vrije actor/cursor/query/scope.
De publicatietrigger wacht begrensd op de openbare protocolmarker van de nieuwe
productieroute, via GET zonder credentials of taakmutatie. Geen taakstart vóór
die serverversie beschikbaar is. Een PR, fork, andere workflow of verlopen
delegatie verleent geen toegang.

`reports-validation-v1` erft exact actor en oorspronkelijke eindtijd van de
complete ongeleasede kopie. Actuele admin/Reports per stap, bestaande globale
runnerlease/taaklease/ETag/epoch/sequence en versleutelde checkpoints blijven
gelden. Nieuwe migratiegeneratie, ingetrokken rechten of verlopen delegatie stopt;
geen nieuwe 48-uursmachtiging. Een geblokkeerde validatie herstart niet vanzelf.

De validator vergelijkt actuele inventaris en bundels met verzegelde manifest-
en planbewijzen, bronhash/CSV, verwachte getypeerde velden/lookups, historische
PDF/mailrelaties, ontvangerselectie, versie/publicatiepointer en alle File-blokken.
Alleen de bestaande gesloten pipeline-heartbeat mag tegen de hashbewezen
oorspronkelijke instellingen worden genormaliseerd. Zakelijke wijzigingen stoppen.

De complete rij-identiteitset wordt gepagineerd per versie/context vergeleken;
geen afhankelijkheid van een begrensde native count of `$top=0`. Eén rapportbundel
en datasetplan mogen tijdens een worker in RAM worden hergebruikt, zonder rechten
te cachen. Vóór bevestiging van elk rapport wordt de bronbundel verplicht vers
opgehaald; de finale inventariscontrole blijft eveneens vers.

De bestaande main/OIDC-achtergrondworker kan een al gestarte validatie voortzetten.
`delegatedOnly` voorkomt dat browserstart/hervatten/herstart daarvoor een nieuwe
48-uursmachtiging maakt. Alleen de vaste serverroute leidt de originele delegatie
af. De technische resume is beperkt tot het oude generieke datasetcontrolepunt,
gelijke actor/eindtijd/schema/epoch en geen lease/onzekere write; actuele rechten
en ETag/sequence worden opnieuw gecontroleerd. Conflicten/ontbrekende rijen blijven
geblokkeerd. HTTP-diagnose bevat uitsluitend een statusnummer, geen providerinhoud.

De bedrijfsdatawriter weigert mutaties op transportniveau: alleen GET en de twee
File-downloadacties zijn toegestaan. Geen reparatie bij ontbrekende records of
bytes, geen uploads, PDF-generatie of mails. Alleen technische Opdracht-checkpoints
worden geschreven. CI krijgt uitsluitend technische codes, fasen, aantallen/tijden.

Deze voorcontrole vervangt de laatste vergelijking onder schrijfstop niet.
Native dekking, gecontroleerd uitlopen van Vercel/GAS-workers, één serverautoriteit,
conditionele activering en onafhankelijke terugleescontrole zijn nog nodig.
Na activering mag geen stille Drive-runtimefallback bestaan. Originelen behouden.

De gebruiker voert de ingelogde gebruikerstest later zelf uit. Dit is geen door
Codex uitgevoerde browseracceptatie en wordt niet als zodanig gerapporteerd.

## Interne native repository

`server/dataverse-reports/repository.js` leest uitsluitend vaste Reports-/gedeelde
tabellen en Dataverse File. Geen vrije bestands-URL, upload, mutatie of fallback.
De toekomstige servicelaag moet vóór iedere bewerking actuele account/MFA/module-
autorisatie uitvoeren; deze interne repository is geen publiek API-eindpunt.

Een File-read bewijst rapport → versie → bron/PDF → document, geverifieerde status,
grootte/MIME/hash en alle bytes. Eigenaren/document worden daarna opnieuw gelezen
om een gelijktijdige wijziging te weigeren. Een oude PDF met onbekende CSV blijft
via haar eigen archiefversie leesbaar; die pending archiefversie wordt daardoor
geen geverifieerde webdataset. Externe/onjuiste paginglinks worden geweigerd.

## Native catalogus en webprojectie

`read.js` projecteert uitsluitend geverifieerde native bronversies. De catalogus
behoudt de bestaande groepering en datumtabs zonder een 45-dagengrens. De bronread
vergelijkt de oorspronkelijke CSV File en alle 17 getypeerde cellen, identiteit,
bronpositie, verliesvrije tekstblokken, context, tijdpunten, berekende statistieken
en afzonderlijke KPI-kolommen. De bestaande webservice/parser blijft de DTO maken.
Een afwijking veroorzaakt een fout; de read repareert niets. Historische OnTrack,
TSC null/nul, verkoop versus aanwezigheid, middag/avond en nachtelijke incidenten
zijn met synthetische migratiefixtures tegen dezelfde bestaande webservice getest.

Dit is interne bouwdekking, nog geen actieve Reports-provider. Schrijfoperaties,
workerintegratie, de schrijfstop en daadwerkelijke activering zijn nog niet klaar.

## Schrijfcomponenten (interne bouw, nog niet gerouteerd)

`mutations.js` beperkt conditionele batches tot de elf Reports-tabellen; geen
DELETE, File-mutatie of write naar een gedeelde Shows-tabel. Bij een verloren
bevestiging wordt de batch niet herhaald. Alle verwachte getypeerde velden en
lookups van alle rijen worden onafhankelijk teruggelezen. Een afwijking blijft
onbevestigd. De bestaande verbinding blijft tokenvernieuwing beheren.

`operational.js` gebruikt versleutelde technische coördinatie met ETag en lease.
Vóór een zakelijke write staat een blijvende onzekerheidsfence op schijf. Die
wordt pas na bevestiging opgeheven; leaseverloop geeft geen tweede schrijver vrij.
Dit is geen extra achtergrondmachtiging: iedere servicebewerking autoriseert vers.

`archive.js` behoudt private oorspronkelijke PDF's, verzendhistorie en de eerste
opening. Openingsregistratie vereist de actuele eigen aflevering en hash van het
bestaande ontvangsttoken, en wijzigt geen afleverstatus. `recipients.js` behoudt
ook bij lege selectie een conditionele revisie; bestaande selectierijen blijven.
`mail.js` reserveert/bevestigt native afleveringen met bestaande providerkeys,
bevroren templates/ontvangers, actuele rechten, vijfminutenlease/backoff en de
bestaande 23-uursreviewgrens. Deze component verzendt zelf geen mail.

`publication.js` bereidt nieuwe CSV-datasets hervatbaar voor in oorspronkelijke
File plus getypeerde rijen. Publicatie volgt pas na bestands- en identiteitcontrole,
via CAS op de oorspronkelijke pointer/generatie. Een dubbel fysiek bestand voor
hetzelfde logische dataset houdt de oude bronanker en versienummer. Een al
geverifieerde dataset wordt alleen geïnspecteerd, nooit stil gerepareerd.

De oorspronkelijke onafhankelijke productievoorcontrole is inmiddels voltooid:
221 rapportages, 8517 records, 226 bestanden, bevestigd in achtergrondrun
43681649105. Een nieuwe laatste controle onder schrijfstop blijft vereist.
