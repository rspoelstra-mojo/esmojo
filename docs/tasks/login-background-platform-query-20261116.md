# Openbare inlogachtergrond via Vercel-toegangslink

Eigenaar: deze Codex-uitvoering. Branch: task/login-background-platform-query-20261116.

Nacontrole van PR203: V1.143 live READY, HTML200 en beheerroutes401. De gekoppelde Vercel-fetch gebruikt een tijdelijke platformtoegangslink; de strikte querycontrole van de openbare achtergrondroute weigert de bijbehorende platformparameter. Negeer uitsluitend gereserveerde _vercel_-parameters bij deze reeds openbare read. Geen wijziging van Supabase/MFA, beheertoegang, datadoelen of native bestandsselectie. Onbekende applicatievelden blijven geweigerd.

Bestanden: server/website-settings.js, server/website-settings.test.js, documentatie en versienummer. Test en publiceer; nieuwe Dataverse-tabel blijft uitsluitend via expliciete beheerklik aangemaakt.
