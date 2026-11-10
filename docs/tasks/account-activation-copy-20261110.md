# Accountactivering kopiëren
Eigenaar huidige Codex-sessie; branch task/account-activation-copy-20261110.
Gebruiker vraagt kopieericoon bij Acties in accountsmenu. Hergebruik de bestaande
admin/MFA-toegang en Supabase generateLink voor uitsluitend ongeactiveerde,
niet-geblokkeerde doelaccounts. Aparte activation-link actie verzendt geen mail;
geheim uitsluitend response/browsergeheugen en expliciet gebruikersklembord,
nooit Drive/Redis/browseropslag/logs. Token blijft in URL-fragment. Bestaande
opnieuw-uitnodigenmail blijft apart. Clipboardfallback biedt tijdelijk handmatig
kopiëren zonder geheim op te slaan. Bestaande accountaanmaak/activering behouden.
Versie blijft V1.99. Controles: autorisatie, doelvalidatie, geen mail, invite/recovery,
clipboard en foutafhandeling plus bestaande accountregressies/build.
