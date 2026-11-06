# Actieve showopslag (V1.58)

De gebruiker heeft op 6 november 2026 Supabase als primaire opslag voor actieve
voorbereiding goedgekeurd, met de hier beschreven uitzonderingen. Vormgeving,
handmatig Opslaan bij barrier/vloer, 600 ms tekst-autosave, beoordelingscriteria,
bronbinding, briefingkeuze en afrondplanning veranderen niet.

## Verdeling

| Gegevens | Primaire opslag |
| --- | --- |
| Showprofielsamenvattingen, eindcijfers/toelichtingen | Supabase zolang actief |
| Productionele keuzes, barrierbeoordeling, operationele beoordelingen/historie | Supabase zolang actief |
| Maatregeltekst, aparte score na implementatie, briefing, implementatiestatus | Supabase zolang actief |
| Vier afgeleide planningsvlaggen en technische bron-/veldrevisies | Supabase zolang actief |
| Accountprofielen, moduletoegang en persoonlijke showkoppelingen | Uitsluitend Drive; Auth houdt bestaande uitzondering |
| Geüploade bestanden | Uitsluitend Drive; alleen bestaande private referenties/metadata bij beoordelingen |
| CSV's, incidenten en showrapportages | Uitsluitend Drive |
| Kaartverkoop en bezoekersherkomst | Uitsluitend Drive |
| Vloerdruk met bezoekersaantallen, vakken en ticketreferentie | Uitsluitend Drive; alleen de beoordelingssamenvatting gaat naar Supabase |
| Onderzoeksdocumenten, gegenereerde PDF's en AI-bronbestanden | Bestaande Drive-opslag |

Geen privé-inhoud in browseropslag, workflows, analytics of foutlogs. De actieve
snapshot heeft een expliciete veldallowlist en een recursieve uitsluitingscontrole.
Ticketbasis bevat uitsluitend drie technische versienummers en de bestaande
klaar-vlag; nooit inhoud. Een volledige show-open-response wordt nooit in Supabase
bewaard. Publieke homepagecontrole selecteert alleen de vier planningsvlaggen.

## Toegang en transacties

Alle browseracties blijven via de bestaande account-/MFA-/modulecontrole op
Vercel gaan. Tabellen hebben RLS en geen rechten/policies voor anon/authenticated.
Alleen de bestaande server-servicekey kan de afgeschermde RPC's gebruiken; deze
key gaat nooit naar browser, Drive of Apps Script. Er zijn geen nieuwe secrets.

Vanaf V1.59 claimt de signed export het Drive-eigenaarschap atomair onder dezelfde
lock vóór de eerste DB-seed. Onderweg zijnde legacy-writes worden daarna veilig
geweigerd; een normale herpoging volgt de huidige primaire route. Na archivering
geeft de marker de historische Drive-route weer vrij. Een capability-handshake
houdt applicatie- en Apps Script-publicaties onderling compatibel.

De browser coördineert writes per show en houdt navigatie vrij. Alleen eigen
bevestigde revisies kunnen een wachtende productionele keuze bijwerken; externe
revisies blijven conflicten. Elke database-mutatie valideert de actuele bron en
recordrevisie onder een korte showlease, waarna inhoud en ontvangstbewijs in één
transactie worden vastgelegd. Een verloren antwoord wordt met hetzelfde
commandohash herkend. Maximaal 200 recente ontvangstbewijzen per actieve show;
oudere versies mogen nooit zonder revisiecontrole opnieuw schrijven.

De frontend toont pas bevestigde workflowafrondingen. Acties die nog niet door
de server bevestigd zijn behouden de afsluitwaarschuwing. Een achtergrondkopie
naar Drive hoeft daarna niet meer door de browser te worden afgewacht.

## Drive-only handelingen

Ticket-/vloerwrites en uploads behouden hun bestaande Drive-validatie, lease,
bestandscontrole en readback. Ze ontvangen een ondertekende overlay van de actuele
voorbereiding; alleen de toegestane velden uit het resultaat komen terug in DB.
De database bewaart bij deze overdracht uitsluitend het commandohash, niet de
request met bezoekerscijfers of uploadbytes. Een vooraf geverifieerd Drive-journal
bewaart tijdelijk de echte request in de concertmap. De fases prepared/executing
voorkomen dat herstel een reeds uitgevoerde wijziging terugdraait; het eindbewijs
vervangt de request. Herstel controleert bovendien de oorspronkelijke commandohash.

