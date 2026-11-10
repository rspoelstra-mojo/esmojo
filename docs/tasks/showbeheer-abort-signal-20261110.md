# Herstel Showbeheer AbortSignal

Eigenaar: Codex, task/showbeheer-abort-signal-20261110.

Bij Showbeheer aanmaken kopieert de bestaande centrale opslagwrapper requestopties
met structuredClone, inclusief een niet-kopieerbaar browser-AbortSignal.
Scope: src/lib/save-retry.js en gerichte unit-/browserregressiecontrole.
Behoud annulering en onveranderlijke opslagsnapshots. Geen databasewijzigingen.
Websiteversie blijft V1.99; geen automatische hoofdversiesprong.
PR-API geblokkeerd; deze taakbranch dient als gedeelde registratie.

Fout eerst gereproduceerd in Chromium door de Showbeheer-controller door dezelfde
centrale opslagwrapper als productie te laten lopen. Na herstel slaagt dezelfde
browsercontrole. De wrapper kopieert uitsluitend de gegevens en behoudt het live
AbortSignal; na annuleren volgt geen herpoging. Acht opslagtests, volledige
bestaande Node-controles, Showbeheer-/artiest-/submenu-browsercontrole en build
slagen. Database/migratie en bestaande records blijven ongewijzigd.
