# Herbruikbare beheer-achtergrondtaken

De bestaande ESMOJO-server voert bewuste beheeropdrachten uit, onafhankelijk van
het geopende tabblad. Eerste toepassing: `shows-migration-v1` op
`/beheerder/datatransitie`. De gewone AI-import-, keuze- en tabelsetupknoppen
houden voorlopig hun eigen bestaande uitvoering.

## Gebruik en uitvoering

Een bewuste startklik bewaart eerst de opdracht duurzaam in Dataverse. Daarna
start Vercel de eerste korte worker via `waitUntil`; het HTTP-antwoord hoeft de
migratie niet af te wachten. Het tabblad mag sluiten en de telefoon mag vergrendelen.
De vaste GitHub-workflow `background-tasks.yml` pakt elke vijf minuten bestaande
taken op. GitHub kan die planning vertragen; een onderbroken serverronde betekent
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

De taakmachtiging loopt maximaal 24 uur vanaf de start. Bij iedere stap worden
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
repository, main, eigen workflow en audience. Alleen POST met `{}`; geen vrije
soort, cursor, URL, tabel of opdracht. CI ziet uitsluitend technische aantallen.
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
