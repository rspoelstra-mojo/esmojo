# Diagnose mislukte risico-opslag

Eigenaar: Claude Code. Branch: task/claude-risk-diagnose-20261117. Probleem: in productie slaan Risico bewerken en Beoordelen niet op en de lijst
met operationele risico's verdwijnt daarna. Lokaal (ook met gegevens van de vorige versie) werkt het. Deze stap logt bij een mislukte
showbewerking uitsluitend de bewerking en een vaste foutcode (nooit inhoud of providerantwoord) en markeert risk-measure-export als
leesbewerking. Versie V1.186.
