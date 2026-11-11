# Broninventaris en migratiebestemming

Status: code-inventaris, geen export van echte gegevens. Broncodebasis `555d807`.
Nooit private bestandsnamen, e-mailadressen, inhoud of ID-lijsten in Git opnemen.
Een latere volledige bestands-/recordinventaris hoort in afgeschermde goedgekeurde
opslag. Onbekende bestanden krijgen expliciet een bestemming of een eigenaar-
besluit; niets wordt overgeslagen of verwijderd omdat de app het niet meer toont.

## Actuele verantwoordelijkheden

| Bron | Wat code aantoonbaar gebruikt | Nieuwe bestemming / afhandeling |
|---|---|---|
| Supabase Auth | Identiteit, getUser, wachtwoord, TOTP, refreshsessie, account lifecycle | Blijft. Geen export van wachtwoorden/MFA naar Dataverse. |
| `_esmojo_accounts_v1.json` | Profielen, rol, modules, activatie/blokkering en verwijzingen naar avatars | Medewerker, Modulerecht, Document; Auth-user-ID behouden. |
| `_esmojo_show_assignments_v1.json` | Vertrouwelijke persoonlijke showkoppelingen | Projectteamkoppeling. |
| `_esmojo_shows_v1.json`, `concert.json`, `algemeen.json` | Concertindex, artiest, zaal, datum, reeks en canonieke mapkoppeling | Artiest, Locatie, Concertreeks, Concert, Routealias. |
| `_esmojo_ontrack_concerts_v1.json` | Extra zalen/agenda voor rapportmailings | Dezelfde Concert/Locatie; behouden module-/toepassingsscope. |
| `_esmojo_artist_biographies_v1.json`, artistprofile/caches | Biografie, bron, ophaalmoment, foto, 45-dagen/reeksbeleid | Artiest, Document, Integratiestatus; laatste goede tekst blijft bestaan. |
| `showprofiel.json` | Vraaganalyses, samenvattingen, status en revisies | Analyse; expliciete actor/tijd/historie. |
| `analyseafronding.json` | Definitieve beoordelingen, cijfers, bronbasis, intrekking | Analyseafronding, Historieversie. |
| `onderzoek_XX.json` en onderzoeksbestanden | Onderzoeksuitkomsten, bronverwijzingen, AI-bronnen | Onderzoeksresultaat, Document, Historieversie. |
| `bezoekersdata.json` | Verkoop, bezoekersherkomst, veldversies, controle, leases | Bezoekersgegeven; Opdracht/Technische status voor lopende veldacties. |
| `productionele-risicos.json` | Keuzes, barrier, vloer, operationele beoordelingen, maatregelen, uploads en historie | Productiekeuze, Barrierbeoordeling, Vloerdrukbeoordeling, Publieksvak, Operationeel risico, Beheersmaatregel, Document, Historieversie. |
| `_esmojo_private_references_v1` en private barrierbeelden | De vijf originele beschermde configuratiebeelden met vaste hashes | Document; dezelfde bytes en beveiligde toegang behouden. |
| `showprofiel-pdf.json` en gegenereerde PDF's | PDF-status, bronbasis, templateversie, bestandsmetadata, definitieve versies | Documentmetadata + centrale SharePoint-PDF, Opdracht; zie bestanden-en-pdf.md. |
| `Tijdschema_*.json` | MOJO-tijdschema met oorspronkelijke labels, bron en vastlegging | Tijdschemaregel, relevante Document-bron indien aanwezig. |
| `_esmojo_ontrack_v1.json` | Ontvangersselectie, configuratie, import-/ontvangststatus | Ontvangersgroep, Integratiestatus, Bronrapport. |
| `_esmojo_web_reports_v1.json` | Publicatie-/rapportcatalogus en CSV-koppelingen | Bronrapport, Concert, Paginaweergave, Integratiestatus. |
| `_esmojo_historical_reports_v1.json`, `importcontrole.json` | Historische bronkoppeling, batchcontrole en bronidentiteiten | Bronrapport, Integratiestatus, Routealias; controles behouden. |
| `showgegevens-tsc.json` | TSC-bezoekerstelling, uitzettingen, aanhoudingen, feitelijke tijden | Bronrapport overrides; Bezoekersgegeven; Tijdschemaregel. |
| Vier nieuwe skillmappen | SHOWPROFIELEN en NIEUWE_SHOW als bron; SHOWPROFIEL_RESULTAAT en NIEUWE_SHOW_RESULTAAT als ontvangst | SharePoint. Document/Opdracht/Integratiestatus en genormaliseerd Onderzoeksresultaat in Dataverse; zie sharepoint-en-skill.md. |
| Oorspronkelijke en genormaliseerde CSV-bestanden | OnTrack geautomatiseerd/historisch en TSC historisch | Document + Bronrapport + Incident. Originele bronbytes niet vervangen door alleen nieuwe records. |
| Rapportmailbestanden/-registers in OnTrackReports | PDF/assets, bezorging, ontvanger, templateversie, retries, openingsstatus | Document, Verzending, Opdracht, Ontvangersgroep. |
| `_esmojo_incident_metrics_v1.json` | Verwerkte counts met bronhash/versie | Bronrapport gekoppelde counts; opnieuw gecontroleerde afgeleide gegevens. |
| `_esmojo_incident_daily_v1.json` | Bevroren Nederlandse dagstand | Incidentreferentiedag en geautoriseerde Paginaweergave. |
| `_esmojo_home_planning_v1.json`, `_esmojo_home_photos_v1.json` | Afgeleide planning, foto's, homeprojecties | Paginaweergave; foto’s Document; onderliggende canonieke gegevens blijven leidend. |
| `_esmojo_active_storage_v1.json` / markers | Eigenaarschap actieve Supabase-voorbereiding versus Drive | Niet blind importeren als inhoud; verzoenen in migratiemanifest, daarna oude handoff uitfaseren. |
| `esmojo_active_shows` | Primaire actieve snapshot met expliciete toegestane velden | Gerichte brontabellen + Historieversie; actieve DB is voor eigen velden leidend. |
| `esmojo_show_receipts` | Idempotente commando-ontvangstbewijzen | Opdracht of gecontroleerd afgesloten historie; lopende commando’s niet verliezen. |
| `esmojo_storage_control` | Technische keuze voor actieve DB-route | Nieuwe providerconfiguratie; geen bedrijfsgegevens. Niet eenvoudig uitschakelen zolang oude guard actieve rijen beschermt. |
| `esmojo_show_management` | Link/PIN hashes, versleutelde credentials, enabled, invulstatus, pogingsvenster | Showbeheer + Technische status; bestaande UUID's/linkgeheimen en cryptografische binding behouden. |
| `_esmojo_mcp_oauth_v1.json` | MCP-clients, scoped toestemmingen, PKCE-/tokenhashes | OAuth-client, OAuth-toestemming; geautoriseerde clients niet ongemerkt verruimen of verbreken. |
| Redis artist-views | Anonieme event-ID/artist-ID/tijd; 31 dagen | Artiestbezoek; geen account/IP toevoegen. Dagelijkse ranking naar Paginaweergave. |
| Redis MFA/OAuth beveiliging | Replays, locks, HMAC-vingerafdrukken en korte rate-limitvensters | Bestaande tijdelijke technische uitzondering kan blijven; alternatief pas na gelijkwaardige race-/storingsproef. Geen duurzame bedrijfsinhoud daarheen verplaatsen. |
| Vercel/GitHub/Apps Script configuratie | Secrets, app-identiteit, OIDC-workers, deployment-ID | Geen secrets in Dataverse-rijen/Git. Dienstconfiguratie apart inventariseren en veilig omzetten/intrekken. |
| `_esmojo_write_test.json`, tijdelijke exports/batches | Oude diagnostiek of importhulpmiddelen | In echte inventaris classificeren als vereist bronbestand, tijdelijk of expliciet verwijderbaar; niet automatisch migreren als show. |

