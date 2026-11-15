# Redis vervangen door Dataverse

Eigenaar huidige Codex-uitvoering; branch task/redis-native-replacement-20261115.
Gebruiker autoriseert inventarisatie en migratie van artiestenklikregistratie/top 5
en aanvullende MFA-/beveiligingsopslag naar Dataverse, daarna Redis afsluiten.
Supabase Auth/MFA zelf blijft behouden. Supabase-SQL-intrekking van de vorige taak
is onafhankelijk door de gebruiker uitgevoerd; screenshot bevestigt succes.

Behoud anonieme velden en 31 dagen, geen extra personen/IP/zoektermen. Replay,
45s lease en 30s gebruikte code niet verzwakken; tokens/codes nooit opslaan/loggen.
Actuele rechten, uniekheids-/ETag-bewijs, verval en gelijktijdigheid testen.
Geen nieuwe account-/concertdata of echte testmail. Veilige autoriteitswissel,
kopiecontrole en dienstafsluiting afzonderlijk bewijzen, geen oude grants verlengen.


Implementatie: eigen technische resources in bestaande TechnischeStatus, native
HMAC/CAS MFA-leases en gebruikte codes, idempotente anonieme kliks, begrensde
ETag-vervalopruiming, autoriteitsrouter en nieuwe verse admin/MFA-taak. Geen schema-
wijziging. Documentatie: docs/dataverse/redis-native.md. Redis blijft actief tot
bewezen taakactivering; publicatie alleen is geen omschakeling of dienstafsluiting.

Lokale controles: native/security/OIDC-tests, echte geïsoleerde Redis-test met
read-only snapshot en writefence, Vite-build en Datatransitie-desktop/mobiel geslaagd.
Bestaande Supabase SDK/challenge/verify, cookies en previewgrenzen blijven getest.
Fysieke Dataverse-expiratie is periodiek; logisch verval direct. Leases/replay gebruiken
native modifiedon met conservatieve seconde marge, geen taakgrantverlenging.
