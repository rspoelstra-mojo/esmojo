# Drive-schrijffout gericht onderzoeken

Eigenaar: account A. De eerste profielkoppeling faalt nog in DRIVE_WRITE nadat
de gebruiker expliciet de Drive-scope heeft ingesteld. Dat bevestigt de fase,
maar niet of autorisatie, opslagquota, maprechten of een andere Drive-fout de
oorzaak is.

Een editor-only test maakt uitsluitend een leeg tijdelijk JSON-bestand in de
bestaande map en verplaatst alleen dat bestand naar de prullenbak. Geen profiel-
of authenticatiegegevens gebruiken. Google-fouttekst wordt alleen voor deze
lege test doorgegeven, met accountnamen, links en lange IDs verwijderd.
Geen publieke route, geen wijziging aan bestaande accounts of de website-login.
