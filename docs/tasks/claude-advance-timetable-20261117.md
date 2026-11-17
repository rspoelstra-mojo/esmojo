# Dagelijkse tijdschemacontrole vooraf; opname op de showdag stopt

Eigenaar: Claude Code. Branch: task/claude-advance-timetable-20261117.

Gebruikersopdracht (17 november 2026): de 05:00-run controleert dagelijks, voor alle shows in de komende 45 dagen, of MOJO op de concertpagina al een tijdschema publiceert (Deuren open, acts, pauze, verwacht einde). Een beschikbaar tijdschema verschijnt beknopt in het blok Tijdschema van het showoverzicht: tekst links, tijd rechts. Aanvullend besluit: de opname op de showdag om 12:00 mag stoppen; de dagelijkse controle vervangt die.

Uitgangspunten: openbare geplande showtijden zijn al Openbaar geclassificeerd (5 november). Opslag uitsluitend in Dataverse, in de bestaande generieke Integratiestatus (per concert, versleuteld/afgeleid gebruik is niet nodig voor openbare data), geen nieuw schema. Het oude parserwerk wordt hergebruikt; het schema wordt dagelijks ververst en nooit als 12:00-opname gepresenteerd. Een eerder beschikbaar schema wordt niet gewist als MOJO het later weghaalt. Lezen op de showpagina achter de bestaande Shows-module/MFA-controle.

Wijzigingen: nieuwe operaties voor kandidaten/opslaan/lezen in de native catalogus, nieuwe batchstap in de 05:00-import (cursor), nieuwe leesroute en weergave in het showoverzicht; het 12:00-schema en het bijbehorende eindpunt gaan uit. Bestaande opgeslagen showdagopnamen en rapportweergave blijven ongewijzigd.

Verwachte bestanden: server/mojo-timetable.js, shared/show-timetable.js, server/dataverse-shows/catalogue.js, server/shows-sync-api.js, server/shows-store.js, server/accounts-api.js, .github/workflows/mojo-shows.yml, src/show-page.js, nieuw src/show-schedule.js/.css, tests, docs.