Lezen en PDF-acties gebruiken een tijdelijke virtuele overlay. Zij kunnen daardoor
geen verouderde voorbereidingssnapshot naar Drive terugschrijven en blokkeren geen
snelle databasewrites. Verouderde resultaten overschrijven geen nieuwere DB-revisie.
Een normale Drive-achtergrondkopie houdt evenmin een DB-lease vast; de pending-vlag
wordt alleen bij de nog gelijke revisie gewist. De Drive-marker weigert oudere
kopieën nadat een nieuwere revisie is gepubliceerd.

Bij een onzeker antwoord op een echte Drive-write blijft de exclusieve lease
staan. De worker herleest na minimaal drie minuten (onder dezelfde Drive-lock)
de daadwerkelijk opgeslagen stand. De oorspronkelijke ondertekende aanvraag is
dan verlopen. Een lease duurt vijftien minuten, langer dan de maximale Apps
Script-uitvoering. Hiermee kan een late oude uitvoering geen nieuwere write
inhalen. Behouden invoer/centrale fout blijft beschikbaar bij een conflict.

## Archivering

`archiveAfterShow` gebruikt de laatste echte showdatum van de canonieke reeks.
Vanaf 00:00 Europe/Amsterdam op laatste datum + twee kalenderdagen wordt gearchiveerd:
2 november → 4 november, 6/7/8 november → 10 november. Zomer-/wintertijd wordt bij
het bepalen van die lokale middernacht meegenomen. De worker draait iedere vijf
minuten via een main/GitHub-OIDC-workflow; GitHub kan geplande runs vertragen.
Een verzoek voor een inmiddels vervallen actieve show voert dezelfde controle uit.

1. Exclusieve lease nemen, zodat de te archiveren revisie vaststaat.
2. Profiel, analyseafronding en productie/maatregelen schrijven in de bestaande
   canonieke Drive-concertmap. De uitsluitend in Drive gebleven vloerinhoud en
   haar historie samenvoegen; kaartverkoop/herkomst/bestanden niet verplaatsen.
3. Alle geschreven JSON teruglezen en controleren; daarna een geverifieerde
   archiefmarker publiceren. Een inmiddels verlengde showreeks stelt archivering uit.
4. Alleen bij die bevestiging de DB-show en alle bijbehorende ontvangstbewijzen
   transactioneel verwijderen. Geen show-tombstone of alias in Supabase achterlaten.
5. Latere reads/writes gaan uitsluitend naar Drive. Historische shows worden nooit
   opnieuw naar de actieve database geïmporteerd.

Fouten behouden de databasebron en verschijnen na login in de bestaande melding
rechtsonder. De worker herstelt en herhaalt; geen mails of incidenten wijzigen.
Verwijderen betreft de actieve tabellen; eventuele Supabase-back-ups volgen de
bestaande bewaartermijn van het project, niet een belofte van fysieke backupwissing.

## Uitrol en controles

1. Voer `supabase/migrations/202611060001_active_show_storage.sql` uit in de SQL
   Editor. De gebruiker heeft deze stap uitgevoerd. Opslag blijft uitgeschakeld.
2. Deploy gecontroleerde applicatie en Apps Script. Run `show-storage.yml` met
   `check_only=true`: alleen technische schema-/echte Gashouder-broncontrole.
3. Activeer vervolgens met `update public.esmojo_storage_control set enabled=true where id=1;`.
4. Run opnieuw check-only en daarna de worker. Alleen echte Gashouder-bronnen
   worden gecontroleerd; geen synthetische productiegegevens of wijzigingen aan
   gebruikersbeoordelingen. Normale overname gebeurt bij openen van een actieve show.

Niet uitschakelen met nog actieve DB-shows: een trigger weigert dat om terugvallen
op een oude Drive-kopie te voorkomen. Een DB-uitval faalt gesloten; geen stille
fallback naar een verouderd archief. Bij wijziging van canonieke identiteit of
tegenstrijdige aliassen: conflict en gegevens behouden, nooit de verkeerde show
overschrijven. SQL beheert alleen eigen nieuwe tabellen/RPC's, niet Auth/accounts.

Tests: PostgreSQL 17 (migratie herhalen, RLS/rechten, leases, CAS, ontvangstbewijs en
cascade-verwijdering), signed Apps Script-integratie, dertig gelijktijdige risico's,
verloren antwoord, conflicten, niet-blokkerende mirror, archieffout/herstel, DST,
Drive-only na archivering en bestaande volledige regressiesuite. Lokale browsertests
gebruiken synthetische fixtures; livecontrole toont alleen technische aantallen.
