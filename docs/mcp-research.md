# ESMOJO Onderzoek — OAuth MCP-koppeling

## Toevoegen in het andere ChatGPT-account

- Naam: ESMOJO Onderzoek
- Server-URL: https://esmojo.nl/api/mcp
- Authenticatie: OAuth (niet ‘Geen authenticatie’)
- Scope: esmojo.research; eventueel offline_access wanneer het platform dat vraagt.
- Metadata: https://esmojo.nl/.well-known/oauth-authorization-server
- Resource metadata: https://esmojo.nl/.well-known/oauth-protected-resource

De server ondersteunt stateless Streamable HTTP/JSON, MCP 2025-03-26,
2025-06-18 en 2025-11-25. Geen tunnel, nieuw Google-account of ruwe token invoeren.
OAuth-clientregistratie verloopt via de beveiligde protocolflow (DCR), met PKCE
S256 verplicht, resourcebinding en exacte vooraf toegestane callback-URLs:
https://chatgpt.com/connector_platform/oauth_redirect en de gelijknamige
https://chat.openai.com-route. Geen URL-wildcards of vrij aangeleverde hosts.
Als het platform een andere callback gebruikt: meld de exacte niet-geheime URL;
verruim de lijst niet zonder een gecontroleerde wijziging.

ChatGPT opent de toestemmingspagina van ESMOJO. Log in ESMOJO in met een actief
beheerdersaccount en authenticator. Keer terug naar het toestemmingstabblad en
kies ‘Toestemming geven en verbinden’. De pagina hergebruikt de bestaande
versleutelde sessiecookie via de bestaande restore-route; tokens blijven alleen
tijdens die handeling in geheugen. De server controleert Supabase, MFA en de
actuele beheerdersrol uit Drive opnieuw. Geen toegang voor gewone gebruikers.

Acties: concerts_on_date, resolve_concert, research_context, research_prompt,
read_research en save_research. De datumactie leest alleen de actieve importindex;
checkedAt is de importtijd, geen livegarantie. Controleer actuele officiële MOJO-
detailpagina's en volledige agenda bij een dagelijkse T+45-selectie. De import
draait zelf rond 12:00; een onderzoekstaak op hetzelfde tijdstip kan een oudere
index aantreffen. Bij bron-/importverschil niet ‘geen concert’ concluderen, maar
de blokkade melden of een door de gebruiker goedgekeurde herstelrun uitvoeren.

## Beveiliging en classificatie

Op 1 november 2026 expliciet goedgekeurd: OAuth-koppelgegevens zijn Vertrouwelijk,
opslag uitsluitend in Drive, verwerking via Vercel. Het register
_esmojo_mcp_oauth_v1.json staat rechtstreeks in de bestaande vaste ESMOJO-root,
afzonderlijk van Productie en de accountprofielen. Het bevat clientregistraties,
toestemmingen, token-/codehashes, vervaltijden en minimale technische metadata.
Geen ruwe toestemmingcodes, toegangstokens, refresh-tokens of clientgeheimen in
Drive. Geen logs van codes, tokens, Authorization-headers, bodies of profielen.
Gebruik ook geen aanvullende observability die OAuth-query's/bodies vastlegt.
OAuth/DCR-responses gaan uitsluitend naar de protocolclient via HTTPS/no-store;
de betreffende client bewaart zijn eigen credential in zijn beveiligde verbinding.

Alleen ESMOJO-servercode gebruikt de bestaande GOOGLE_DRIVE_SCRIPT_URL en
GOOGLE_DRIVE_SHARED_SECRET. De server geeft geen Drive- of onderzoekstoken door
aan ChatGPT. De bestaande ESMOJO_RESEARCH_TOKEN blijft voor de oude brugclient;
dit is geen OAuth-token en wordt op /api/mcp geweigerd. Er zijn geen extra
Vercel-secrets nodig. Zonder bestaande configuratie falen de routes gesloten.

Toestemmingcodes: éénmalig, vijf minuten, gebonden aan client, exacte redirect,
resource en S256-verifier. MCP-access: maximaal één uur. Refresh: roterend,
maximaal 90 dagen vanaf toestemming, geen glijdende verlenging; hergebruik van
een recent gebruikt refresh-token trekt de hele grant in. De laatste 128 hashes
worden voor replaydetectie bewaard; oudere onbekende tokens worden geweigerd.
Code-replay trekt de daarop gebaseerde grant in. Clientauth kan none (public
client met PKCE), client_secret_post of client_secret_basic zijn. Secrets alleen
eenmaal in DCR-response, alleen hun hashes in het register.

