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

Fase B: bestaande Redis-integratie begrenst publieke OAuth-aanroepen vóór Drive,
ongebruikte clients verlopen na 15 minuten. CSP/anti-framing en overige headers
beschermen appdocumenten; de officiële compatibele Vercel-update repareert Zod.
Een uitsluitend door de vaste main/OIDC-workflow bereikbare voorbereidingsactie
verifieert de private identiteitsconfiguratie en importeert de vijf onveranderde
referentiebeelden in een private Drive-map. Alleen technische booleans/aantallen
komen terug. Na bevestigde import verwijdert fase C de bronbeelden en adresliterals
uit de actuele broncode en schakelt de frontend over naar geautoriseerde reads.
