# Fotostap van de import: INTEGRATION_RETIRED

Eigenaar: Claude Code. Branch: task/claude-import-retired-20261117.

Diagnose (17 november 2026, met de nieuwe alleen-lezen verificatie uit PR 222): de 05:00-import faalde in stap photo-candidates met kind=Error, detail=INTEGRATION_RETIRED. Oorzaak: shows-store.js behandelt elke bewerking met het voorvoegsel artist- als artiestmodule-bewerking en stuurt die naar native.related. related() kent alleen artist-catalogue, artist-profile, artist-show en incident-read; voor alle andere namen valt het terug op de oude Drive-brug, die sinds de Google-afsluiting INTEGRATION_RETIRED geeft. artist-photo-candidates en artist-photo-save zijn echter native catalogusbewerkingen (createNativeCatalogue.handles). De tests riepen de catalogus rechtstreeks aan en dekten de routering dus niet.

Fix: die twee bewerkingen rechtstreeks naar de native catalogus routeren in beide native routes (expliciet en managed) van shows-store.js. Nieuwe test via createShowsStore, bevestigd rood zonder en groen met de fix. Geen schema, opslag, frontend of workflow.

Verwachte bestanden: server/shows-store.js, server/shows-store.test.js, index.html (versie), deze notitie.
