# Beveiligingscijfers als incidentfilter

Eigenaar Codex, branch task/report-security-drilldown-20261104. Gebruiker vraagt
uitzettingen, fysieke/verbale agressie en aanhoudingen aanklikbaar om de bijbehorende
individuele incidenten te tonen. Eén actieve filter met duidelijke status en reset;
opnieuw klikken wist de filter. Tellingen en grafieken blijven volledig.
Gebruik exact bestaande broncriteria: type bevat verbale/fysieke; Resolved Status
bevat eviction/arrest. Uitkomstcijfers tellen personen, de lijst incidenten.
Actieve selectie doorzoekt alle incidenten zodat eerder verborgen zelfzorg geen
bijbehorende gebeurtenis verstopt; terug naar default herstelt het bestaande filter.
Geen datawijziging/opslag, geen nieuwe gegevenssoort: alleen afgeleide kenmerken
van reeds geclassificeerde CSV-inhoud. Rapportages/MFA blijft intact.
Scope gedeelde criteria, bestaande rekenlaag zonder resultaatwijziging, web-DTo,
weergave/CSS/tests/docs en V1.35. Publiceren via normale PR/main-flow.


Aanvullende gebruikersscope: filterbediening naast Individuele incidenten. Header
met één datumtab per werkelijke showdatum, gedeelde Show-tabstijlen, locatie zonder
dubbele datum en titel bovenaan uitgelijnd met foto. Header wordt niet hoger.
Per-dag rapportpaneel reset filters; ontbrekend dagrapport nooit dupliceren of
fingeren. Bestaande enkele Jungle-bron blijft ongewijzigd; automatische koppeling
van nieuwe CSV's is geen onderdeel van deze presentatieaanpassing.

Rapportages-submenu hergebruikt exact Shows-klassen en titelzoekfunctie. Alleen de
beschikbare rapportcatalogus, Nederlandse kalenderdagen, vandaag t/m 7 dagen oud
onder Afgelopen week, vanaf 8 dagen onder Afgelopen periode. Beide groepen nieuwste
eerst; bij meerdere beschikbare datums van één reeks telt de recentste datum.
Geen toekomstige Shows-agenda of andere locaties in het gewone Shows-menu erbij.

Controles: bestaande bron lokaal doorgerekend, KPI- en filteruitkomsten vergeleken
zonder productie-inhoud in Git. Synthetische test met
3 personen in 1 standaard verborgen record controleert de afwijkende eenheden.
Criteria-, webprojectie-, weergave-, rapportmenu-, router-, showpagina- en
bestaande OnTrack data/PDF/servicetests geslaagd; module/API-controles behouden.
Chromium: licht/donker op 700, 900, 1280, 1440, 1920, 2560 px, vier filters via
KPI/dropdown, reset, lege resultaten, XSS-tekstveiligheid, fout/herlaadstatus en
late reactie. Datumtab, echte wisseling tussen twee dagdatasets, toetsenbord,
ontbrekend derde rapport, filterreset en bovenuitlijning gecontroleerd.
Headerhoogte met foto vergeleken met meting vóór wijziging: nergens groter.
Visueel licht/donker gecontroleerd; geen horizontale overflow of schaallettertypes.
Geen echte e-mail, Drive-write of productiecron aangeroepen. Private bron en
browserscreenshots uitsluitend buiten Git in de lokale werkmap.