## Aantoonbare knelpunten, nog zonder tijdmetingen

| Code | Vastgesteld gedrag | Ontwerprichting |
|---|---|---|
| [server/report-web.js](../../server/report-web.js) | Download/decode CSV, hashcontrole, calculateReport en KPI/filter/tijdlijnopbouw bij iedere rapportread; optioneel externe foto-opvraag. | Eén keer bij import/bronwijziging verwerken; foto- en PDF-bytes los. |
| [server/artist-service.js](../../server/artist-service.js) | artist-show gebruikt de volledige rapportservice voor het compacte showoverzicht. Ranking leest bij refresh/click counts. | Compacte historische showoverzichten voorbereiden; ranking vast per dag. |
| [server/incident-metrics.js](../../server/incident-metrics.js) | Beheer leest dagstand; artiestenscore haalt daarnaast eigen bronrijen op en rekent bij snapshot. | Score vooraf opslaan per model-/bron-/referentieversie. |
| [src/artists-page.js](../../src/artists-page.js) | Profiel en risk zijn aparte aanvragen; scorepolling; menu/ranking iedere 30s. | Eén landingbundel; versiegestuurd vernieuwen; dagranking. |
| [src/lib/artist-show-memory.js](../../src/lib/artist-show-memory.js) | Na landing één zware artist-show-aanvraag tegelijk, nieuwste-eerst, klikprioriteit. | Volgorde behouden; compacte showdetails in landing, volledige rapporten begrensd stil erna. |
| [src/show-page.js](../../src/show-page.js) | Wacht vóór tonen op profielcontroller en risk.prepare; bouwt alle tabcontrollers. | Eén complete compacte voorbereidingsbundel + vooraf geladen benodigde UI-code. |
| [src/lib/show-data.js](../../src/lib/show-data.js) | Eén writeTail per show; mutaties kunnen afhankelijke floor/profile/risks-snapshots ongeldig maken. | Kleine resourcequeues, relevante bronafhankelijkheden; geen showbrede file-/PDF-lock. |
| [src/risk-analysis.js](../../src/risk-analysis.js), [src/floor-pressure-page.js](../../src/floor-pressure-page.js) | Floor-editor start read; alleen bevestigde barrierbasis en ticketinformatie; read-fase blokkeert bewerken. | Gedeelde sessiestaat en vooraf geladen basis; berekening lokaal, definitieve broncheck server-side. |
| [server/active-show-store.js](../../server/active-show-store.js) | Actieve voorbereiding in Supabase, maar floor/tickets/show-open kunnen signed Drive-bridge gebruiken; mutaties hebben leases/receipts. | Complete voorbereiding inclusief ticket/floorbasis in dezelfde Dataverse-omgeving. |
| [server/accounts-api.js](../../server/accounts-api.js) | Per aanvraag Supabase getUser/MFA + profielcontrole uit Drive. | Eén samengestelde pagina-aanvraag; profiel/rollen naar Dataverse; beveiliging behouden. |

