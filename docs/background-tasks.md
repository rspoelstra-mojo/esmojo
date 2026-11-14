# Herbruikbare beheer-achtergrondtaken

De bestaande ESMOJO-server voert bewuste beheeropdrachten uit, onafhankelijk van
het geopende tabblad. Eerste toepassing: `shows-migration-v1` op
`/beheerder/datatransitie`. De gewone AI-import-, keuze- en tabelsetupknoppen
houden voorlopig hun eigen bestaande uitvoering.

## Gebruik en uitvoering

Een bewuste startklik bewaart eerst de opdracht duurzaam in Dataverse. Daarna
start Vercel de eerste korte worker via `waitUntil`; het HTTP-antwoord hoeft de
migratie niet af te wachten. Het tabblad mag sluiten en de telefoon mag vergrendelen.
De vaste GitHub-workflow `background-tasks.yml` staat iedere vijf minuten gepland,
maar GitHub kan starts aanzienlijk vertragen. Iedere uitvoering doet daarom tot
maximaal veertig minuten meerdere korte serverrondes achter elkaar zolang er
een expliciet gestarte taak actief is. Iedere ronde gebruikt een verse OIDC-
identiteit en dezelfde vaste productiepoort. Korte wachttijden en tijdelijke
leases worden binnen die begrensde workflow overbrugd (maximaal60s per wachtbeurt),
ook wanneer een ronde nul stappen kan uitvoeren. De server blijft Retry-After,
leases, actuele rechten en de oorspronkelijke machtiging controleren; er wordt
nooit vóór de opgeslagen volgende poging uitgevoerd. Geen actieve taak of een
onbevestigde aanvraag beëindigt de lus. Een geblokkeerde taak blijft geblokkeerd;
een andere al actieve taak mag doorgaan. Na40min blijft cron het hervatvangnet.
De periodieke planning is het hervatvangnet. Een onderbroken serverronde betekent
niet dat de taak is verdwenen. De workflow start nooit zelf een nieuwe migratie.

Open de beheerpagina opnieuw voor de laatst opgeslagen voortgang. Alleen een
zichtbare pagina vraagt iedere vijf seconden status op; focus/zichtbaar worden
haalt status direct opnieuw op. Statuslezen voert geen taakstappen uit. Geen
browseropslag van taakinhoud of checkpoints. Sluiten van de pagina annuleert geen
opdracht. Er is nog geen aparte pauze-/annuleerfunctie.

Tijdelijke fouten krijgen maximaal acht automatische herpogingen met oplopende
wachttijd; `Retry-After` gaat vóór die wachttijd. Een onzekere write houdt het
uitsluitingsslot vijftien minuten vast voordat dezelfde stap opnieuw mag lopen.
Een inhoudelijk conflict stopt en wordt zichtbaar op de beheerpagina. Hervatten
behoudt het checkpoint. **Opnieuw controleren vanaf het begin** begint alleen na
een bewuste extra klik een nieuwe uitvoering; reeds gekopieerde data wordt volgens
de oorspronkelijke create-only controles herkend.

De taakmachtiging loopt maximaal 48 uur vanaf de oorspronkelijke start. Dit is
geen glijdende termijn. De actieve oude 24-uursdelegatie wordt bij de volgende
workerclaim met behoud van checkpoint naar die vaste 48-uursgrens gebracht;
ook de versleutelde migratiecursor wordt aan dezelfde interne eindtijd gebonden.
Geblokkeerde taken worden niet automatisch herstart en actuele rechten blijven
per stap vereist. Bij iedere stap worden
actuele geactiveerde beheerderstatus, blokkade en modulerechten opnieuw uit het
bestaande Drive-profiel gecontroleerd. De start vereist de normale login/MFA-poort;
de worker gebruikt daarna die beperkte taakdelegatie, geen bewaarde MFA-/sessiecookie.
Een verlopen machtiging, gewijzigde handler-versie of ingetrokken toegang stopt de
taak. Andere beheerders kunnen status lezen en een gestopte taak bewust opnieuw
starten onder hun eigen machtiging; hervatten hoort bij de oorspronkelijke actor.

## Opslag en veiligheid

