# Herstel migratie van tijdschemadatums

Eigenaar: huidige Codex-sessie; branch task/migration-timetable-date-20261113.
De lopende Shows-migratie blokkeert bij een tijdschemaregel: de mapper zet het
ophaaltijdstip met tijd in Expliciete brondatum, terwijl dat een datumveld is.
Gebruik de expliciete kalenderdatum van de regel; behoud het volledige
ophaaltijdstip in de bestaande Historie-snapshot. Geen schemaverruiming,
bronwijziging, herstart, automatische conflictvrijgave of cutover.
Scope: mapper, gerichte regressietest, documentatie. Geen productie-inhoud in Git.

Gereproduceerd met de private bron van de geblokkeerde reeks: datumvalidator
weigert esmojo_tijdschemaregel.esmojo_brondatum wanneer capturedAt wordt gebruikt.
Na correctie valideert dezelfde lokale bron volledig. 20 gerichte mapping-/
broncontroles, build en diffcontrole geslaagd. De bewuste hervatklik blijft achter
het oorspronkelijke beheerdersaccount/MFA; geen automatische vrijgave van blokkades.
