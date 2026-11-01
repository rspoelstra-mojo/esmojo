# Correctie ChatGPT OAuth-callback

Eigenaar account A. Branch task/account-a-mcp-callback-20261101.

Gebruiker meldt afwijzing bij MCP-appregistratie. Live discovery is bereikbaar
en de screenshot bevestigt correcte eindpunten, DCR en scope. Concrete fout:
de server staat /connector_platform/oauth_redirect toe, terwijl de actuele
officiële OpenAI-authdocumentatie /connector_platform_oauth_redirect voorschrijft
voor servers met RFC 9207 issuer-identificatie. Een verzoek met die officiële
callback is vóór de correctie live geweigerd met invalid_client_metadata (400),
zonder een registratie aan te maken.

Scope: exacte callbacklijst in Vercel OAuth-handler en Apps Script-authstore,
regressietests en documentatie. Geen wildcards, geen anonieme MCP-toegang, geen
wijziging van onderzoeksresultaten of OAuth-grants. Bestaande ouder gespelde
callbackpaden blijven uitsluitend als beperkte compatibiliteitsoptie behouden.
Nieuwe OAuth-koppeling zelf wordt door gebruiker vanuit ChatGPT gestart.

Bron: https://developers.openai.com/apps-sdk/build/auth/ — geraadpleegd
1 november 2026. Publicatie via main en bestaande Apps Script-deployment.

Regressie: volledige lokale DCR → PKCE → tokenflow draait nu met de officiële
underscore-callback door zowel Vercel-handler als gesimuleerde Apps Script-store.
Extra test weigert slashvarianten met toevoegingen, query/fragment, HTTP en
lookalike-hosts. Vijftien MCP/OAuth-tests, bestaande research/Apps Script/publicatie-
tests, build en diffcontrole geslaagd; geen echte client of onderzoeksdata geschreven.
