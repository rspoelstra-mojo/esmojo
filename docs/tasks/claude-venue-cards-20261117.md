# Showbeheer- en zaalkaart voor andere concertzalen

Eigenaar: Claude Code. Branch: task/claude-venue-cards-20261117 (bouwt voort op PR 233).

Gebruikersopdracht (17 november 2026): bij shows in andere zalen dan de Gashouder komt ook een blok Showbeheer met alleen, in lichtgrijs, "Nog niet beschikbaar voor deze locatie"; en bij andere concertzalen komt exact zo'n blok als Gashouder, met de naam van de concertzaal. Alleen presentatie (createShowManagementPlaceholder in src/show-management.js, zaalnaam in show-management-view.js, show-page.js); geen verzoeken, opslag, rechten of schema. Showbeheer zelf blijft uitsluitend Gashouder.
