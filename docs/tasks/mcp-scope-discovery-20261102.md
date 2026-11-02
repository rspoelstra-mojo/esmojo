# MCP tooldiscovery en aanvullende OAuth-toestemming

Eigenaar: Codex. Branch: task/mcp-scope-discovery-20261102.

Probleem: de authchallenge noemt uitsluitend esmojo.research en oude grants zien de nieuwe tools niet. Een client die oude scopes hergebruikt ontdekt daardoor geen nieuwe acties en kan geen extra toestemming aanvragen.

Oplossing: stabiele volledige toollijst voor geauthenticeerde actieve beheerders; per actie blijven scopes verplicht. Ontbrekende scope geeft HTTP 403 insufficient_scope met de vereiste scopes voor OAuth-herautorisatie. Nieuwe aanmeldchallenge noemt beide ondersteunde scopes. Geen bestaande grant opwaarderen, geen vertrouwelijke inhoud zonder de nieuwe scope. Wijzig server/mcp-api.js, MCP-regressietests, docs en websiteversie. Alleen Vercel-publicatie; bestaande Apps Script-rechten blijven intact.
