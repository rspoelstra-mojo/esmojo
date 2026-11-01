# Login vereenvoudigen en snelle autofill onderzoeken

Eigenaar: account A. Status: gereed voor publicatie.
Scope: themaknop en zichtbaar Inloggen-kopje uit login verwijderen; logo op
dezelfde positie en maat als hoofdmenu, uitsluitend hier alle letters wit op
50% dekking. Originele SVG intact. Gebruiker staat deze logovariant expliciet toe.

Onderzoek: formulierverzendingen bij snelle wachtwoord- en TOTP-autofill,
gelijktijdige authenticatieverzoeken en sessieterugval. Geen echte wachtwoorden,
TOTP-codes of sessies in tests/logs. MFA blijft verplicht op de server.

Aanvulling: ook de standaard uitlegtekst uit de eerste login-stap verwijderen.
Authenticator- en activeringsuitleg behouden. De login-heading is alleen nog
voor schermlezers beschikbaar; zichtbaar uitsluitend velden en verzendknop.

Gereproduceerd vóór reparatie: twee snelle requestSubmit-aanroepen veroorzaakten
twee wachtwoordverzoeken. Na reparatie één tegelijk; ook drievoudige TOTP-submit
wordt één verificatie. Stabiele formulier-/veld-IDs, standaard autocomplete en
focus op het huidige invoerveld. Regressietests voor gelijktijdigheid, opnieuw
proberen na een fout en events op vervangen formulieren toegevoegd aan CI.

Chromium: snelle login, onjuiste code en retry, sessie op aal2, activering en
exact dezelfde logo-afmetingen/positie als het hoofdmenu gecontroleerd. Test
gebruikt nagebootste diensten; de echte 1Password-extensie is hier niet aanwezig.
