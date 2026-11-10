# Eenmalige uitvoering TSC februari 2020
Eigenaar huidige Codex-sessie. Gebruiker bevestigt gecontroleerde private batch
in bestaande Productie te hebben geplaatst. Rechtstreekse GitHub-API-dispatch
wordt door omgevingsbeleid geweigerd. Gebruik tijdelijk één exacte main-pushmarker
om dezelfde bestaande web-reports.yml OIDC-import te starten met de vaste technische
batchnaam. Geen broninhoud, bezoekerscijfers, persoonsgegevens of bronhashes in Git
of logs. Zelfde bestaande validatie, hervatten, native index en terugleescontrole.
Import uitsluitend, geen mail/PDF. Verwijder de eenmalige trigger na uitvoering.

OIDC staat historische import uitsluitend bij schedule/workflow_dispatch toe.
Geen verruiming van authenticatie: tijdelijke aparte cron op 10 november, met
extra jaar-/Nederlandse-datumgrens en bestaande importconcurrency. Gewone
planning blijft gelijk. Vaste technische batchnaam; verwijder cron na bevestigde
start. Push blijft alleen de bestaande incidentworker activeren.

Gebruiker heeft workflow handmatig gestart: run 42771820752 (workflow_dispatch).
Tijdelijke cron, datumguard en bijbehorende tijdelijke test worden direct
verwijderd; de lopende handmatige run behoudt zijn workflowversie. Veilige
opslag-/terugleesnotices blijven beschikbaar voor bewijs zonder broninhoud.

Afgerond: run 42771820752 is Success (10m21s), met expliciete bevestigingen
HISTORICAL_IMPORT_STORED total=15 complete=15 pending=0 en
HISTORICAL_IMPORT_VERIFIED verified=15 total=15. Native indexering en de bestaande
bron-/showgegevens-terugleescontrole zijn geslaagd. Privéstatus per bestand is
bijgewerkt: 15 geslaagd; goedgekeurde identieke S2 overgeslagen. Tijdelijke start
is verwijderd in 2f91627; daarbij horende CI/opslagcontroles zijn geslaagd.
Geen CSV-inhoud of broncijfers in Git. Geen historische mail/PDF gestart.
