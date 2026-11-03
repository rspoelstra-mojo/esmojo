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
