# Historische rapportages en artiestencatalogus

Eigenaar huidige Codex-sessie; branch vanaf actuele main fa8dd33. Productierun
43698119384 lokaliseert de resterende fout: MENU_REPORT_CATALOG in de bestaande
openbare Artiesten-catalogus. Native Reports-bronnen en bestanden slagen.

Onderzoek/herstel de samenvoeging van openbare concertindexen: dubbele identieke
identiteiten met alleen verschillende actieve vlag mogen één catalogusitem zijn;
verschillen in zakelijke identiteit blijven een conflict. Voeg gesloten diagnose
en regressie toe, publiceer dezelfde Google-deployment en hervat read-only smoke.
Geen gegevensreparatie, andere modulemigratie, mails of extra machtiging.
Registratie vóór implementatie.

Een ontbrekende optionele reeks-ID in één index mag de bestaande unieke reeks-ID
uit de andere index behouden. Twee verschillende aanwezige reeks-ID's blijven een
conflict; geen business-records of relaties worden geschreven.
