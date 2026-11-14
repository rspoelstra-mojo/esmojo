# Native Rapportages-provider

Eigenaar huidige Codex-sessie. Branch task/reports-native-provider-20261114.
Vervolg op #172 en #173, vanaf actuele main 20dc385.
De geautoriseerde onafhankelijke validatie loopt; geen activering bij verschillen.
Volledige getypeerde Reports-lees/schrijflaag, private File-downloads, bestaande
CSV-ingestgrens, PDF/mail/openingshistorie en actuele rechten behouden.
Voorziene scope server/dataverse-reports, bestaande Reports-provider/API/worker-
routing en Apps Script-writerfence, tests en documentatie. Geen andere modules,
Auth of actieve Shows-schema's omschakelen. Geen testmails/fictieve bedrijfsdata.
Native provider blijft onbereikbaar tot bewezen dekking en gecontroleerde cutover.

Actuele publicatiescope van PR #174: diagnose van de technische validatiestart,
nadat run 43643466352 vóór een taakresultaat stopte. Uitsluitend gesloten HTTP-,
code- en faselabels, geen claims/tokens/providerbody; nieuwe protocolmarker en
dezelfde vaste main-trigger, geen bedrijfswrites of machtigingsverlenging.
De native provider en activering zijn nog niet geïmplementeerd. 41 gerichte
tests, build en diff-check slagen; volledige CI vóór samenvoegen controleren.
