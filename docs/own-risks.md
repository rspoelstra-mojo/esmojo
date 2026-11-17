# Eigen operationele risico's

Knop "Eigen risico toevoegen" onderaan Operationele risico's (src/risk-analysis.js) opent een pagina met Titel (max 120 tekens),
Omschrijving (het gedefinieerde risico, max 600) en Mogelijk gevolg (max 600) en de standaard Risico beoordeling-kaart (Midden/Hoog vereisen Beheersmaatregel).
Opslaan keert direct terug naar het overzicht met een rij "Wordt opgeslagen"; na serverbevestiging staat het risico in de lijst
met de gekozen klasse. Bij een fout blijft de invoer bewaard en opent de rij de pagina opnieuw (zelfde requestId, geen dubbel).

Server: actie `operational-risk-own` (Shows-module, MFA) -> `risk-own-add` (server/dataverse-shows/rules/native.js). Het risico
krijgt id R31..R99 en wordt als `ownRisks` in productionele-risicos.json bewaard; de eerste beoordeling (revisie 1) staat in
`operationalReviews[bronrevisie]`. Samen met de analyse-risico's maximaal 30 (`OWN_RISK_LIMIT`). Eigen risico's blijven bij een
nieuwe analyse bestaan; beoordelingen niet (bestaand gedrag per bronrevisie). Het risico doet mee in planning, Actielijst en
Beheersmaatregelen via de gewone risicolijst. Bij eigen risico's is de omschrijving gelijk aan de titel.

Vanaf V1.183 heeft een eigen risico een aparte titel en omschrijving (net als de risico's uit de analyse). Eigen risico's van vóór
V1.183 hebben alleen een titel; daar geldt de titel ook als omschrijving.
