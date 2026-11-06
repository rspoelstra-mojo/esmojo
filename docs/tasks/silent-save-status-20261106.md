# Stille achtergrondopslag

Eigenaar Codex, branch task/silent-save-status-20261106. Verwijder normale
voortgangs-/succesmeldingen voor achtergrondopslag, inclusief de herbruikbare
risicobeoordeling. Behoud fouten, bevestigde workflowstatussen en afsluitwaarschuwing.
Geen wijzigingen aan gegevens, opslagroutes, PDF-generatie of mailacties.

Uitgevoerd in V1.55: risicokaart, barrier/vloerconceptmeldingen, keuze-tooltip,
profielfoto en beheeropslag stil; showprofiel houdt tijdens opslag de bevestigde
workflowstatus en noemt een concept eenvoudig Concept. Tests: risicoanalyse,
maatregelen, showpagina, startup en build geslaagd. Chromium controleert
busy/completed/failed op desktop/mobiel, licht/donker: geen normale statusregel,
fout blijft zichtbaar. Alleen synthetische browserinvoer; geen productiewrites.
