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

Aanvullend verzoek vóór publicatie: showrapportagemail krijgt uitsluitend
Showrapportage als zichtbare header; onderwerp blijft artiest en showdatum houden.
Raakt template/OnTrack-mailversie en tests. Bestaande onzekere herpogingen behouden
de oude header voor identieke inhoud op dezelfde idempotentiesleutel. Nieuwe mails
gebruiken een nieuwe vastgelegde templateversie; geen echte testmails versturen.

Mailvalidatie: bestaande emailtests, OnTrack-service/signed Drive-tests en Apps
Script-tests slagen; browserpreviews 320/390/640/1024px, zonder echte verzending.