Geen nieuwe dienst, tabel of geheim: de bestaande `esmojo_opdracht` en de bestaande
Dataverse-appverbinding worden hergebruikt. Beide unieke Opdracht-indexen moeten
Actief zijn. Er zijn technische records voor het huidige taaktype en één gedeeld
uitvoeringsslot. Die technische records mogen vóór de volledige migratie-preflight
bestaan; bedrijfsgegevens worden nog steeds pas daarna gekopieerd.

Eén actueel taakrecord per vast type bewaart de laatste uitvoering en resultaat.
Een nieuwe uitvoering vervangt dat technische checkpoint, niet de gemigreerde
bedrijfsgegevens. Dit is geen permanent archief van iedere oude taakrun.

`esmojo_payload_json` bevat een AES-256-GCM-envelope, met een domeingescheiden sleutel
uit het bestaande servergeheim en het vaste taaktype als authenticated data. Actor,
checkpoint en native bestandscontinuatietokens blijven daar versleuteld. De gewone
resultaatkolom bevat alleen de goedgekeurde statusweergave. De browser ontvangt
alleen status, tellers, tijdstippen en veilige labels/fouttekst; geen native IDs,
actor-ID, cursor of providerbody. Native collectienamen en primaire ID komen uit
metadata, niet uit geraden meervouden.

Elke wijziging van het checkpoint gebruikt de actuele native ETag/`If-Match`.
Aanmaak is `If-None-Match: *`. Een globaal uitvoeringsslot serialiseert ook
verschillende toekomstige taaktypen; aanvullende per-taakleases en een unieke
uitvoeringsgeneratie voorkomen dat een late oude worker nieuwe voortgang
overschrijft. Normale serverrondes geven leases vrij; bij onzekerheid blijven
ze tot de uitsluitingstermijn staan. Na een crash wordt het laatste bevestigde
checkpoint hervat. Native bestandsessies ouder dan tien minuten worden veilig
opnieuw geïnitialiseerd, met terugleescontrole van reeds aanwezige bytes.

De worker-API accepteert uitsluitend de vaste GitHub-OIDC-identiteit voor de eigen
repository, main, eigen workflow en audience. Alleen POST met `{}` voor uitvoeren of exact `{"operation":"status"}` voor lezen; geen vrije
soort, cursor, URL, tabel of opdracht. CI ziet uitsluitend technische aantallen, vaste taaktypen/fase/foutcode en
tijdstippen (laatste checkpoint, volgende poging, lease, oorspronkelijke eindtijd).
Geen actor, cursor, profielgegevens, metadatawaarden, labels of providerbody.
Een statusrun via workflow_dispatch → operation=status heeft een eigen read-only
concurrencygroep en kan ook tijdens een lopende worker worden bekeken. Status
maakt geen taak aan en wijzigt geen checkpoint of machtiging.
Previewomgevingen mogen geen taken starten of uitvoeren. De oude browserrunner
wordt geblokkeerd zolang de nieuwe achtergrondmigratie actief is.

## Onderdelen

- `server/background-tasks/engine.js`: lifecycle, ETag-claims, begrensde retry,
  machtigingsduur, generaties, eerlijk verdelen van stappen en veilige status.
- `server/background-tasks/store.js`: native Dataverse-opslag, AES-GCM, actieve
  sleutels, conditionele writes en gedeeld worker-slot.
- `server/background-tasks/registry.js`: vaste definities, modules, versies,
  actuele autorisatie en de Shows-adapter.
- `api/background-tasks-sync.js` + `.github/workflows/background-tasks.yml`:
  OIDC-uitvoering zonder browser, op de bestaande productie-infrastructuur.
- `/api/access?action=background-tasks`: bestaande admin/MFA-poort voor
  `status`, `start`, `resume` en `restart`; uitsluitend geregistreerde typen.
- `src/lib/background-task-view.js`: herbruikbare start/status-weergave, met
  configureerbare labels en zonder uitvoeringslus in de browser.

## Een volgende Dataverse-taak toevoegen

