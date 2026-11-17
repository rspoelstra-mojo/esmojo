# Herstel opslagconflict bij eigen risico's van vóór V1.183

Eigenaar: Claude Code. Branch: task/claude-conflict-fix-20261117. Oorzaak (uit de foutlog): tabel esmojo_operationeelrisico, kolom esmojo_omschrijving.
Eigen risico's van vóór V1.183 hebben geen aparte omschrijving en zijn zonder omschrijving opgeslagen; de koppeling (server/show-migration-map.js)
verwachtte sinds V1.183 de titel als omschrijving, waardoor de controle op elke bewerking en zelfs het lezen een conflict gaf. Herstel: geen verzonnen
omschrijving voor zulke risico's. Regressietest in server/dataverse-shows/service.test.js. Versie V1.189.
