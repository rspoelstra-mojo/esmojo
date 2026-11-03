# Afzonderlijke concertinventaris voor OnTrack-mails

Eigenaar: Codex, deze chat. Branch: task/ontrack-mailing-concerts-20261103.

Inventariseer MOJO-concerten in Ziggo Dome, AFAS Live, GelreDome, Johan Cruijff
ArenA en Rotterdam Ahoy voor Showrapportage. Dezelfde dagfrequentie en 365-dagen-
horizon als Gashouder. Bewaar apart in de OnTrack-map, buiten de Shows-index,
menu-snapshot, artiestmappen, analyses en andere productiepagina’s.

Bestaande Openbaar-classificatie voor MOJO artiest/locatie/datum/bron/ID is van
toepassing. Alleen beheerder met MFA krijgt de mailingcatalogus; import alleen
via vaste GitHub OIDC-workflow. Hergebruik scraper, bescherming en schema’s waar
passend. Historie behouden voor rapportmails. Toon deze concerten uitsluitend in
de beheerder-mailkeuze, zonder nieuwe showpagina’s of mailverzending.

Verwachte bestanden: parametriseerbare scraper/venueconfig, afzonderlijke
server-/Drive-catalogus, vaste workflowkoppeling, emailtestcatalogus, tests/docs.
Publiceer en voer de eerste import uit na alle passende controles. V1.21.

Gebouwd: vaste venueconfig, hergebruikte parser en IDs met zaalnaam, eigen
OIDC-import/Drive-register, dagelijkse workflow met beide bronnen, aparte
Showrapportage-concertkeuze en servervalidatie. Geen gewone showindex, menu-seed
of artiestmap aangepast. De extra bron blijft serverzijdig en beheerder/MFA-only.

Controles: bestaande Gashouderparser (7), eigen inventaris/isolatie (5), OIDC (4),
account-API (26), mailservice (4), bestaande Drive/showroutes/OnTrack/Apps Script-
controles, build en browserfixtures. Browser controleert extra locatie en datum
uitsluitend bij Showrapportage, geen extra Shows-items, reset bij ander mailtype
en behoud normale mailtests bij tijdelijke inventarisfout. Geen echte mails.
