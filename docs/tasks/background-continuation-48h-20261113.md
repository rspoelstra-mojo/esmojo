# Achtergrondmigratie doorwerken en 48 uur

Eigenaar: huidige Codex-sessie. Branch task/background-continuation-48h-20261113.
Gebruiker vraagt meerdere korte serverrondes per workflow en een absolute
machtiging van 48 uur. Bestaande actieve checkpoints behouden; geen nieuwe
migratie, bronverwijdering of cutover. Scope: workerworkflow/runner,
server-taakmachtiging, migratiecursor, gerichte tests en documentatie.
Geen tokens, providerinhoud of persoonsgegevens in Git/CI-logs.

Gebouwd: workflow voert maximaal veertig minuten korte OIDC-rondes uit en stopt
bij wachten, conflict, voltooiing, geen werk of een onbevestigd antwoord.
Absolute 48-uursdelegatie en interne cursorbinding behouden de actieve oude
24-uurscheckpoint zonder herstart; actuele rechten en encryptie blijven vereist.
Gerichte tests: 93 controles voor engine/store/adapter/API/mapping/runner geslaagd;
productiebuild en diffcontrole geslaagd. Livecontrole volgt na publicatie.
