# Incidentpagina: vaste dagstand rond Nederlandse middernacht

Eigenaar: huidige Codex-sessie. Branch: task/incident-midnight-snapshot-20261108.
Gebruiker vraagt uitsluitend nachtelijke actualisatie zodat openen snel gaat.
Sla een volledig berekende vertrouwelijke dagstand op in de bestaande Drive-root;
paginalezing doet alleen geautoriseerde snapshot-read, geen inventarisatie/herbouw.
Behoud dezelfde dagstand de hele Nederlandse kalenderdag en de vorige goede
stand bij fouten. Eenmalige initialisatie als er nog geen dagstand bestaat.
Bestaande bron-/rapportageworkflows blijven functioneren; incidentactualisatie
wordt afzonderlijk bij Nederlandse middernacht uitgevoerd, met zomer-/wintertijd.

Implementatie: atomair dagstandregister in Drive, één geautoriseerde read bij
openen, geen inventarisatie/polling. De bestaande vijfminutenrapportageworkflow
blijft intact zonder incidentherberekening; aparte UTC-rondes volgen Nederlandse
middernacht inclusief zomertijd. Dagvergrendeling en oude complete stand bij fouten.
De vorige productiewerker 42504819214 is volledig geslaagd (22m33s), inclusief
INCIDENT_REFERENCE_COMPLETE; die bestaande complete cache initialiseert de eerste
stand. Websiteversielabel blijft op V1.99: de bestaande afspraak verbiedt een
ongevraagde overgang naar V2.0; geen blokkade voor deze gevraagde functionele wijziging.

Verificatie: volledige set 664 tests slaagt; aanvullende tests bewaken winter-/
zomertijd en omschakeldagen, ongewijzigde dagstand bij herhaalde publicatie,
vorige complete cijfers bij fouten, decimalen en precies één snapshot-read.
Echte Chrome-controle slaagt: geen polling of herberekening tijdens de dag,
heropenen behoudt dezelfde cijfers, nieuwe opgeslagen dagstand verschijnt bij
volgende opening. Apps Script-syntax (53 bestanden) en productiebuild slagen.
