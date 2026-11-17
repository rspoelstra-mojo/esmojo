# Risico-PDF per beheersmaatregel

Eigenaar: Claude Code. Branch: task/claude-risk-pdf-20261117. Doel: per risico met beheersmaatregel (Midden/Hoog, productioneel,
operationeel en eigen risico) een PDF exporteren in dezelfde huisstijl als het Showprofiel-PDF, met de inhoud van risico,
beoordeling en beheersmaatregel. Besluiten gebruiker: alle zalen, genereren op aanvraag zonder opslag (geen schema), alleen
risico's met beheersmaatregel. server/report-original blijft ongewijzigd; nieuwe renderer server/risk-pdf/.
Verwachte bestanden: server/risk-pdf/*, server/accounts-api.js (actie), shared/ en src/ (knop), docs/risk-pdf.md.
