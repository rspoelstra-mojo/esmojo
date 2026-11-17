# Eigen risico: maatregelen zichtbaar bij Maatregelen

Eigenaar: Claude Code. Branch: task/claude-own-risk-measures-20261117. Probleem: na opslaan van een eigen risico verwerkte het
gedeelde showgeheugen (src/lib/show-data.js) het antwoord niet, waardoor planning/Maatregelen/Actielijst het risico pas na
herladen zagen. Fix: actie operational-risk-own bijwerken zoals operational-risk, en stille herpoging toestaan (idempotent
per requestId). Versie V1.181.
