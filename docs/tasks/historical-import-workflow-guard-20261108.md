# Historische import: controle op uitgerolde API-versie

Eigenaar: huidige Codex-sessie. Branch: task/historical-import-workflow-guard-20261108.
Vervolg op de geautoriseerde historische import. Alleen web-reports.yml: weiger een
oude API-response zonder importtellers, zodat een nog niet uitgerolde backend nooit
tot een importlus met normale rapportverwerking leidt. Geen nieuwe gegevens of
productiecredentials. Apps Script is bijgewerkt; Vercel-uitrol wacht op providerquota.
