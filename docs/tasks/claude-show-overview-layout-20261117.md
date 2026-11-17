# Nieuwe indeling Overzicht-tab van de showpagina

Eigenaar: Claude Code. Branch: task/claude-show-overview-layout-20261117.

Gebruikersopdracht (17 november 2026), vijf kolommen: rij 1 Projectteam (1/5, halve hoogte planning) met daaronder Tijdschema (1/5, even hoog), Show informatie (2/5) en Planning (2/5). Rij 2: Showbeheer (1/5), Gashouder (2/5), Actielijst (2/5, nieuw). Rij 3: kleine titel Vergelijkbare artiesten zonder blok, met vier tegels van 1/8 paginabreedte (kleine foto, artiestnaam, risicoscore x/100) die naar de artiestpagina verwijzen. Voorlopige placeholders: Don Toliver, New Wave, Ken Carson, Skepta; de logica voor echte vergelijkbare artiesten volgt later.

Uitgangspunten: Tijdschema, Show informatie en Actielijst zijn voorlopig lege blokken met titel. Showbeheer/Gashouder blijven alleen bij Gashouder-shows (bestaande logica) en houden hun inhoud. De tegels gebruiken de bestaande Artiesten-routes (artist-menu/artist-open, risicoscore, MOJO-foto) en worden alleen getoond met actuele Artiesten-module (risicoscore is Vertrouwelijk); laden op de achtergrond na het tonen van de pagina, begrensd, geen klikregistratie voor de Artiesten-top-5. Geen nieuwe opslag, schema of API; homepage ongewijzigd.

Verwachte bestanden: src/show-page.js, src/show-planning.css, src/show-management.css, src/mobile-navigation.css, nieuw src/similar-artists.js/.css, tests, docs, versie.
