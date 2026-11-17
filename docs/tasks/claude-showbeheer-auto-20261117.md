# Showbeheer automatisch aanmaken en nieuwe Showbeheer-kaart

Eigenaar: Claude Code. Branch: task/claude-showbeheer-auto-20261117.

Gebruikersopdracht (17 november 2026): Showbeheer wordt niet meer met een knop gemaakt maar automatisch 45 dagen voor de show, op het moment dat de show in het showmenu komt. De kaart krijgt twee knoppen (Link kopiëren, Verzenden) en toont de pincode in zes losse vakjes met dezelfde achtergrond als het blok. De kaart is nooit hoger dan Gashouder. Extra aandacht voor een nette vormgeving.

Wijzigingen: nieuwe import-stap `showbeheer` (shows-sync + mojo-shows.yml) met native kandidatenlijst `management-candidates` en `ensure()` in show-management.js (create-only); kaartweergave in src/show-management*.js/.css en hoogte in show-planning.css; tests, browsercontrole, docs, versie V1.171. Geen nieuw schema, geen nieuwe gegevens; bestaande link/pincode-opslag en autorisatie ongewijzigd. De server-actie `create` blijft bestaan (niet meer in de UI).

Na merge: handmatige run (run_now) om bestaande Gashouder-shows in het venster in te halen; foutcodes controleren (managementErrors).
