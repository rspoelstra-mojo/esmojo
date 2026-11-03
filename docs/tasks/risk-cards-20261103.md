# Risicokaarten en Entreeproces

Eigenaar: Codex, deze chat. Branch: task/risk-cards-20261103.

Vervang de overkoepelende kaart Productionele risico’s door afzonderlijke kaarten
Zaalindeling en Special effects in de bestaande fluid-layout. Voeg Entreeproces
als gewone knop met lege detailpagina toe onder Zaalindeling. Behoud beoordelingen,
Ja/Nee-keuzes en operationele risico’s. Geen nieuwe velden, opslag of API-contracten.
Verwachte bestanden: shared/production-risks.js, src/risk-analysis.js, betrokken
CSS indien nodig, bestaande paginatest en index.html (publicatieversie V1.13).

Uitgevoerd: losse bestaande kaartcomponenten per groep; Entreeproces gebruikt de
bestaande lege detailpagina met terugknop. Gecontroleerd: 6 bestaande paginatests,
productiebuild en browser op 1280/1440/1920/2560/700/390px; kaarttitels, klik/terug/
focus, bestaande Ja/Nee-logica en geen horizontale overflow.
