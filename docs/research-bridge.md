# Onderzoeksbrug (voorbereid; nog niet live geactiveerd)

Route: uitvoeromgeving → POST https://esmojo.nl/api/research → ondertekend Apps
Script → bestaande concertmap onder ESMOJO/Productie. Onderzoek is Openbaar,
maar de route zelf is niet anoniem toegankelijk. Geen nieuwe websitepagina's,
Supabase-tabellen of Google OAuth-scopes. De bestaande Drive- en accountsleutels
blijven uitsluitend waar ze nu staan; ze worden niet naar deze omgeving gekopieerd.

## Activatie na toestemming voor publicatie

1. Maak in een wachtwoordmanager een cryptografisch willekeurige sleutel van
   32 bytes, weergegeven als 64 hextekens. Deel de waarde NIET in de chat.
2. Vul die waarde in Vercel voor dit project als server-only
   `ESMOJO_RESEARCH_TOKEN` in, alleen voor Production. Geen VITE_-prefix.
3. Vul dezelfde waarde veilig in bij de gelijknamige secretvereiste in deze
   omgevingsinstellingen. De bestemming is uitsluitend esmojo.nl. Dat kan een
   proxy-placeholder in het proces opleveren; het script ondersteunt dat.
4. Controleer de conceptinstellingen. Publicatie/activatie en uitrol van code
   vereisen eerst een nieuwe opdracht, conform het huidige publicatieverbod.
   Publiceer daarna de code via de bestaande gecontroleerde main/Apps Script-flow.
   Het opslaan van de conceptvereiste maakt de secret of de route niet actief.
5. Controleer eerst `resolve "Puscifer" "Gashouder"`. Voer pas na expliciete
   afspraak een echte schrijf-/terugleestest uit. Gebruik geen nepantwoord in
   onderzoek_01.json van een echte artiest; dat slot wordt niet overschreven.

De token geeft uitsluitend resolve/context/read/write voor bestaande concerten
en elf vaste onderzoeksslots. Geen directory browsing, vrije Drive-ID's,
accounttoegang, delete, update of overschrijven. Rotatie: vervang de waarde in
Vercel en in de omgevingssecret; oude tokens worden direct geweigerd zodra de
serverconfiguratie opnieuw is uitgerold. Productieroute weigert zonder geldige
configuratie (503) en zonder juiste token (403). Browser-Origin wordt geweigerd.

## API en JSON

Alle aanvragen zijn POST met Content-Type application/json en een Bearer-token.
Body maximaal 40000 UTF-8-bytes. Alle responses zijn no-store. Geen payloads,
Authorization-headers, tokenwaarden of ruwe providerfouten loggen.

| operation | velden | werking |
| --- | --- | --- |
| resolve | artist, venue | eerstvolgend toekomstig concert; vraag bij ambiguïteit |
| context | concertId | geselecteerde datum, algemene bestemming, reeks en aanwezige vragen |
| read | concertId, questionNumber | uitsluitend het betreffende onderzoeks-JSON |
| write | concertId, questionNumber, result | maak vraagbestand eenmalig; identieke retry toegestaan |

`result` bevat question, answer (Markdown), sources [{title,url}], researchedAt
(UTC ISO-datum). Dit is alleen het transportformaat; de echte elf prompts moeten
nog door de gebruiker worden aangeleverd. Er worden geen vragen verzonnen.
Bronnen zijn HTTPS-links en worden niet door de uploadserver opgehaald.

Apps Script voegt schemaVersion=1, managedBy=ESMOJO/Research-v1,
classification=openbaar, status=concept, de canonieke concertId en questionNumber
toe. De bestemming is altijd de bestaande generalFolderId van de eerste show.
De volledige Drive-parentketen wordt gecontroleerd. Vaste namen zijn
onderzoek_01.json t/m onderzoek_11.json; een afwijkend gelijknamig bestaand
bestand veroorzaakt CONFLICT, geen overschrijving. Ook al bestaande research
blijft concept. Op verzoek van de gebruiker toont het ingelogde Showprofiel de
AI-inhoud alleen-lezen; eigen samenvatting en afrondstatus blijven afzonderlijk.

Een later toegevoegde eerdere showdatum verplaatst uitsluitend eigen beheerde
onderzoeks-JSON mee naar de nieuwe algemene map. De canonical concertId verandert
mee, onderzoeksinhoud en onderzoeksdatum blijven gelijk. Andere bestanden
of dubbele slotbestanden worden niet samengevoegd; bij conflict stopt de import.
Researchwrites en concertimport delen de owner-UserLock; accountverkeer gebruikt
de afzonderlijke ScriptLock en blijft beschikbaar.

## Client en skill

`node tools/research/client.mjs resolve "Puscifer" "Gashouder"`

`node tools/research/client.mjs save "concertId" 1 "/tmp/antwoord-01.json"`

De client gebruikt curl zonder shell en zonder gebruikers-curlrc; Authorization
en JSON gaan via stdin, niet via argumenten of bestanden. Hij behoudt de bestaande
proxy/CA-instellingen en volgt geen redirects. Alleen esmojo.nl is toegestaan.
Na opslaan leest hij terug en vergelijkt alle onderzoeksvelden. Pas dan geeft
hij verified=true. Bij een fout worden uitsluitend veilige foutcodes getoond.

De lokale skill staat in .agents/skills/esmojo-onderzoek/SKILL.md. Een agent kan
die in deze repository volgen; dit is niet automatisch een voor iedere ChatGPT-
chat geïnstalleerde skill. De huidige sessie moet tevens webonderzoek kunnen
doen; deze brug voegt geen browse- of Deep Research-capaciteit toe.

Controles: node server/research.test.js en node tools/research/client.test.mjs.
Die gebruiken een gesimuleerde Drive en testcredentials; geen echte uploads.
