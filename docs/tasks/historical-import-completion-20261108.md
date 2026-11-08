# Afronden historische rapportage-import

Eigenaar: huidige Codex-sessie. Branch: task/historical-import-completion-20261108.
De gebruiker heeft Pro geactiveerd en hervatten geautoriseerd. Vervolg op #137/#138:
controleer productie en Apps Script, corrigeer eerst dezelfde tien proefconcerten,
lees de resultaten terug en importeer daarna de goedgekeurde collectie. Drive-
mutaties alleen via de bestaande OIDC-/Apps Script-route, zonder historische mails,
PDF-, AI- of voorbereidingstaken. Broninhoud, cijfers en private IDs blijven buiten
Git. Verwachte repositorywijzigingen: uitsluitend de geverifieerde afrondstatus en
hervatdocumentatie; eventuele reparatie pas na concrete runtime-diagnose.

De live steekproef is geslaagd (workflow 42483195084): tien compleet, tien native
gevalideerd, nul ongeldig en tien teruggelezen. De gemeten duur vraagt voor de
volledige collectie een langere runner-timeout. Uitsluitend historische import/
indexering krijgt 180 minuten; gewone verwerking behoudt zeven minuten. De
serververzoeklimieten, autorisatie en batchgrootte blijven gelijk.
