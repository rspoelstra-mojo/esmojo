# Begrens historische validatie per serververzoek

Eigenaar: huidige Codex-sessie. Branch: task/historical-validation-request-budget-20261108.
De live overlappende validatierun 42484482352 stopte na een lang HTTP-verzoek;
de collectie-import 42484034639 loopt door. Geen ongeldige rapporten gemeld.
Begrens historicalOnly op één bestaande scanbatch per aanroep in plaats van drie.
De workflow herhaalt gecontroleerd tot alle bronnen bevestigd zijn; native validatie,
rechten, bronhashes, mailonderdrukking, CSV's en normale verwerking blijven gelijk.
Verwachte bestanden: api/web-reports-sync.js en gerichte regressietest.
