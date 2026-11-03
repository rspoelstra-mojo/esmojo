# Herbruikbaar blok Risico beoordeling

Eigenaar: Codex, deze chat. Branch: task/risk-review-card-20261103.

Nieuw herbruikbaar beoordelingsblok uitsluitend rechts van Barrieropstelling,
met dezelfde breedte als de bestaande Showprofiel-zijkaart. Titel Risico beoordeling,
vier gekleurde keuzes in twee kolommen; Geen risico verplicht Toelichting,
Midden/Hoog verplicht Beheersmaatregel, Laag zonder tekstveld. Opslaan sluit aan op
bestaande barrierafronding en private Drive-opslag, inclusief servervalidatie,
revisiecontrole en idempotentie. Bestaande custom-ontwerptoelichting blijft apart.
Historische beoordelingen blijven leesbaar. Vloerdruk krijgt dit nieuwe blok niet.

Aanvullend: vervang de kleine Gashouder-tekst door een bestaande statusbadge
met grijze achtergrond en exact NVT bij Gashouder.

Verwachte bestanden: nieuwe UI-module/CSS, barrierpagina/layout, gedeelde validator
en gegenereerde Apps Script-kopie, barrieropslag/servervalidatie, risicokaartbadge,
relevante tests, documentatie en index.html (V1.16). Doorlopende live-toestemming
en bestaande classificatie voor beoordelingen/toelichtingen blijven gelden.

Uitgevoerd: herbruikbare UI-module en gescheiden layout, canonicalisatie van
riskNote op server/Apps Script, verplichte validatie en historische leesbaarheid.
Getest: bestaande productie-/show-tests plus nieuwe backendgevallen voor
lege/ongeldige tekst, Laag zonder tekst, opslag/trimmen/retry en historische
beoordelingen. Browser: exacte zijkaartbreedte op 1280/1440/1920/2560px, 2×2 kleuren,
alle risicoklassen, Opslaan/Bewerken/foutbehoud, eigen-ontwerpvereisten, light/dark,
smalle vensters zonder overflow, ongewijzigde Vloerdruk en de grijze Gashouder-badge.
