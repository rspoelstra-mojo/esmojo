# Automatische bezoekersbasis en CSV-volledigheid

Eigenaar: huidige Codex-sessie. Branch: task/incident-auto-attendance-20261108.
Gebruiker vervangt de handmatige bevestigingen expliciet door automatische regels:
nieuwe concerten 97,5% van verkochte tickets; historische CSV-concerten vóór
2026-11-01 gebruiken het historische verkoopaantal als bezoekersaantal; een CSV
maakt beide registraties volledig. Vertrouwelijke classificatie blijft gelijk.
Geen verkoopbron overschrijven. Bronvalidatie en concertidentiteit blijven vereist.
Scope: incidentprojectie, gedeelde bezoekersweging, beheerweergave en tests.

Implementatie: historische importmetadata levert vóór de grensdatum de 1:1-basis;
nieuwe dagverkoop levert exact 39/40. Gehele rekeneenheden voorkomen afronding in
frequenties en klassegrenzen. Ontbrekende verkoop blijft onbekend; CSV-volledigheid
is automatisch, maar ongeldige bronnen tellen niet mee. Oude bevestigingen blijven
in Drive bewaard en zijn niet langer leidend. Beheerpagina is alleen-lezen.
De bestaande webworkflow heeft een afgeschermde herberekenfase, iedere vijf minuten
en na publicatie een herbouw tot gereed. Eigen concurrencygroep; geen mail/import
bij deze herbouw, geen privéaantallen of broninhoud in workflowresponses/logs.
Productieversie V1.97.

Verificatie: 657 bestaande en nieuwe CI-tests slagen, Apps Script-syntax (52
bestanden), productiebuild en echte Chrome-controle van automatische gegevens
zonder bevestigingsformulier. Eigen worker-alias voorkomt oude mailroute bij
publicatieraces; expliciete beleidsversie weigert oude handmatige projecties.
