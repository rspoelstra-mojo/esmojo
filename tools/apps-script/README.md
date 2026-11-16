# Google-publicatie afgesloten

De website publiceert uitsluitend via GitHub → Vercel. De Apps Script-workflow,
deploymentconfiguratie en clasp-dependencies zijn verwijderd. `deploy.mjs`
weigert altijd met INTEGRATION_RETIRED, ook bij een herstart van een oude workflow.

De .gs-bronnen en syntax-/regressietests zijn uitsluitend offline referentie voor
bewaarde migratiebewijzen en gelijkheidscontroles. Native Shows-regels staan in
server/dataverse-shows/rules/native.js; de runtime leest geen .gs-bestanden.
Verwijder de historische cryptografische sleutel GOOGLE_DRIVE_SHARED_SECRET niet:
Dataverse-ciphertext en bestaande mailbewijzen gebruiken nog dezelfde sleutel.
Zie docs/dataverse/google-detachment.md voor de verwijdervoorwaarden voor Google.
