# Vernieuwde incidentenweging artiestscore
Eigenaar huidige Codex-sessie; branch task/artist-risk-outliers-20261110.
Centrale gewichten beveiliging 25 / medisch 10, uitschieter19 bij 300% boven
referentie en zeven incidenten, zelfde formule vijf specifieke categorieën.
A=max25 gewogen basis; B=dominant plus overige specifieke reguliere punten,
geen total-bonus. Definitief min25 max(A,B). Medisch uitsluitend proportioneel.
Scenario H vervangt eerdere incident-only score: uitsluitend volledige score.
Nul/nul is nul; positief/nul is expliciet onbetrouwbaar, geen score. Bij gelijke
uitschieterbijdragen eerste categorie in vaste lijst. Referentie-/bezoekersbeleid,
TSC-broncijfers, dagstand en opslag blijven behouden; geen nieuwe databron.
Scope shared score/model, bestaande API/risicokaart, gerichte tests/docs.
Versie blijft V1.99 vanwege bestaande V2.0-grens. Publiceer na controles.

Uitwerking: centrale assessArtistRisk geeft score/betrouwbaarheid en metadata;
bestaande calculateArtistRisk blijft score/null. Exacte breukvergelijking voor
staffel/uitschieter, geen schermafronding. Gelijke dubbele rekenregistraties worden
verwijderd; tegenstrijdige duplicaten stoppen zonder Drive-bronnen te wijzigen.
Scenario's A–D + aanhoudingen: zelfstandig19; E physical+evictions=22,75; extra
categorie tot25; F één incident geen19; G medischmax10; H geen gedeeltelijke score.
Alle bestaande CI-Node-controles (100 commando's) slagen, plus scenario-/API-tests,
artiestbrowser (licht/donker390/1440), beheerbrowser en build. Geen wijziging van
opslag, referentiedagstand, TSC-bronwaarden of overige analyseberekeningen.