## Werkelijke inventarisatie vóór een migratie

Nog uit te voeren via bevoegde read-only toegang, niet beschikbaar als betrouwbare
productie-export in deze sessie:

- Alle beheerde roots, archieven, documentversies, prullenbakinhoud en onbekende
  bestanden. Per object: type, bron-ID, koppeling, grootte, hash, versie, classificatie,
  doelsleutel, status en bewaartermijn. Geen inhoud in technische logs.
- Alle applicatietabellen/RPC's/buckets in Supabase; hierboven staan de tabellen
  die de code aantoonbaar noemt. Andere handmatig aangemaakte objecten eerst ontdekken.
- Recordaantallen/volumes per type en per bronrapport; actieve én historische bronnen.
- Bestaande dubbele of onduidelijke show-/rapportkoppelingen. Niet alleen datums
  vergelijken; uitvoeringsslot, oude ID en bronidentiteit horen bij de sleutel.
- Oud versus actueel eigenaarschap bij actieve shows, inclusief nog niet gespiegeld
  DB-commando en Drive-only velden. Geen algemene regel 'nieuwste modifiedAt wint'.
- Originele account-/volledigheids-/bezoekers-/risicoregels en bekende uitzonderingen.
- Open opdrachten, afleveringen, ontvangstbewijzen, grants en geleasede velden.
- Kopieën in exports, lokale downloads, workflow-artifacts en externe providerback-ups.

Een leeg of onvolledig manifest blokkeert definitieve bronverwijdering.