Voeg een vaste definitie en adapter aan de registry toe. Geef titel, bestaande
module (`shows`, `artists` of `reports`), expliciete handler-versie en
`idempotent: true`. De modulecontrole van de API wordt uit dezelfde registrymetadata
afgeleid. Geef geen vrije metadata, script, URL of ongevalideerde browserpayload
mee. Voor nieuwe scopes of bewerkingen blijft de inhoudelijke gebruikersopdracht
leidend; deze infrastructuur geeft geen algemene wijzigingsmachtiging.

Een adapter implementeert:

```js
{
  title: 'Vaste beheertaak',
  module: 'shows',
  version: 1,
  idempotent: true,
  async step({ cursor, actor, runId }) {
    // Lees de echte bron en valideer de huidige toestand.
    // Gebruik runId + vaste stapidentiteit als idempotentiesleutel waar nodig.
    // Werk één begrensde, herhaalbare stap af en lees de wijziging terug.
    return {
      status: 'ready', // of waiting, blocked, complete
      cursor: 'server-checkpoint', // maximaal 50k; wordt versleuteld opgeslagen
      delayMs: 0,
      public: {
        label: 'Veilige stapomschrijving',
        total: 10,
        progress: { phase: 'checking', current: 1, verifiedRecords: 1, verifiedFiles: 0 }
      }
    };
  },
  failure(error) {
    // Allowlist van vaste codes/veilige teksten; nooit error.message doorgeven.
    return { retryable: false, code: 'CONTROL_REQUIRED', error: 'Controle nodig.' };
  }
}
```

Stappen moeten bij herhaling hetzelfde resultaat herkennen, ook wanneer een
provider al schreef maar het antwoord verloren ging. De engine biedt geen
magische exactly-once-garantie voor externe bijwerkingen. Vereis native
idempotentie of conditionele mutatie met echte terugleescontrole. Maak stappen
kort genoeg voor één serverronde; lange taken horen in meerdere checkpoints.
`uncertain: true` in de foutbeschrijving houdt uitsluiting vast bij een onzekere
provideruitkomst. Verhoog de handler-versie bij een incompatibel checkpoint- of
semantisch contract; een oude taak loopt dan niet stil met nieuwe betekenis door.

Koppel de nieuwe knop aan `createBackgroundTaskView` met vaste type-ID en labels.
Dezelfde opslag, worker, autorisatie, statusweergave en retry worden hergebruikt.
Test per adapter de echte mapping en rechten, herhaling na verloren antwoorden,
conflictstop en bronbehoud. Test nieuwe externe bijwerkingen afzonderlijk; voeg
bijvoorbeeld geen e-mailverzending toe als impliciet onderdeel van een datataak.

## Eindvalidatie Shows (13 november 2026)

`shows-validation.yml` en `/api/shows-validation-sync` vergelijken na expliciete
opdracht de bestaande kopie opnieuw met de huidige bron. Alleen een voltooide
migratie met nog geldige delegatie is toegestaan; actuele beheerders-/Showsrechten
blijven per stap vereist. De worker voert uitsluitend `shows-validation-v1` uit.
Opdracht-checkpoints delen de bestaande encryptie/sloten; geen bedrijfsdatawrites.
Ontbrekende records, bestanden of onderzoeksrelaties worden niet gerepareerd.
Schema/veldwaarden/relaties en bestandsblokken moeten opnieuw overeenkomen.
Maximaal vier onafhankelijke metadata- en acht recordreads lopen tegelijk.
Een geslaagde kopie/eindvalidatie schakelt op zichzelf geen runtimeprovider om.

## Rapportages-inrichting

De expliciet geautoriseerde adapter `reports-schema-v1` hoort bij module Reports,
niet Shows. Hij richt uitsluitend het vaste schema uit
`docs/dataverse/reports-schema.json` in; geen CSV, rapportrecords, cutover of mails.
Start via Beheerder → Datatransitie → Rapportages klaarzetten in Dataverse. Dezelfde
worker/48u-machtiging/lease/ETag bewaart metadata-checkpoints en controleert actuele
admin-/Reports-rechten per ronde. De elf gedeelde tabellen blijven read-only.
Zie `docs/dataverse/reports-schema.md` voor grenzen en het volledige model.

## Rapportages-kopie

