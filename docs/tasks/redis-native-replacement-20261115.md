# Redis vervangen door Dataverse

Eigenaar huidige Codex-uitvoering; branch task/redis-native-replacement-20261115.
Gebruiker autoriseert inventarisatie en migratie van artiestenklikregistratie/top 5
en aanvullende MFA-/beveiligingsopslag naar Dataverse, daarna Redis afsluiten.
Supabase Auth/MFA zelf blijft behouden. Supabase-SQL-intrekking van de vorige taak
kan onafhankelijk door de gebruiker worden uitgevoerd; productiebevestiging wacht.

Behoud anonieme velden en 31 dagen, geen extra personen/IP/zoektermen. Replay,
45s lease en 30s gebruikte code niet verzwakken; tokens/codes nooit opslaan/loggen.
Actuele rechten, uniekheids-/ETag-bewijs, verval en gelijktijdigheid testen.
Geen nieuwe account-/concertdata of echte testmail. Veilige autoriteitswissel,
kopiecontrole en dienstafsluiting afzonderlijk bewijzen, geen oude grants verlengen.
