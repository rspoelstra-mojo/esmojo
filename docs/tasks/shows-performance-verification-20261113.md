# Productiemeting en volledige klikduur Shows

Eigenaar huidige Codex-sessie. Branch task/shows-performance-verification-20261113.
Vervolg op PR155. Leesbundels voorbereiden en native productietijden controleren.
Maak de browserklikmeting ook voor directe URLs inclusief de eerste contextaanvraag,
voordat de showcomponent wordt opgebouwd; geen ondertelling van metadata/wachttijd.
Verwerk alleen aangetoonde meet-/protocolproblemen. Geen extra migraties, nieuwe
rechtenbron, fictieve concerten of geheime/inhoudelijke loggegevens. De bestaande
MFA/actuele rechten blijven behouden. Verwachte bestanden frontendmeting en
zo nodig gerichte serverdiagnostiek/documentatie. Publicatie volgt reguliere PR/CI.

## Uitgebreide, expliciet goedgekeurde scope
Gebruiker autoriseert uitsluitend accountstatus en modulerechten als actuele
Dataverse-bron. Rollen/profiel blijven Drive; login/TOTP blijft Supabase. Hergebruik
bestaande Integratiestatus/Opdracht, geen nieuwe metadata nodig. Beheerkaart met
bewuste éénknopsstart, controle en voortgang. Duurzame adapter met schrijfstop,
uitlopen oude verzoeken, exacte bron/doelvergelijking en bronprotocolblokkade.
Alle actuele API-/MFA-/modulechecks behouden; nooit terugvallen na activering.
