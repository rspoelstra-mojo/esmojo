# Personeelsplanning-import: bron-URL-validatie gelijk aan de catalogus

Eigenaar: Claude Code. Branch: task/claude-staff-validation-20261117.

Aanleiding (17 november 2026): de eerste handmatige run van de stap `staffplanning` kreeg voor drie zalen `VALIDATION` (andere zalen en de overige stappen slaagden). Oorzaak: de agenda-parser valt terug op `https://www.mojo.nl/agenda` als bron-URL en kent queryparameters; de bestaande catalogus staat dat toe (`/agenda` of `/concerten/...`, optioneel met query), maar de nieuwe stap weigerde het.

Wijziging: dezelfde bron-URL-regel als de catalogus in server/dataverse-shows/staff-planning.js, met test (agenda-terugval, queryparameter, kwaadaardige host en http geweigerd). Versie V1.178. Geen gegevens-, schema- of rechtenwijziging.
