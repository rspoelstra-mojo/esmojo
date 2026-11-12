# Automatische showpagina's voor Dataverse-shows

Eigenaar Codex, branch task/dataverse-all-shows-20261112.
Gebruiker vraagt algemene Dataverse-koppeling: iedere geïmporteerde show krijgt
automatisch dezelfde showpagina en onderzoekweergave als de proef. Correctie:
bestaande Gashouder-shows behouden; geen andere MOJO-zalen automatisch ontsluiten
zonder Dataverse-resultaten. Geen volledige datamigratie of wijziging Power Automate.

Scope: Dataverse broncatalogus en leesadapter, veilig oplossen van showidentiteit,
showmenu/directe routes, generieke idempotente showinitialisatie, hergebruik
profiel/risico/maatregel/PDF-functies. Gewone account/MFA/Shows-poort blijft vereist.
Geen onderzoekinhoud in menu, logs of persistente cache; AI-concepten blijven
gescheiden van eigen analyses/beoordelingen. Geen aangenomen namen/datum uit AI-proza.
Showbeheer blijft de apart afgesproken externe Gashouder-functie.
Tests voor meerdere shows/zalen, bronisolatie, nieuwe imports, heropening en rechten.

Laatste gebruikerscorrectie: geen periodieke submenuverversing. Komende week en
Komende periode tonen samen vandaag tot45 dagen vooruit. Bestaande directe-
cacheweergave en reguliere laadhercontrole blijven; geen aparte Dataverse-groep.
Directe Dataverse-showpagina's blijven buiten die menuperiode oplosbaar.

Controles:128 relevante server-/route-/geheugen-/researchtests;18 Apps Script-
publishertests;30 PDF-/workflowtests;75 afsluitende auth/nieuwe integratietests
(sets overlappen). Chromium test volledige AFAS- en Ziggo-showpagina, alle tabs,
AI-isolatie, behoud eigen tekst en geen extra transport bij tabwisselen.
Ook bestaande research- en Dataverse-diagnosebrowserchecks groen. 500 synthetische
show-sleutels getest zonder artiest-/zalenallowlist. Productiebuild, browserheaders,
ES2020-syntaxis van53 Apps Script-bestanden en git diff --check slagen.
Geen productiecredentials in cloudomgeving; werkelijke Dataverse-inhoud niet
lokaal opgehaald. Bestaande serverconfiguratie wordt ongewijzigd hergebruikt.
