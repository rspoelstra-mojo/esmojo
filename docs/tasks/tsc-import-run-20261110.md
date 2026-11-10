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
