# Historische import: uitvoering en veilig hervatten

De gebruiker heeft op 8 november 2026 zelf Pro geactiveerd. De eerdere Hobby-
deploymentblokkade is vervallen; de geteste applicatiewijzigingen zijn gepubliceerd.
Dit document vervangt de eerdere instructie om op die limiet te wachten.

## Bevestigde uitvoering

- De oorspronkelijke tien steekproeven zijn gecorrigeerd, centraal geplaatst,
  native gevalideerd en teruggelezen: geslaagde run 42483195084.
- De goedgekeurde collectie bevat 199 concerten. Alle 199 zijn opgeslagen en
  native gevalideerd, zonder pending of ongeldige rapportages. Broncontexten en
  hashes komen overeen met de goedgekeurde private batch.
- CSV's staan centraal in private OnTrack. Bestaande steekproef-IDs zijn behouden;
  geen dubbele concerten en geen achtergebleven .historical-pending-bestanden.
- PR #141 herstelt oude directe rapportagelinks onafhankelijk van het beperkte
  45-dagenmenu en ondersteunt de twee afzonderlijke middag-/avondvoorstellingen.
  V1.92 en volgende versies bevatten die correctie.
- De productiepoort weigert ongeauthenticeerde rapport-/artiestshow-reads en
  ongetekende workerverzoeken. Er zijn geen historische mails of PDF-taken gestart.

De volledige terugleescontrole is geslaagd via run 42490071145 op 8 november
2026: 199 daadwerkelijk teruggelezen CSV's én ticketdocumenten bevestigd.
De collectie is daarmee volledig geïmporteerd en gecontroleerd.

## Onderbrekingen en hervatten

De eerste volledige run 42484034639 heeft alle concerten opgeslagen, maar stopte
later tijdens indexering met een generieke 503. De exacte achterliggende oorzaak
is niet bewezen. Een overlappende oudere indexrun 42484482352 bereikte aantoonbaar
de HTTP-timeout van 300 seconden. Een afzonderlijke opvolger is gecontroleerd
geannuleerd om met één volledige worker verder te gaan; dit wist geen importdata.

PR #142 begrenst iedere historische indexaanroep tot één batch van maximaal vijf
bronnen. De workflow herhaalt totdat alle geregistreerde bronnen gevalideerd zijn.
PR #144 geeft alleen aan de geauthenticeerde historische worker vaste, veilige
foutcodes en fasen door; geen providerrespons, credentials of broninhoud in logs.
Historische import en losse historische indexering hebben eigen concurrency-
groepen. Start ze niet tegelijk voor dezelfde collectie; normale mailverwerking
blijft onafhankelijk.

Bij een toekomstige onderbreking:

1. Lees AGENTS.md, docs/samenwerken.md en docs/historical-report-import.md; fetch
   actuele main en controleer open PR's. Bewaar andermans werk en force-push niet.
2. Controleer succesvolle Vercel-productie en de bestaande Apps Script-publicatie
   van de actuele bron. Preview met andere secrets is geen productiebevestiging.
3. Analyseer eerst de veilige HTTP-status, foutcode en fase. Herhaal niet blind.
4. Hervat na analyse de bestaande Index web reports-workflow op main met
   historical_import=all en historical_batch=historical-reviewed-20261108.json.
   De reeds bevestigde concerten worden overgeslagen; dezelfde IDs blijven gelden.
5. Vereis 199 compleet, 199 native gevalideerd, nul ongeldig/pending en 199
   daadwerkelijk teruggelezen bronnen/ticketdocumenten. Gebruik geen losse
   CSV-upload of mailworker als importalternatief.

Private batch, bron-IDs, hashes, incidentinhoud, ticketcijfers en audit blijven
buiten Git en CI-logs. Maak geen nieuwe batch uit oude Git-history. Gebruik bij
werkelijke bronconflicten de goedgekeurde private bron/review en de bestaande audit.

## Weergavecontrole

De bestaande rapportweergave is behouden. Lokale browsercontroles met voorbereide
ESMOJO-testgegevens slagen voor de tien oorspronkelijke concerten en middag/avond
op desktop en mobiel in licht/donker (48 gevallen), plus directe oude links,
keuzehint en dezelfde-dagselectie (12 gevallen). Dit zijn geen ingelogde productie-
browsercontroles. De beveiligde productie-worker leest de werkelijke opgeslagen
CSV's en de bestaande kaartverkoopprojectie terug zonder concertgegevens te wijzigen.
