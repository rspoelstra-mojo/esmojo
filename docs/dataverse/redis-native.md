# Redis vervangen door Dataverse

Deze wijziging vervangt uitsluitend de actieve anonieme Artiestenkliks/top 5 en
extra MFA-replaybeveiliging. Supabase Auth blijft verantwoordelijk voor gebruikers,
wachtwoorden, factoren, challenges, verificatie en sessies. Bestaande serverautorisatie,
IP-forwarding naar Auth, MFA-cookie en previewproxy veranderen niet.

## Opslag en betekenis

De bestaande TechnischeStatus-tabel bewaart domeingescheiden technische resources:
`artist-view-v1`, `mfa-user-v1`, `mfa-used-v1`, `security-probe-v1`. Geen schema-, keuze-
of gedeelde betekeniswijziging. Unieke sleutel is een SHA-256 van namespace/resource;
alle transacties gebruiken create-only of de waargenomen ETag. Bij verloren antwoord
worden alle verwachte velden onafhankelijk teruggelezen vóór succes, nooit blind herhaald.
De bestaande verbinding beheert tokens en vernieuwing; geen bearer in een writerclosure.

Een anoniem klikevent bewaart het bestaande willekeurige event-ID, bestaande artiest-ID
en oorspronkelijke milliseconden in een gevalideerde resourcecode. De artiest-ID wordt
gecontroleerd tegen de centrale catalogus inclusief bestaande leesaliases. Dit is een
logische koppeling, geen fysieke nieuwe Artiest-lookup of een aparte artiestenlijst.
De intentvingerafdruk en volledige velden worden teruggelezen. Dezelfde event-ID telt
hoogstens eenmaal. Top 5 gebruikt dezelfde aliasnormalisatie en sortering als voorheen.
Geen account-ID, IP, apparaat, zoekterm of artiestnaam in klikrecords.

MFA bewaart uitsluitend domeingescheiden HMAC's met de bestaande serverkey en een
willekeurige lease-owner. Eén atomaire transactie reserveert de gebruikerslease en
code; commit maakt de gebruikte-code-markering en geeft de lease vrij. Een oude owner
kan een nieuwe lease niet vrijgeven of bevestigen. Providerfouten falen gesloten.
De bestaande 45s lease/30s replayblokkade wordt conservatief gemeten vanaf Dataverse
`modifiedon` plus één seconde voor tijdprecisie (effectief maximaal 46s/31s).
Dit verlengt geen achtergrondtaakmachtiging. Codes, tokens en ruwe identifiers worden
niet opgeslagen. De openbare MFA-config houdt het bestaande wirelabel `redis` voor
compatibele browserselectie; dat label is geen bewijs van de werkelijke opslagprovider.

Verlopen kliks vallen exact na 31 dagen buiten alle tellingen. Technische expiratie
wordt bij elke MFA-read gecontroleerd. Fysieke verwijdering gebeurt apart via de vaste
main/OIDC-achtergrondworker: maximaal 200 eigen verlopen records per ronde, met ETag
zodat een vernieuwde lease niet wordt verwijderd. GitHub-planning kan vertragen;
claim geen onmiddellijke fysieke Redis-TTL. Andere TechnischeStatus-resources worden
nooit opgeschoond door deze routine.

## Gecontroleerde activering

Publicatie start geen migratie. Op Beheerder/Datatransitie staat ‘Redis vervangen door
Dataverse’, uitsluitend voor actuele beheerder met Artiesten en Shows. Een expliciete
start met verse MFA geeft de normale maximaal 48u delegatie. Bestaande generaties,
versleutelde checkpoints, leases en rechtencontrole per workerstap blijven gelden.

1. Meet native create/read/delete op uitsluitend een herkenbare technische proef.
   Boven acht seconden stopt voorbereiding vóór de blokkade. Geen Auth-challenge of
   fictief account, concert of mail. Vaste `mfa-security-check.yml` meet dit na mainpublicatie.
