# Concertplanning op Overzicht

Eigenaar Codex, branch task/show-overview-planning-20261103. Gebruiker vraagt de
vijfstappenplanning volgens screenshot op Overzicht van ieder gewoon concert.
Deadlines -31/-14/-7/-1/0 kalenderdagen ten opzichte van vroegste showdatum,
Nederlandse datums en vandaag Europe/Amsterdam, light/dark en fluid responsive.
Showprofiel afgerond uitsluitend bij beschikbare PDF; productionele stap alleen
bij alle toepasselijke onderdelen afgerond (NVT uitsluiten). Operationele risico’s
en beheersmaatregelen voorlopig zichtbaar maar nooit afgerond simuleren.
Geen nieuwe writes/statusdatabase, automatische afvinkknoppen of mailmomenten.
Hergebruik showgeheugen, bestaande gegevens en thema. Bestanden showplanning-module,
CSS, pure planningslogica/tests, show-page/show-data en bijbehorende tests,
CI, projectafspraken en websiteversie V1.28. Publiceren via normale main-workflow.

Geïmplementeerd: src/lib/show-planning.js berekent vijf kalenderdeadlines en
gebruikt uitsluitend bevestigde PDF-/productiestatussen. De aparte DOM/CSS-module
bouwt de tijdlijn, datumlabels, afgeronde markers, vandaag en de volgende/openstaande
deadline. Showcontext levert een kleine gekopieerde statussnapshot en abonnement;
geen extra API-reads of opslag. Status wordt ongeldig bij fouten/wijzigingen en
komt bij bevestiging terug. Losse productiegegevens blijven bruikbaar wanneer
alleen het showprofiel wijzigt. Timer ververst vandaag en wordt bij verlaten gewist.

Controles: vijf planningslogica-tests, twaalf showgeheugentests, drie showpaginatests,
zes show-open-tests en vier fluid-preview-tests geslaagd; build en diffcontrole.
Kalendergrenzen, schrikkeljaar, zomer-/wintertijd, ongesorteerde reeksdatums,
PDF-actualiteit, NVT/nee en onvolledige beoordelingen, onveranderbare snapshots,
statusmeldingen, foutafhandeling en hergebruik van productiegegevens gecontroleerd.
Synthetische Chromium-preview licht/donker op 700/900/1280/1440/1920/2560px:
geen overflow, vijf desktopkolommen, smalle verticale weergave, vaste lettergrootte,
statusupdate en opruimen gecontroleerd. Lichte/donkere 1920px-screenshots bekeken.
Geen productiegegevens gewijzigd of e-mails verzonden tijdens ontwikkeling.
