# Showplanning in drie stappen op de showpagina

Eigenaar: Claude Code. Branch: task/claude-planning-three-steps-20261117.

Besluiten gebruiker (17 november 2026): de planning van een show wordt drie stappen, gerekend vanaf de eerste concertdatum van de reeks (of het enige concert): 30 dagen ervoor Showprofiel verzonden, 7 dagen ervoor Risico's beoordeeld, 1 dag ervoor Beheersmaatregelen afgerond. Alleen de showpagina; de homepage wordt later verbouwd en blijft ongewijzigd (shared/home-planning.js blijft op showPlanning). Planningblok op de showpagina wordt een visueel blokje op halve breedte, met zichtbare status en voortgangspositie.

Showprofiel verzonden: expliciet gekozen is een geregistreerde verzending. Classificatie Vertrouwelijk (gebruiker). Opslag uitsluitend in Dataverse via bestaand TechnischeStatus-patroon (domeingescheiden receipt, CAS, volledige readback), per reeks en per huidige PDF-revisie; geen nieuw schema, geen browseropslag/logs. Alleen Gashouder (Showbeheer-route): klik op Showbeheer verzenden door een ingelogde gebruiker met actuele Shows-rechten registreert; andere zalen blijven open tot daar een verzendroute bestaat. Mailto kan het echte verzenden niet bevestigen; de registratie betekent dat de verzendknop is gebruikt.

Verwachte bestanden: src/lib/show-planning.js (nieuw showpagina-model), src/show-planning.js/.css, src/show-management.js, src/lib/show-data.js, server/show-management.js, server/dataverse-shows/management-sharing.js, server/accounts-api.js, tests/docs. Geen homepage-, Auth-, schema- of mailwijziging.
