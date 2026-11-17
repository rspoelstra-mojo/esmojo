# Diagnose DATAVERSE_SHOWS_CONFLICT bij risico's

Eigenaar: Claude Code. Branch: task/claude-conflict-diagnose-20261117. Na V1.184/185 faalt in productie het bewerken en beoordelen van risico's
en zelfs het lezen van het risico-overzicht met DATAVERSE_SHOWS_CONFLICT. Deze stap voegt aan de bestaande foutcode-log uitsluitend de
tabelnaam en de afwijkende kolomnamen met een vaste reden toe (nooit waarden of sleutels), zodat de afwijkende rijen te zien zijn. Versie V1.188.
