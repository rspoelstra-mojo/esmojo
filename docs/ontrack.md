# OnTrack

Afzonderlijke beheerpagina `/beheerder/ontrack`, via de bestaande administrator-
MFA/sessiecontrole. Geen showkoppeling of wijzigingen aan bestaande analyses.

Bron en opslag: de door de gebruiker aangewezen private Drive-map
`1V5lw-IicMW_bkphtjD4HIEejCpsOapps`. Alle gegevens zijn Vertrouwelijk; Vercel mag
verwerken en de bestaande Resend-voorziening mag de rapporten verzenden.
Opslag uitsluitend in Drive, geen Supabase of persistente browsercache.

## Rapportage en beheer

De volledige automatische rapportworkflow staat beschreven in
[ontrack-report.md](ontrack-report.md). Parser, berekeningen, eigen A4-generator,
intake, versies, private PDF-download, ontvangeraflevering en herpogingen zijn
geïmplementeerd. De vaste workflow controleert iedere 30 minuten, ook als de
beheerpagina gesloten is. Openen/verversen inventariseert eveneens de CSV-metadata.

Ontvangen telt unieke waargenomen CSV-bestands-ID’s, verwerkt telt bron-ID’s met
een echte geregistreerde PDF. Identieke inhoud+concert+layout hergebruikt het
rapport, ook bij een dubbel Drive-bestand. Laatste vijf sorteert op werkelijke
omzettijd; vinkje uitsluitend na bevestigde mail. Geen bestaande willekeurige
PDF als door OnTrack gegenereerd meetellen. Accountselectie is persistent en
revisiegecontroleerd; de nieuwste keuze geldt voor nieuwe rapporten. Een bestaand
rapport zonder ontvangers kan later bewust met Rapport mailen worden aangeboden.

De inhoudelijke overdracht is ontvangen. Nog ontbrekend zijn het originele
ON-icoon en de goedgekeurde volledige SCOOTER-referentie-PDF. Zonder origineel
icoon zijn definitieve PDF-verwerking en rapportverzending geblokkeerd. De pagina
vermeldt dit. Geen vervangend icoon of stilzwijgend goedgekeurde layout. De lokale
SCOOTER-layoutproef is geen productie-PDF en is niet verstuurd.

`src/ontrack-admin.js`/CSS en de beheerder/MFA-route blijven geïsoleerd. De vaste
signed Drive-brug hergebruikt `_esmojo_ontrack_v1.json`, waarin uitsluitend
metadata/referenties/status staan; CSV en PDF zijn eigen private bestanden.
Geen Supabase, openbare bestandlinks of persistente browseropslag. Alleen de
bewuste private PDF-download gebruikt tijdelijk een blob in browsergeheugen.

## Extra concertlocaties voor Showrapportage

Naast de bestaande Gashouder-bron heeft alleen Showrapportage toegang tot de
aparte MOJO-inventaris voor Ziggo Dome, AFAS Live, GelreDome, Johan Cruijff ArenA
en Rotterdam Ahoy. Alleen openbare concertmetadata; geen foto's, tickets,
bezoekersdata of automatisch gegenereerde analyses.

`server/mojo-agenda.js` gebruikt dezelfde parser/paginering en standaard nog
altijd uitsluitend Gashouder. De vaste `server/mojo-venues.js`-configuratie
ondersteunt expliciet gekozen andere zalen en controleert ook hun stad.
`server/ontrack-concerts.js` verzamelt de vijf locaties compleet en schrijft
via een eigen HMAC-domein naar `google-apps-script/OnTrackConcerts.gs`.

Register `_esmojo_ontrack_concerts_v1.json` staat alleen in de OnTrack-map.
Geen wijzigingen aan de Shows-index, publieke menuseed of artist-/concertmappen.
Opgeslagen historie blijft behouden; verdwenen toekomstige concerten verdwijnen
uit de keuzelijst, reeds geïnventariseerde historische datums blijven beschikbaar
voor rapportmails. De eerste import begint net als Gashouder vandaag en zoekt
365 dagen vooruit; er wordt geen onbekende historie verzonnen.

Dezelfde `mojo-shows.yml` controleert beide bronnen dagelijks rond 12.00 uur
Nederland. Voor elk van beide vaste endpoints wordt een eigen GitHub OIDC-token
gevraagd. De nieuwe route `/api/ontrack-concerts-sync` accepteert alleen de vaste
repository/main/workflow en de eigen audience. Mislukking van de ene import slaat
de andere niet over. Een onvolledige scrape overschrijft nooit de oude inventaris.

De templateflag `concertCatalog:'ontrack'` is momenteel uitsluitend op
show-report gezet. De beheerder-Email-API levert gewone `shows` en afzonderlijke
`ontrackShows`; andere mailtypen/UI krijgen de extra locaties niet. De dropdown
wisselt per mailtype en wist een oude concertkeuze. De server controleert dezelfde
scheiding bij verzending. Alleen actieve beheerders met MFA kunnen de inventaris
lezen, ook gecontroleerd tegen het actuele Drive-profiel. Bij tijdelijke fouten
blijven normale mailtests/Gashouderkeuzes beschikbaar met een gerichte melding.