2. Lees maximaal 20.000 nog geldige Redis-events read-only. Zet de native autoriteit op
   freeze en bevestig de Redis-klikfence. Begin daarna elf minuten uitloop. Nieuwe
   MFA-verificaties en klikwrites pauzeren; bestaande sessies en top-5-reads blijven werken.
3. Kopieer in begrensde idempotente stappen met oorspronkelijke ID/tijd. Geen expiratie-
   verlenging. Vergelijk bron voor/na de native read en alle nog geldige eventtriples.
   Inhoudelijke afwijkingen stoppen zonder reparatie. Checkpoints bevatten geen klikinhoud.
4. Herhaal de vergelijking en technische gezondheidsmeting. Activeer conditioneel met
   ETag, lees autoriteit en events onafhankelijk terug. Daarna uitsluitend Dataverse;
   geen Redis-fallback. Een ontbrekende autoriteit met bronfence/expliciete nativekeuze
   faalt gesloten. Oude taakgrants niet heropenen.
5. Sluit pas na bewezen activering de Redis-resource/toegang af. Een groene deployment
   is geen kopiebewijs of bewijs van daadwerkelijke dienstafsluiting. Brondata niet wissen
   als migratiestap; de bestaande Redis-expiratie blijft tot dienstafsluiting gelden.

De taskstatus rapporteert gekopieerde/gecontroleerde anonieme events, geen personen.
Na activering herstart een taak uitsluitend native gezondheids-/leescontroles. De
bron wordt niet heropend. `MFA_REPLAY_ENABLED` en Supabase-/crypto-keys blijven behouden.
KV/Upstash-credentials pas na afgeronde kopie buiten actief gebruik zetten; oudere
deployments kunnen nog eigen credentials bevatten, dus ook providerafsluiting bewijzen.

## Controles

`server/redis-native/*.test.js`: concurrency, verlopen/replaced leases, onafhankelijk
replay per code/factor, verloren bevestiging, volledige veldcontrole, exacte eventtijd,
deduplicatie, onbekende artiest, 31 dagen, cleanup/ETag-race, hervatten en bronconflict.
De echte Redis-test gebruikt alleen een geïsoleerde testcontainer; geen productiewrites.
Bestaande MFA SDK-, rechten-, proxy-, cookie- en fixed-OIDC-tests blijven verplicht.
Desktop/mobiel Datatransitie wordt met synthetische gegevens getest. Live native probe
schrijft uitsluitend de korte technische proef, ruimt die terugleesbaar op en meet duur.
Productie-activering en werkelijke dienstafsluiting afzonderlijk in taaknotitie bewijzen.

## Definitieve projectafbouw na de activering

Na109/109 gecontroleerde events en bewezen native MFA (PR200/201) worden alleen
oude KV/Upstash/Redis-toegangsvariabelen buiten actief gebruik gebracht. Bewaar ze
versleuteld onder `RETIRED_REDIS_*` totdat providerintrekking afzonderlijk bevestigd
is; geen geheime waarden uitlezen of publiceren. Nieuwe uitrol gebruikt uitsluitend
Dataverse, ook bij ontbrekende autoriteit geen productiecontact met Redis.
`REDIS_STORAGE_PROVIDER=dataverse` is expliciete aanvullende blokkade. Supabase-/
Dataverse-/crypto-keys en `MFA_REPLAY_ENABLED` blijven behouden.

De vaste main/OIDC-stap `redis-closure` controleert de voltooide oorspronkelijke
kopie/activering, afwezigheid van actieve Rediscredentials, actuele native kliktellers
en de daadwerkelijk geselecteerde MFA-replayopslag. Alleen de bestaande korte
technische MFA-probe schrijft/leest/verwijdert; geen Auth-challenge, codes of kliks.
Provider/database en oudere deploymentcredentials moeten apart worden afgesloten;
een geslaagde native controle bewijst geen gestopte Redis-facturering.
