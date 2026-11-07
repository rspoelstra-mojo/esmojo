# TOTP-verificatie en veilige activering

De officiële Supabase SDK maakt de challenge en verifieert de code. Het
TOTP-geheim en de vergelijking blijven bij Supabase Auth. Gebruik de ingebouwde
Auth-rate limits; deze wijziging introduceert geen eigen TOTP-algoritme of
kunstmatige vertraging. Alle netwerkverzoeken zijn asynchroon en begrensd.

## Upstash toevoegen

Verbind in Vercel bij ESMOJO een Upstash Redis-database, bij voorkeur nabij de
function-regio. Gebruik uitsluitend Production-servervariabelen:
`UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` (met schrijfrechten).
De integratievarianten `KV_REST_API_URL` en `KV_REST_API_TOKEN` werken ook.
De bestaande `SUPABASE_SECRET_KEY` moet een moderne `sb_secret_`-sleutel zijn.
Deze waarden nooit in chat, broncode, workflowlogs of een `VITE_`-variabele zetten.

Laat `MFA_REPLAY_ENABLED` eerst weg of op `false`. Publicatie is dan compatibel
met bestaande aanmeldingen en gebruikt afzonderlijk SDK `challenge()` en
`verify()`. Er is in deze fase nog geen gedeelde Redis-replayblokkade.

Voer na publicatie op main de handmatige workflow **Check MFA replay cache** uit.
Deze schrijft en verwijdert alleen een willekeurige technische probesleutel,
zonder gebruikersinformatie of codes. De workflow rapporteert uitsluitend
booleans, geen geheimen. `redisReady` en `secretKeyReady` moeten true zijn.

Schakel in Supabase Auth de vertrouwde IP-address forwarding in voor de secret
API key. De server geeft het door Vercel vastgestelde client-IP door via
`Sb-Forwarded-For`; beide MFA-aanroepen komen vanaf dezelfde route. Zonder deze
Supabase-instelling zouden serverinstanties een gedeeld IP-rate-limit krijgen.
De technische Redis-check bewijst deze Supabase-instelling niet.

Zet pas daarna `MFA_REPLAY_ENABLED=true` in Vercel Production en redeploy.
Controleer één echte aanmelding, een ongeldige code, en herstel van een bestaande
sessie. Herhaal een geaccepteerde code binnen 30 seconden: de route moet 409
`MFA_REPLAY` teruggeven. Deel hiervoor nooit codes of tokens in chat/logs.
Bij een storing kan de beheerder de flag uitzetten en redeployen; dit schakelt
de extra applicatiepoort uit, Supabase MFA zelf blijft verplicht.

## Gedrag en grenzen

Redis bewaart een HMAC-vingerafdruk per gebruiker/factor/code, met 30 seconden
TTL na succesvolle verificatie. Een atomaire lease van 45 seconden voorkomt
parallelle verificaties voor hetzelfde account. Alle betrokken sleutels delen
één Redis hash-slot; de Lua-transactie leest op de primaire node. Geen ruwe code,
TOTP-geheim, IP-adres, token of accountprofiel wordt in Redis opgeslagen.

Een onzekere provideruitkomst wordt niet automatisch herhaald: de lease verloopt.
Bij een Redis-storing weigert de ingeschakelde poort verdere verificatie veilig;
er is geen onbetrouwbare fallback naar procesgeheugen. Een gebruikte code wordt
vóór challenge/verify geweigerd. Eerst controleert Supabase de JWT-identiteit;
de route leest geen Supabase-tabellen of Drive-bestanden.

De publieke Supabase Auth-endpoints bestaan nog steeds. Daarom vereist private
ESMOJO-toegang daarnaast een versleuteld HttpOnly/Secure/SameSite-cookie van de
applicatiepoort, gebonden aan gebruiker en Auth-sessie. Bestaande versleutelde
72-uurs sessiecookies blijven geldig. Dit is extra bescherming van ESMOJO-toegang,
geen claim dat de publieke Auth-dienst zelf uitsluitend via onze route bereikbaar is.

Na MFA combineert `/api/access?action=login` de actuele Drive-rechtencontrole en
sessiecookie in één ronde. Toegang wordt pas daarna vrijgegeven. Accountprofielen
blijven in Drive; geen nieuwe persistente browseropslag. Bestaande sessieduur en
activatie blijven behouden. Google Drive wordt niet tijdens TOTP-verificatie gelezen.

Preview-aanmeldingen gebruiken dezelfde productie-MFA-poort, zodat deze geen
omweg rond de replaybescherming worden. Alleen het versleutelde MFA-bewijs
wordt bij beveiligde productie-reads doorgestuurd; geen refresh-cookie of
Drive-sleutel. Business-writes blijven uitgeschakeld. Een oude previewsessie
zonder dit bewijs kan na inschakelen een nieuwe aanmelding vereisen.
