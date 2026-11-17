# Personeelsplanning-import: ruimere bron-URL en eigen foutcodes

Eigenaar: Claude Code. Branch: task/claude-staff-diagnose-20261117.

Aanleiding (17 november 2026): na PR 240 slagen Gashouder, Ziggo Dome en de zalen met weinig concerten, maar AFAS Live en Rotterdam AHOY geven nog `VALIDATION`. Echte MOJO-data is vanuit de ontwikkelomgeving niet bereikbaar, dus de afwijkende waarde is niet zichtbaar.

Wijziging: (1) de bron-URL-controle eist alleen nog een https://www.mojo.nl/-adres (zonder eisen aan het pad; slugs kunnen apostrofs, punten of plustekens bevatten); (2) iedere rijfout krijgt een eigen veilige foutcode (STAFF_BAD_SHAPE, _ID, _ARTIST, _DATE, _URL, STAFF_DUPLICATE) die de importrun in `staffErrors` toont, zonder gegevens. Alleen server/dataverse-shows/staff-planning.js, test, versie V1.179.
