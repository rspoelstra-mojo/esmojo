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
