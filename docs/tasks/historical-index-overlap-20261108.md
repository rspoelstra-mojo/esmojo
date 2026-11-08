# Historische validatie tijdens import

Eigenaar: huidige Codex-sessie. Branch: task/historical-index-overlap-20261108.
De goedgekeurde volledige import loopt via run 42484034639. Geef de bestaande
historical_only-indexering een eigen workflowconcurrencygroep, zodat validatie van
reeds complete historische bronnen tijdens de import kan meelopen zonder de
normale rapport-/mailworkflow op te houden. Geen nieuwe routes, data, validatie-
regels of websitewijzigingen. Webcommits blijven onder de bestaande gedeelde
UserLock, bronnen onder hun vaste hash/parentcontroles. Eindcontrole blijft verplicht.
