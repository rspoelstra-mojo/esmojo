# Medische KPI's als incidentfilter

Eigenaar Codex, branch task/report-medical-drilldown-20261104.
Gebruiker vraagt dezelfde drilldown als Beveiliging voor Behandelingen, Zelfzorg,
Onwelwordingen en Ambulancetransporten. Alle filters gebruiken exact de bestaande
KPI-criteria, inclusief afdeling Medisch waar toepasselijk en personen i.p.v.
records bij ambulance. Expliciete filters tonen ook standaard verborgen zelfzorg.
Zelfde knoprijen en hoogte voor Medisch en Beveiliging, beide thema's/responsief.
Geen verandering van tellingen, PDF, bronbestanden, opslag, rechten of mailflows.
Scope shared criteria, rekenlaag/projectie, webweergave/tests/docs en V1.36.
Publiceren via bestaande PR/main/Vercel-flow na passende controles.


Implementatie: shared/report-medical.js deelt bestaande telcriteria met de
rekenlaag en de minimale webprojectie. medicalFilters naast securityFilters,
generieke data-report-filter voor dezelfde knopcomponent en dropdown. Bij
ambulance verschil tussen personen en bronrecords zichtbaar toegelicht. Er is
geen CSS-uitzondering nodig: identieke vier knoprijen geven gelijke hoogte,
ook onder elkaar op smalle schermen; bestaande grid blijft gelijk.

Controle: medische criteria (afdeling, exacte bestaande zoekvelden, overlappende
selecties, ambulance over afdelingen), webprojectie, lijstfilter/reset, bestaande
OnTrack data/PDF/service en account/moduletests. Volledige rapportberekening op
aangeleverde CSV exact gelijk aan oorspronkelijke rekenlaag. Geen echte brondata
in Git. Chromium: alle acht filters via cijfers en dropdown, nulresultaat/reset,
zelfzorg alsnog zichtbaar, ambulance met meerdere personen per record, datumtabs,
XSS/fout/late reactie. Gelijke hoogte én relatieve rijposities gemeten in licht en
donker op 700/900/1280/1440/1920/2560 px; geen horizontale overflow. Visueel
gecontroleerd. Geen Drive-writes, echte mails of cronacties.

Aanvullend verzoek: prioriteit in de individuele webincidenten in het Nederlands:
Low=Laag, Medium=Midden, High=Hoog, Critical=Kritisch, hoofdletterongevoelig.
Alleen presentatielabel; originele waarde, KPI's, PDF en rode markering blijven.
Onbekende waarden leesbaar behouden, ontbrekend als Niet opgegeven. Unit- en
browsercontrole voor alle vier labels en bestaande roodmarkering.
