# MCP-onderzoeksserver met OAuth

Eigenaar: account A / deze chat. Branch: task/account-a-mcp-oauth-20261101.

Opdracht: beperkte MCP-server op Vercel, OAuth-koppeling voor het andere ChatGPT-account,
exacte datumselectie uit de bestaande concertindex, bestaande onderzoeksopslag en readback.
Geen wijzigingen aan de onderzoekspagina's of bestaande onderzoeksresultaten.

Gebruiker heeft OAuth-koppelgegevens (clients, codes, tokens) op 1 november 2026
expliciet als Vertrouwelijk goedgekeurd: uitsluitend opslag in Drive, verwerking
via Vercel, geen logs of onderzoeksbestanden. Nieuwe technische authopslag is
afzonderlijk van Productie en accountprofielen. Geen toegang tot vrije Drive-paden.

Verwachte scope: nieuwe api/mcp- en OAuth-routes, server/mcp- en authmodules/tests,
Google Apps Script-authstore/router, datumquery in onderzoeksservice, metadata,
documentatie en CI. Bestaande Supabase/MFA- en beheerdercontrole hergebruiken.

Publicatie via taak-PR/main; Apps Script via bestaande vaste deploymentworkflow.
Geen productie-writeproef in echte onderzoeksslots; OAuth-koppeling en geplande
uitvoering vereisen later een echte verbinding vanuit het andere ChatGPT-account.

Implementatie: zes stateless MCP-tools, RFC discovery/DCR, verplichte S256 en
resourcebinding, admin+MFA consent, tokenrotatie, Drive-only hashregister en
intrekken. Exacte datumlookup leest de actieve openbare importindex en toont
checkedAt; webcontrole van MOJO blijft nodig. Bestaande servercredentials hergebruikt,
geen nieuwe secrets of website-inhoud nodig. De elf eerder lokaal voorbereide
prompts/validator zijn als centrale MCP-bron toegevoegd, zonder wijzigingen aan
de oorspronkelijke vraagteksten of eerder gemaakte websitefunctionaliteit.

Lokaal geslaagd: 14 nieuwe MCP/OAuth-tests, 11 prompt/format-tests en relevante
account/MFA/sessie-, onderzoeks-, Drive-, Apps Script/publicatie-, Shows-, foto-,
ticketdata- en weergavetests; Vite-build en diff-controle. Alleen gesimuleerde
fixtures, geen echte OAuth-grant of onderzoeksbestand geschreven.
