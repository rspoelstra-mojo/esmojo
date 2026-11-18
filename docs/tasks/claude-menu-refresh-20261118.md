# Showmenu direct verversen na alias of reeks (Claude Code, 18 november 2026)

Eigenaar: Claude Code. Branch: task/claude-menu-refresh-20261118. Doel: na een bevestigde artiestnaam- of reeks-opslag in Concertagenda
ververst het Shows-menu direct (bestaand `refreshShowsMenu`), in plaats van pas bij openen van Shows of binnen een minuut.
Verwachte bestanden: src/staff-planning.js, src/main.js, index.html (versie). Alleen presentatie; geen nieuwe opslag, API of rechten.

Aanvulling: het Shows-menu (`upcomingShows` in server/mojo-agenda.js) groepeerde alleen opeenvolgende dagen en negeerde handmatige reeksen
(Beth Hart 1 en 4 december bleef twee items). Rijen met dezelfde reeksidentiteit (`generalConcertId`) vormen nu één menu-item, ook met tussendagen.
