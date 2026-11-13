# Snelle volledige Shows-opening

Eigenaar: huidige Codex-sessie. Branch task/shows-one-second-20261113.
Doel: volledige show inclusief alle tabbladen en snel beschikbare openbare foto
binnen één seconde bruikbaar; meetbare eerste en herhaalde navigatie. Geen lazy
functionele tabbladen, extra datamigratie, bronwijzigingen, mails of zwakkere rechten.
Scope: native Shows-leespad/metadata/requestdeduplicatie, complete versiegebonden
bundel, foto-CDN/prefetch uitsluitend openbare data, frontend show-opening en
privacyveilige timings/tests. Accounts/Auth behouden actuele beveiligde bron.
Verwachte diensten: bestaande Vercel/Dataverse/GitHub; geen nieuwe credentials.
Privécontext uitsluitend bestaand tijdelijk sessiegeheugen; geen persistente
privébrowsercache en geen persoons-/inhoud-/tokenlogs. Maak geen fictieve shows.

Implementatie: versleutelde gecomprimeerde afgeleide opening in bestaande Dataverse
Integratiestatus, actuele rijversiebatch/veldleases, geen accountcache, gezamenlijke
technische sessie/metadata, alle tabbladen gereed, één WebP-variant/intent-prefetch.
Vaste production-only main/OIDC performanceworkflow voor voorbereiding en meting.
Vercel-functie momenteel iad1 vastgesteld; Dataverse-regio eerst vaststellen, geen
regiowijziging op basis van een onbevestigde aanname. V1.100 volgt V1.99.

Accounts.gs: optionele beperkte self-response voor show-open, met dezelfde actuele
Drive-register-, MFA- en rollencontrole; avatar weglaten, niets cachen of migreren.
De bestaande Apps Script-mainpublicatie/readback apart van Vercel verifiëren.
