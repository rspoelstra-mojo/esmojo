# Google Drive: tijdelijke OAuth-setup verwijderd

De gebruiker heeft gevraagd alle tijdelijke Google-instelroutes en bijbehorende
Vercel-variabelen te verwijderen. De routes /api/google/connect en
/api/google/callback, hun implementatie en de bijbehorende tests zijn uit de
code verwijderd. Er is geen publiek Drive-endpoint meer in de huidige broncode.
De verwijderde bestanden blijven herstelbaar via de Git-geschiedenis.

De niet-aangesloten servermodule google-drive.js en zijn tests blijven behouden.
Er is geen actieve bestandsimport of Drive-opslag. Deze module moet opnieuw
worden aangesloten of aangepast voor een nieuwe authenticatiemethode.

## Externe opruiming: nog niet bevestigd

Er is vanuit deze werkmap geen Vercel-beheertoegang. Verwijder in het
Vercel-project esmojo, bij Settings → Environment Variables, de oude
GOOGLE_SETUP_PASSWORD, GOOGLE_CLIENT_SECRET en GOOGLE_REFRESH_TOKEN indien
aanwezig, plus GOOGLE_CLIENT_ID. Controleer alle omgevingen en eventuele gedeelde
bindings. Laat Supabase-variabelen en RESEND_API_KEY staan.

Deploy de opgeschoonde broncode opnieuw na het verwijderen van de variabelen.
Oudere deployments kunnen hun oude code en configuratie behouden: verwijder
oude deployments met deze instelroutes of scherm ze af via deployment protection.
Verwijderde variabelen trekken reeds uitgegeven Google-tokens niet in. Eventueel
verleende Google-toegang en de oude OAuth-client kunnen afzonderlijk bij Google
worden ingetrokken/verwijderd. Die acties zijn niet vanuit deze werkmap uitgevoerd.

## Vervolg

Gedeelde Drives bleken niet beschikbaar. De gebruiker heeft vervolgens een
Apps Script-webapp ingericht en succesvolle bereikbaarheid vanuit Vercel bevestigd
(1092 ms). De tijdelijke verbindingstestpagina is daarna op verzoek verwijderd.
Zie google-apps-script/README.md voor de huidige koppeling. Behoud de bestaande
Apps Script-webapp en haar verbindingsinstellingen; er is nog geen bestandsimport
of opslag geïmplementeerd.
De map 1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk in zakelijke Mijn Drive blijft behouden
en beperkt gedeeld. De gebruiker staat verwerking door Vercel toe met opslag in
Google Drive. Medewerkerslogin en toegangsrechten zijn nog niet aangesloten.
