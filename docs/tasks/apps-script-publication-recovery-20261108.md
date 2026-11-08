# Structureel herstel Apps Script-publicatie

Eigenaar: Codex. Branch: task/apps-script-publication-recovery-20261108.
Onderzoek mislukte run 42461478364 tegenover laatste geslaagde publicatie.
Herstel automatische publicatie op main met bestaande script-/deployment-ID en
webapp-URL. Maak foutdiagnose veilig en bruikbaar, controleer zakelijke toegang
en documenteer dezelfde bouw/test/publicatiestappen voor beide Codex-accounts.
Scope: publicatietooling, workflow, relevante Apps Script-bron indien de oorzaak
daar ligt, regressies en beheerhandleiding. Geen concertgegevens wijzigen;
geheimen blijven in bestaande secret stores. Geen force-push of oude branches.
