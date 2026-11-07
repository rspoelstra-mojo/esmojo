# Beveiligingsverbeteringen na onderzoek

Eigenaar: Codex. Branch: task/security-remediation-20261107.

Doel: beveiligingspunten uit het onderzoek van 7 november oplossen zonder
zichtbare vormgevingswijzigingen of verlies van bestaande functionaliteit.

Scope: OAuth-misbruikbegrenzing met bestaande Redis; browserheaders/CSP;
expliciete legacy-modulemigratie; publieke persoonsadressen minimaliseren;
afhankelijkheden; geautoriseerde standaarddiagrammen; autorisatie-/regressietests.
Diensten: bestaande Vercel-, Upstash- en Apps Script-routes. Geen schemawijziging,
nieuwe mailverzending of historieherschrijving. Bestaande private bestanden en
accounts niet als testmateriaal wijzigen. Externe beperkingen afzonderlijk melden.

Vooraf en na integratie: rollenmatrix, toepasselijke bestaande tests, build,
CI en controle van de publicatie. Geen sleutels of persoonsgegevens in deze notitie.

Fase A: eerst alleen de compatibele Drive-migratie publiceren. Deze schrijft de
bestaande legacy-toegang één keer expliciet uit, zonder beperkte profielen te
verruimen. Pas na geslaagde Apps Script-publicatie volgt de strikte weigering bij
een ontbrekend moduleveld en de overige beveiliging (fase B). Dit voorkomt dat
bestaande gebruikers tijdens een gelijktijdige Vercel/Drive-uitrol buitenvallen.

De compatibele eerste fase legt ook de bestaande vaste beheerder-ID en reeds
bestaande testmailuitzondering vast in hetzelfde private accountregister. De
vervolgfase kan zo persoonsadressen uit de code verwijderen zonder de ingestelde
superrol of extra testmailontvanger te veranderen.
