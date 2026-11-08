# Historische import hervatten na Vercel-limiet

Status 8 november 2026: gebruiker kiest uitdrukkelijk Hobby behouden en later
hervatten. Geen betaald abonnement activeren. Geen blinde deploymentherhalingen.

- PR #137 is samengevoegd op main: 06371969a0b6700ab0d83596198cf008b4b48a6d.
  Alle applicatie-/databasecontroles en de preview van de geteste bron slagen.
- Apps Script-publicatie 42482027660 is geslaagd, op de bestaande deployment.
- Vercel weigert productie met ‘Deployment rate limited — retry in 24 hours’.
  esmojo.nl toonde bij controle nog V1.90. De beoogde frontendversie is V1.91.
- PR #138 bevat een extra workflowguard tegen een nog oude backendresponse.
  Applicatie-/database-CI slaagt; Vercel-preview wordt door hetzelfde quota geweigerd.
  Deze PR staat klaar voor beoordeling/integratie vóór import. Hij wijzigt geen appcode.
- Er zijn nog steeds uitsluitend de oorspronkelijke tien historische proefconcerten.
  De correctie/verplaatsing van deze tien en de overige import zijn NIET gestart.
- De private, opgeschoonde batch staat al in Productie onder de technische naam
  historical-reviewed-20261108.json. Geen source-IDs/hashes/incidentinhoud in Git.
  Bestandsmetadata is op private sharing en de bestaande Productie-parent gecontroleerd.

De opgeschoonde collectie is voorbereid en op de native import/rapportagecode
gecontroleerd: 199 concerten, 6.325 incidentregistraties; 1.658 Schoonmaak-rijen
weggelaten. Geen concert houdt nul incidenten over. Alle ticketvelden en alle
rapporten zijn in een geïsoleerde volledige proef teruggelezen. 48 browsergevallen
(tien oorspronkelijke steekproefconcerten plus middag/avond × twee schermbreedtes
× licht/donker) slagen. Dit zijn controles met lokale bestanden/fixtures, GEEN
bewijs dat de collectie al live is geïmporteerd.

## Volgorde bij hervatten

1. Lees AGENTS.md, docs/samenwerken.md en docs/historical-report-import.md; fetch
   actuele main en controleer open PR's. Bewaar andermans werk en force-push niet.
2. Integreer na vereiste controles de workflowguard uit #138 als die nog openstaat.
   Publiceer actuele main zodra Vercel capaciteit toestaat. Gebruik Production-
   instellingen, geen ongecontroleerde promotie van Preview met andere secrets/flags.
3. Bevestig Vercel-production, daadwerkelijk V1.91 (of latere compatibele versie)
   en een succesvolle Apps Script-publicatie vanaf dezelfde actuele main. Een
   Apps Script-succes alleen bevestigt de Vercel-API niet.
4. Dispatch bestaande Index web reports/web-reports.yml op main met
   historical_import=sample en historical_batch=historical-reviewed-20261108.json.
   Dit corrigeert/verplaatst dezelfde tien bronnen idempotent, zonder mails/PDF.
   Workflow valideert/indexeert en leest CSV's en ticketprojectie terug. Vereis
   een succesvolle volledige bevestiging voordat je verdergaat.
5. Dispatch dezelfde workflow met historical_import=all en dezelfde batchnaam.
   Bestaande tien worden niet gedupliceerd; de overige concerten worden toegevoegd.
   Vereis 199 compleet, 199 native gevalideerd, nul ongeldig en 199 teruggelezen.
6. Controleer met een bevoegd ingelogd account de artiestshow/kaartverkoop, Bouke,
   geen Schoonmaak, afzonderlijke middag/avond en het 45-dagenmenu. Geen concertdata
   aanpassen voor tests. Geen productiecredentials in Codex of chat laten delen.

Bij een fout: analyseer veilige diagnose en stage; hervat exact dezelfde batch.
Geen CSV's los in OnTrack uploaden en geen mailworker als importalternatief gebruiken.
Bij een ontbrekende/gewijzigde batch niet opnieuw samenstellen uit oude Git-history:
gebruik de door de gebruiker goedgekeurde private bron/review en de controleerbare audit.
