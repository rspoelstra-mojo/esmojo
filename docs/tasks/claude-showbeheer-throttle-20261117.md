# Showbeheer-aanmaak: Dataverse-429 afhandelen

Eigenaar: Claude Code. Branch: task/claude-showbeheer-throttle-20261117.

Aanleiding (17 november 2026): de eerste handmatige runs van de nieuwe `showbeheer`-stap maakten per run slechts enkele toegangen aan; voor drie shows gaf Dataverse steeds `SETUP_THROTTLED` (HTTP 429, serviceprotectielimiet) bij drie gelijktijdige aanvragen.

Wijziging: het aanmaken loopt voortaan één concert tegelijk en probeert bij een tijdelijke 429 maximaal twee keer opnieuw na de Retry-After van Dataverse (begrensd op 30 s per wachttijd en 120 s per verzoek). Daarna telt het concert als mislukt en blijft het kandidaat voor de volgende run (create-only, idempotent). Alleen server/shows-sync-api.js, test en versie V1.172; geen schema- of gegevenswijziging.
