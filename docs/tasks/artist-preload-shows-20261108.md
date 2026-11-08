# Historische showoverzichten vooraf laden

Eigenaar: huidige Codex-sessie. Branch: task/artist-preload-shows-20261108.
Laad alle klikbare historische concertdatums tijdens de eerste artiestlaadronde.
Daarna synchroon wisselen uit paginageheugen, zonder nieuwe API/Drive-aanvragen.
Maximaal drie bestaande geautoriseerde reads tegelijk; geen nieuwe backendroute,
opslag of rechten. Wis bij verlaten/sessie-/rechtenwissel. Vandaag/toekomst niet
vooraf laden. Fouten laten de laadronde mislukken met de bestaande herpoging;
geen gedeeltelijk gereed scherm of stil verzonnen ontbrekende gegevens.
GitHub-API niet beschikbaar; taakbranch dient als gedeelde registratie.
