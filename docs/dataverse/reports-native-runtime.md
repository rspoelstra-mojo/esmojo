# Rapportages: runtime en onafhankelijke validatie

Deze eerste stap bouwt uitsluitend de read-only eindvalidatie. Native runtime en
activering zijn nog niet afgerond. Een groene validatie is geen omschakeling.

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
bewust via workflow_dispatch op main. Eigen vaste OIDC-audience/workflow,
POST `{}` op `/api/reports-validation-sync`. Geen vrije actor/cursor/query/scope.

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