Iedere MCP-aanvraag controleert tokenstatus én huidige actieve beheerdersrol.
De website-login blijft 72 uur geldig; de afzonderlijk goedgekeurde OAuth-
verbinding heeft zijn eigen levensduur voor achtergrondwerk. Intrekken:
https://esmojo.nl/api/mcp-oauth?action=manage → aanmelden als beheerder →
‘Alle onderzoeksverbindingen van mijn account intrekken’. Dit verwijdert geen
onderzoeksbestanden en trekt geen grants van andere beheerders in.

De authstore gebruikt ondertekend Apps Script-verkeer met aparte actionbinding,
nonce/replaycontrole en de bestaande UserLock. Een vaste private Drive-file,
controle op dubbele registers, bounds op clients/codes/grants en maximaal 2 MB.
DCR accepteert alleen de vaste ChatGPT-callbacks; maximaal 200 actieve/recente
registraties. Deze grenzen voorkomen onbegrensde opslag maar zijn geen volledige
publieke DoS-bescherming. Ongebruikte registraties worden na één dag bij volgende
mutaties opgeruimd; verlopen codes/grants eveneens. Geen cron-opruiming nodig.

## Opslag en compatibiliteit

De bestaande onderzoeksservice blijft gezaghebbend voor de parentketen en eerste
reeksdatum. Geen vrije bestandsnamen, IDs, paden, updates of delete. save_research
valideert de volledige originele vraag, drie Markdown-secties, woordlimieten,
bronverwijzingen en transportgrenzen. De feitelijke onderzoeksinhoud blijft de
verantwoordelijkheid van de agent. Na schrijven wordt het canonieke antwoord
teruggelezen en veld voor veld vergeleken; alleen dan verified=true.

De JSON-bestanden behouden het bestaande schema: managedBy=ESMOJO/Research-v1,
schemaVersion=1, classification=openbaar en status=concept. Identieke retries
zijn veilig; afwijkende bestaande inhoud geeft CONFLICT. De MCP-server verandert
geen onderzoekspagina, ticketinformatie, bezoekersgegevens of bestaande resultaten.

De elf originele prompts en zelfstandige lokale skill zijn nu ook in de gedeelde
repository opgenomen voor de MCP-promptactie. Ze waren eerder alleen lokaal
voorbereid. Dit is geen herhaling van eerdere websiteaanpassingen.

## Agentopdracht na verbinden

> Gebruik ESMOJO Onderzoek uitsluitend voor openbare concerten en de elf
> onderzoeksantwoorden. Controleer dagelijks om 12:00 Europe/Amsterdam de volledige
> MOJO-agenda op Gashouder Amsterdam, precies 45 kalenderdagen vooruit. Gebruik
> concerts_on_date voor exacte bestaande IDs; controleer importtijd en actuele
> officiële bronnen. Geen gegokte IDs of verwarring met het eerstvolgende concert.
> Vraag research_context op, lees bestaande antwoorden en sla die over. Haal voor
> iedere ontbrekende vraag de volledige actuele research_prompt op, voer echt
> webonderzoek uit, valideer en gebruik save_research. verified=true is verplicht.
> Algemene informatie staat bij de eerste showdatum van de reeks; behoud alle
> bestaande bestanden. Geen proefantwoorden, overschrijven of websitewijzigingen.
> Koppel de MCP-app daadwerkelijk aan de geplande uitvoering. Test eerst
> alleen-lezen tijdens een geplande run. Claim geen automatische werking voordat
> die concrete run de tools echt kan aanroepen. Vraag geen credentials in chat.

## Publicatie en testen

Beide componenten zijn nodig: Vercel-routes én nieuwe McpAuth.gs via de bestaande
Apps Script-deploymentworkflow. Geen nieuwe deployment-ID of Google-scope.
De Apps Script-code is geen terugkeer van oude Google-OAuth-instelroutes: dit is
een eigen ESMOJO OAuth-provider voor beperkte onderzoeksautorisatie.

Offline: node server/mcp.test.js, node server/research.test.js,
node .agents/skills/esmojo-concertonderzoek/scripts/workflow.test.mjs en de
bestaande relevante account/Apps Script/deploymenttests. Geautomatiseerde tests
gebruiken uitsluitend lokale fixtures en gesimuleerde Drive.

Live zonder gebruikersverbinding: discovery ophalen, anonieme MCP-aanvraag moet
401 zijn met WWW-Authenticate, verkeerde Origin moet 403 zijn. Met de bestaande
brugclient mag een alleen-lezen datum/contextcontrole worden gedaan. Geen echte
code/clientregistraties of fictieve researchwrites aanmaken als deploymentproef.
De eerste echte OAuth-koppeling moet vanuit het andere account plaatsvinden.
Daarna zijn initialize, tools/list, prompt en datum/context read-only te testen.
Of deze app bij geplande ChatGPT-runs beschikbaar is en schrijftoegang zonder
interactie krijgt, kan uitsluitend in dat account worden vastgesteld. MCP zelf
maakt geen scheduler en voegt geen webzoekfunctie toe.