`reports-migration-v1` kopieert na expliciete productieklik de bestaande Reports-
bronnen naar het voorbereide schema. Actuele admin/Reports/MFA voor de start,
actuele rol/modulerechten per serverstap, dezelfde48u-delegatie en globale sloten.
Voorbereiding/inventaris, bronversies en CSV17, getypeerde records, File-blokken,
read-only terugleescontrole en onafhankelijke bron-eindcontrole. Gedeelde Shows-
identiteiten hergebruiken; nieuwe Report-only Core-reeksen blijven buiten Shows.
Versleutelde immutable Opdracht-manifestpagina's/proofs zijn gebonden aan dezelfde
actor/generatie/eindtijd en worden nooit uitvoerbare taken. Geen vrije metadata,
bronverwijdering, mail, PDF-generatie of runtimecutover. Handleiding:
[Rapportages-migratieknop](dataverse/reports-migratieknop.md).

### Alleen-lezen diagnose van de Reports-inventaris

De vaste main/OIDC-worker biedt `operation=reports-check`. Dit vereist een reeds
bestaande Reports-migratietaak, haar nog geldige oorspronkelijke48u-delegatie en
actuele beheerder-/Reportsrechten van de initiatiefnemer. Geen taak starten,
hervatten of herschrijven. Alleen vaste fase-/foutcodes en technische aantallen
komen in CI; geen CSV-bytes, namen, bron-/account-ID's of providerbody. De export
leest alleen register-/bestandsmetadata en deelt de bestaande HMAC-brug. Dit kan
naast een lopende worker worden gecontroleerd via de read-only concurrencygroep.

Eenmalig herstel via `operation=reports-resume` is beperkt tot het bestaande
geblokkeerde pre-write-inventory-controlepunt: exact490 schema/indexchecks,
zelfde schema/handler/generatie, nul records/bestanden, geen eerdere inventaris,
geen onzekere write of actieve lease, actuele admin/Reports en nog geldige
originele48u-delegatie. De read-only diagnose moet volledig slagen. De server
bindt de resume conditioneel aan de gelezen generatie; geen start/restart of
machtigingsverlenging. Alle overige inhoudelijke conflicten blijven geblokkeerd.

De technische OIDC-status toont daarnaast uitsluitend de bestaande tellers
`verifiedRecords` en `verifiedFiles`. De Reports-eindcontrole mag alleen de gesloten
operationele OnTrack-heartbeat normaliseren tegen de hash-gecontroleerde, versleutelde
originele instellingen; alle zakelijke bronvelden blijven strikt. Zie de
Rapportages-migratiehandleiding voor deze beperkte versheidscontrole.

Bij een bewaard `datasets`/`verify-datasets`-controlepunt onderzoekt dezelfde vaste
`reports-check` uitsluitend de huidige manifestverwijzing, bronbundel, exacte CSV
en native parser/mapping. Geen bedrijfswrites of hervatten. De controle geeft alleen
fase, gesloten foutcode en aantallen CSV-bytes/geplande records/recordindex terug;
een TypeError/RangeError wordt een vaste technische code, nooit een ruwe fouttekst.
De originele taakgeneratie,48u-delegatie en actuele admin/Reports blijven vereist.

`reports-resume` kan ook een geblokkeerd `datasets`-controlepunt met de generieke
oude `REPORTS_MIGRATION_UNCONFIRMED` veilig hervatten. Eerst oorspronkelijke48u,
actuele admin/Reports, handler/schema/generatie, alle490 preflightchecks, bewaarde
inventaris-/bundelhash en verstreken eventuele vijftienminutenlease bevestigen.
De vaste read-only diagnose vergelijkt de bron opnieuw, berekent exact hetzelfde
plan en vergelijkt alle aanwezige records/lookups van de nog open batch. Ontbrekende
rijen mogen uitsluitend normale create-only acties blijven; afwijkende rijen stoppen.
Alleen dataset-ready met code null geeft vrij. De resume is ETag/epoch/sequence-
gebonden en wijzigt geen cursor/eindtijd; geen blinde herstart of conflictvrijgave.
Batches met een nieuwe native weigering tonen uitsluitend HTTP-status en een vaste
hexadecimale providercode, nooit providertekst/inhoud. Die fouten blijven geblokkeerd.
