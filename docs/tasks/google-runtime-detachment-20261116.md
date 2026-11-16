# Shows-regels en publicatie zonder Google

Eigenaar: deze Codex-uitvoering. Branch: task/google-runtime-detachment-20261116.

Gebruiker vraagt Shows-regels en publicatie volledig los te koppelen van Google Drive/Apps Script, zodat de externe ESMOJO-mappen en het script verwijderd kunnen worden. Port bestaande regels naar lokale native servercode met behoud van betekenis en paritytests; geen runtime-afhankelijkheid van google-apps-script-bestanden of Google-serviceobjecten. Verwijder Google-publicatieroute en deploymentbundling; sluit oude publicatietools af. Bewaar migratiebewijzen/originelen, huidige Dataverse-autoriteiten en Supabase Auth/MFA. Cryptografische sleutel met historische naam behouden: dat is geen Google-netwerkafhankelijkheid. Geen hervatting performanceoptimalisatie. Test/publiceer/verifieer met vaste native controles, zonder fictieve bedrijfsdata of mail. Verwijder externe Drive-mappen/script niet zelf; meld precies wanneer dat veilig kan en welke verificatiegrenzen overblijven.

Scope: server/dataverse-shows regels/runtime/tests, Google-publicatieworkflow/tools, Vercel includeFiles, relevante documentatie/taakregels en versie. Controleer aanvullend resterende actieve verwijzingen/archiefpaden.
