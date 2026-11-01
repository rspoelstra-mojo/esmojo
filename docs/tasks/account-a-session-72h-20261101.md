# Vaste ingelogde sessie van 72 uur

Eigenaar: account A. Gebruiker vraagt ingelogd te blijven na verversen/browser
sluiten, maximaal 72 uur vanaf de wachtwoordaanmelding; daarna automatisch uit.
Een versleutelde HttpOnly/Secure/SameSite-cookie bewaart alleen het noodzakelijke
sessiegeheim met vaste eindtijd. Geen profielgegevens of tokens in localStorage.
Herstellen valideert Supabase, TOTP en het actuele actieve Drive-profiel opnieuw.
Vernieuwen schuift de eindtijd niet op. Uitloggen wist cookie en geheugensessie.

Controles: build en 61 server-/regressietests geslaagd. Chromium met fictieve
authenticatie: cookie HttpOnly/Secure, herstel na verversen zonder nieuwe
wachtwoordaanmelding, 72 uur versneld verlopen, applicatie verborgen en cookie
gewist. Geen sessietokens in localStorage/sessionStorage. Browserkloktesten
vervangen geen echte wachtperiode van drie dagen.
