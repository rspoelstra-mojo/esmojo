# Schema-setup automatisch laten doorlopen
Eigenaar Codex; branch task/setup-auto-retry-20261112.
Gebruiker bevestigt: Artiest, Locatie, Concertreeks worden per herstart bevestigd.
Aanmaak/readback/publicatie kan nog bezig zijn als een request afloopt.
Gerichte langere tijdslimieten voor zware metadata-acties; bekende tijdelijke
uitkomsten in dezelfde stap automatisch controleren met begrensde wachttijd.
Conflicten, ontbrekende rechten en echte configuratiefouten blijven stoppen.
Geen extra schemawijzigingen buiten vaste contract/lege primaire-naamcorrectie.

Uitgevoerd: langere native termijnen (create 60s, Naam-PUT 45s, PublishXml 90s).
Bekende tijdelijke uitkomsten geven een veilige pending-respons; frontend herhaalt
uitsluitend dezelfde stap maximaal zes keer met oplopende, zichtbare wachttijd.
Retry-After wordt gerespecteerd; boven 300s stoppen. Echte afwijkingen en native
weigeringen blijven stoppen. Bestaande sleutelindexwachtrij blijft afzonderlijk.

Validatie: server-/retrytests, browsercontrole met tijdelijk pending + netwerkfout
zonder herstart, daarna conflictstop en actieve sleutelbevestiging; productiebuild,
beveiligingsheaders en diffcontrole. Native productie-uitvoering niet vanuit deze
runtime getest; gebruiker start de beschermde beheerknop zelf.
