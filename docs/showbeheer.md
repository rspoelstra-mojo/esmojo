# Showbeheer voor Gashouder

Showbeheer is optioneel en heeft geen invloed op bestaande showafronding,
planning, analyses of rapportages. Alleen de Gashouder-showpagina toont het blok
onder Projectteam. De aanmaak- en statusroute gebruikt de huidige account-,
MFA- en Shows-autorisatie. De externe pagina is de enige nieuwe accountloze
moduleweergave; ze leest geen bestaande showprofielen of rapportages.

## Eenmalige installatie in bestaande Supabase-project

Voer in de SQL Editor van het bestaande ESMOJO-project het volledige bestand
[supabase/migrations/202611100001_show_management.sql](../supabase/migrations/202611100001_show_management.sql)
uit. Het bestand is herhaalbaar en maakt uitsluitend de afzonderlijke
Showbeheer-tabel en pogingsfunctie. Bestaande concerten en berekeningen worden
niet gewijzigd. Geen nieuwe secrets, buckets of providers nodig. De huidige
VITE_SUPABASE_URL en server-side SUPABASE_SECRET_KEY worden hergebruikt.

Deze Codex-omgeving heeft geen Supabase-schemabeheerverbinding. Codepublicatie
past het productieschema niet automatisch aan. Totdat de eigenaar de migratie
uitvoert, toont alleen het Showbeheer-blok een instellingsmelding. De rest van de
showpagina blijft werken. Geef nooit een service-role-key aan de browser of chat.

## Gebruik

1. Open een Gashouder-show en kies Showbeheer aanmaken.
2. De UI toont eerst aanmaken en daarna de daadwerkelijke terugleescontrole.
   Geen gefingeerde percentages. De unieke concertkoppeling maakt herhalen en
   gelijktijdig aanmaken idempotent: bestaande link/pincode worden behouden.
3. De kaart toont de link, Kopieer URL en de pincode. Showbeheer verzenden blijft
   uitgeschakeld; er worden geen e-mails verstuurd.
4. Na een juiste pincode verschijnen de vijf lege blokken. De foto vervaagt;
   gebruikers met verminderde beweging krijgen de overgang zonder animatie.
5. De Gashouderkaart bevat vier lege statusvakken. In deze eerste versie bestaan
   nog geen invulvelden of voltooiingsberekening; alle vier staan Nog niet ingevuld.

## Toegangsgrenzen en opslag

De gebruiker heeft link, pincode en invulstatus Openbaar verklaard en Supabase-
opslag toegestaan. De tabel heeft RLS, geen anon/authenticated-rechten en geen
publieke policies. Alleen Vercel met de bestaande service-role-key kan lezen.
De pincode en linktoken zijn AES-256-GCM-versleuteld; verificatie gebruikt een
server-gepeperde HMAC. Een showlink bevat 256 willekeurige bits in het fragment,
zodat het geheim niet in HTTP-URL's of referrers verschijnt. De PIN heeft exact
zes cijfers, inclusief eventuele voorloopnullen. Geen credentials in logs of
persistente browseropslag. Een wijziging van de serverkey vraagt expliciete
credentialmigratie; verander die niet als onderdeel van deze installatie.

De externe POST-route accepteert alleen eigen origin en exacte open/read-velden,
geen concert-ID, actor, Drive-pad of generieke showoperaties. Tien PIN-pogingen
per link per vijftien minuten, atomair in PostgreSQL; ook nulresultaten/fouten
geven geen toegang. Na verificatie wordt een HttpOnly/Secure/SameSite=Strict-
cookie gezet, alleen voor deze API en deze show, maximaal acht uur. De PIN wordt
op de pagina bij elke nieuwe opening gevraagd. De sessie maakt geen ESMOJO-
account aan en wordt niet door de account-API geaccepteerd. Preview blijft
alleen-lezen. De link blijft beschikbaar; blokkering via enabled=false weigert
ook bestaande externe sessies. Toekomstige inhoud vereist dezelfde sessiecontrole.

## Uitgevoerde controles

- Service- en API-tests: idempotentie/races, veldvalidatie, Gashouderbeperking,
  PIN/link, verlopen/vervalste/verkeerd gekoppelde sessies en fouten gesloten.
- Bestaande account/MFA/activerings-/modulegrenzen ook voor Showbeheer getest.
- PostgreSQL 17: migratie tweemaal, tabel-/RPC-rechten, unieke showkoppeling,
  tienpogingslimiet, verlopen window en uitgeschakelde toegang.
- Browser: 390/768/1440px, licht/donker, PIN plakken, fout/herstel, dubbele submit,
  vaste logopositie, blur, vijf kaarten, aanmaakvoortgang en vier statusvakken.
- Bestaande volledige Node-checkreeks, submenu- en artiestlandingcontrole, build
  en git diff --check. Productieschema en ingelogde liveflow blijven pas te
  bevestigen na uitvoering van de migratie door de eigenaar.
