# MCP toestemming per tool en snellere PDF-broncontrole

Eigenaar: Codex. Branch: task/mcp-tool-consent-20261102.

De gebruiker ziet showprofielacties, maar de uitvoering vervolgt niet na toestemming. De screenshot bevat geen serverresultaat, dus de exacte oorzaak in het gekoppelde account is nog niet vastgesteld. Gevonden protocoltekort: scopefouten gebruiken alleen HTTP 403; ChatGPT Apps ondersteunt expliciet error-toolresultaten met _meta.mcp/www_authenticate. Voeg dit plus OAuth-securitySchemes per tool toe, zonder scopes of grants op te waarderen. Hergebruik tevens het reeds gevalideerde Drive-doel in de PDF-snapshot om dubbele parentketen-/indexreads te vermijden.

Bestanden: MCP API/toolmetadata/tests, PDF-snapshothelper en risico-opslagaanroep, docs, index.html. Vercel én bestaande Apps Script-deployment. Geen inhoud of credentials in logs; geen echte testanalyses of grantmutaties tijdens deploymentcontrole.
