# TOTP-verificatie, replaybescherming en loginlatentie

Eigenaar Codex. Gebruiker vraagt officiële SDK challenge/verify, nette async
fouten, een extra 30s-replaylaag, geen blokkerende Drive-calls en server-only
geheimen. Gebruiker kiest expliciet Upstash Redis. De externe databasekoppeling
moet via Vercel worden ingesteld; beheerconnector hier uitgeschakeld.

Ontwerp: officiële Supabase-verificatie, gedeelde atomaire Redis-codeclaim met
HMAC-vingerafdruk (geen ruwe codes/geheimen), na succes 30s TTL, servergebonden
MFA-bewijs tegen directe omzeiling van de app-route, oude veilige sessies behouden.
Inschakelen alleen na configuratie/livecheck; geen onveilige geheugenfallback.
Afzonderlijke async foutafhandeling en behoud 72h-/MFA-/Drive-modulecontrole.

Scope eigen MFA client/servermodules, sessiecookies/aanmeldrondes, smalle
accounts-api-integratie, configuratiedocumentatie en security-/browsertests.
Geen profielcache of bedrijfsgegevens naar Redis, geen OTP's/tokens in logs.
