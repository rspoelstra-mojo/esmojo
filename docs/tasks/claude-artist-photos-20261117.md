# MOJO-foto voor alle artiesten

Eigenaar: Claude Code. Branch: task/claude-artist-photos-20261117.

Gebruikersopdracht (17 november 2026): elke artiest die in ESMOJO staat en een artiestpagina heeft, krijgt de foto van de MOJO-artiestpagina (bijvoorbeeld mojo.nl/thekidlaroi). Artiestfoto's van openbare MOJO-pagina's zijn Openbaar; de bestaande eenmalige vastlegging blijft het mechanisme (esmojo_artiest.esmojo_fotobronurl plus eenmalige Integratiestatus-marker, geen afbeeldingsbytes, geen dagelijkse hercontrole of vervanging).

Bevinding: de vaste 05:00-import (mojo-shows.yml, shows-sync) legt dit al vast, maar alleen voor artiesten met een concert in de komende 45 dagen. Aanpak: kandidaten uitbreiden naar alle artiesten zonder foto en zonder eerdere definitieve poging; de workflow werkt het in begrensde batches af. Een tijdelijke MOJO-fout (netwerk, timeout, 429, 5xx) wordt niet als definitief ontbrekend vastgelegd (nu zou dat bij een bulkrun permanent foto's kosten); die artiesten blijven kandidaat voor de volgende run, binnen een run met een cursor zodat niets herhaald wordt. Een definitief ontbrekende pagina (404 of geen foto) blijft eenmalig als missing vastgelegd. De workflow faalt niet meer op een nog lopende fotobacklog en stopt na ca. 35 minuten.

Geen nieuw schema, geen nieuwe tabel/kolom, geen frontendwijziging, geen handmatige productiewrite buiten de bestaande OIDC-workflow. De vulling gebeurt bij de eerstvolgende import om 05:00 Europe/Amsterdam.

Verwachte bestanden: server/mojo-photo.js, server/shows-sync-api.js, server/dataverse-shows/catalogue.js, .github/workflows/mojo-shows.yml, bijbehorende tests, docs/dataverse/concert-catalogue.md.
