# Herstel Showbeheer AbortSignal

Eigenaar: Codex, task/showbeheer-abort-signal-20261110.

Bij Showbeheer aanmaken kopieert de bestaande centrale opslagwrapper requestopties
met structuredClone, inclusief een niet-kopieerbaar browser-AbortSignal.
Scope: src/lib/save-retry.js en gerichte unit-/browserregressiecontrole.
Behoud annulering en onveranderlijke opslagsnapshots. Geen databasewijzigingen.
Websiteversie blijft V1.99; geen automatische hoofdversiesprong.
PR-API geblokkeerd; deze taakbranch dient als gedeelde registratie.
