# Resterende bedrijfsopslag native maken

Eigenaar: huidige Codex-uitvoering. Branch task/accounts-native-completion-20261115.
Gebruiker keurt op 15 november 2026 uitvoering van het besproken plan goed:
accountprofielen, medewerkersfoto's, rollen en instellingen naar Dataverse;
Supabase Auth (login/wachtwoord/MFA/sessies) blijft behouden. Alle actieve restpaden
inventariseren, bestaande IDs/relaties/schermen behouden, onafhankelijke kopiecontrole,
geteste runtime en gecontroleerde activering. Originelen behouden, geen testmails
of fictieve productieaccounts/concerten. Geen oude taakdelegaties verlengen.

Verwachte scope: account-profiles/account-access, native Medewerker/Document en
Integratiestatus, beveiligde achtergrondtaak/setup indien nodig, Apps Script-fence,
accounts-API en bestaande beheerpagina, tests/CI/docs/publicatie. Ook resterende
Google-afhankelijkheden en Supabase-bedrijfsopslag controleren. Technische sleutels
niet verwijderen zolang bestaande ciphertext daarvan afhankelijk is. Registratie
vóór implementatie; externe activering en bewijs afzonderlijk rapporteren.

Implementatie: bestaande Medewerker/Modulerecht + ACL in één conditionele changeset,
private Document File-avatar met medewerkerlookup, versleutelde profielpointer en
vaste superbeheerder/testmailinstellingen. Geen nieuw schema. Nieuwe begrensde
account-native-v1 beheeropdracht met bronfence, elf minuten uitlopen, volledige
vergelijking en conditionele autoriteit; geen hergebruik oude delegaties.

Lokale controles: 890 bestaande tests geslaagd/één bestaande skip, 37 gerichte
account/sourcefence-tests, 56 taak-/ACL-/tokencontroles, Apps Script 54 ES2020-bronnen,
11 publicatietests en build geslaagd. Datatransitie-browsercontrole inclusief
mobiel/hervatten geslaagd. Geen testmails of fictieve productiegegevens.
Browsercontrole vindt geen ingelogde sessie; activering vereist een actuele
MFA-beheerder die de nieuwe opdracht start. Publicatie is nog geen activering.
