# Incidentpagina: vaste dagstand rond Nederlandse middernacht

Eigenaar: huidige Codex-sessie. Branch: task/incident-midnight-snapshot-20261108.
Gebruiker vraagt uitsluitend nachtelijke actualisatie zodat openen snel gaat.
Sla een volledig berekende vertrouwelijke dagstand op in de bestaande Drive-root;
paginalezing doet alleen geautoriseerde snapshot-read, geen inventarisatie/herbouw.
Behoud dezelfde dagstand de hele Nederlandse kalenderdag en de vorige goede
stand bij fouten. Eenmalige initialisatie als er nog geen dagstand bestaat.
Bestaande bron-/rapportageworkflows blijven functioneren; incidentactualisatie
wordt afzonderlijk bij Nederlandse middernacht uitgevoerd, met zomer-/wintertijd.
