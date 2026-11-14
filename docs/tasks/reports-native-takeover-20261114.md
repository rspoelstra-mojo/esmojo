# Native Rapportages en gecontroleerde activering

Eigenaar: huidige Codex-sessie. Branch: task/reports-native-takeover-20261114.
Basis: main 1df6184e496e93f0e9626fd8bff70bee081710eb.
Gebruiker bevestigt dat de andere uitvoering is gestopt; oude taakbranch blijft intact.

Scope: volledige Reports-lees/schrijflaag op getypeerd Dataverse-schema en File,
bestaande CSV17/parser/UI/versies/PDF/mail/ontvangers/openingen behouden;
actuele bron/doel/File-validatie, schrijfblokkade, conditionele activering en
onafhankelijke controle. Geen andere module/Auth omschakelen, testmails of
fictieve bedrijfsrecords. Bestaande main/OIDC, leases/ETag/generaties en vaste
machtigingsduur behouden. Geen stille Drive-fallback na activering.

Verwachte bestanden/diensten: server Reports-runtime, migratie-/achtergrondtaken,
API/providerrouter, Apps Script-integratiegrens, workflows, tests en documentatie.
GitHub en Vercel via bestaande zakelijke verbindingen; toegang per dienst controleren.
