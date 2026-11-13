# Herstel migratie van tijdschemadatums

Eigenaar: huidige Codex-sessie; branch task/migration-timetable-date-20261113.
De lopende Shows-migratie blokkeert bij een tijdschemaregel: de mapper zet het
ophaaltijdstip met tijd in Expliciete brondatum, terwijl dat een datumveld is.
Gebruik de expliciete kalenderdatum van de regel; behoud het volledige
ophaaltijdstip in de bestaande Historie-snapshot. Geen schemaverruiming,
bronwijziging, herstart, automatische conflictvrijgave of cutover.
Scope: mapper, gerichte regressietest, documentatie. Geen productie-inhoud in Git.
