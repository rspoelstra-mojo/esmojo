# Dezelfde achtergrondfoto op alle pagina's met een achtergrond

Eigenaar: Claude Code. Branch: task/claude-login-background-all-pages-20261117.

Gebruiker vraagt dat de via Beheerder / Instellingen ingestelde loginachtergrond ook geldt voor alle andere pagina's die nu een achtergrondfoto gebruiken: de overige authenticatieschermen (2-stapsverificatie instellen/QR/code, wachtwoord kiezen, activeren, niet beschikbaar) en de externe Showbeheer-pagina. Dit vervangt voor Showbeheer de oude regel dat de aparte zaal-/Showbeheer-achtergrond ongewijzigd blijft.

Scope: src/auth.js, src/accounts.css, src/show-management*.js/css, bestaande lib/login-background.js hergebruiken, tests/docs. Geen schema-, opslag- of API-wijziging: dezelfde openbare GET /api/login-background, dezelfde uitsnede/blur. Login/Auth/MFA wachten nooit op de optionele achtergrondread. Geen nieuwe instellingen.
