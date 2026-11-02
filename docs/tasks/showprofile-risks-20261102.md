# Vertrouwelijke showprofiel-risicoanalyse via MCP

Eigenaar: Codex. Branch: task/showprofile-risks-20261102.

Voeg afgebakende MCP-acties toe voor nieuwe definitieve PDF-versies, PDF-tekst met paginaverwijzingen, de vaste risicoanalyseprompt en append-only opslag plus terugleesverificatie in de canonieke showmap. Elk risico is een afzonderlijk onderbouwd JSON-item. De gebruiker heeft de resultaten expliciet Vertrouwelijk verklaard; Drive-opslag en bestaande Vercel/MCP-verwerking. Geen uitbreiding van het onderzoekstoken of anonieme toegang, geen wijziging van bestaande elf onderzoeksbestanden, geen automatische ChatGPT-uitvoering claimen.

Verwachte onderdelen: server/mcp-api.js, eigen risicoanalysemodules/tests, Apps Script-dispatch en eigen opslagmodule/validators, dependency voor PDF-tekstextractie, documentatie, CI en websiteversie. Diensten: bestaande Vercel- en Apps Script-deployments, bestaande Drive-showmappen.
