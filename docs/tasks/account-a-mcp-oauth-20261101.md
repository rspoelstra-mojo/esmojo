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
