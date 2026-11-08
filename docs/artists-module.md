# Artiestenmodule

De beveiligde artist-catalogue Drive-operatie verzamelt alle namen uit de volledige
Productie- en OnTrack-concertindices, herkende CSV-rapportages en historische
PDF-/online-rapportregistraties. Geen selectie op datum, actieve import of zaal.
Alleen naam en SHA-256-gebaseerd stabiel artiest-ID verlaten deze metadata-operatie;
geen CSV-inhoud, bronbestandsnamen, Drive-IDs, ontvangers of accountrelaties.
Case/spaties/NFKC worden genormaliseerd; geen fuzzy samenvoeging of verzonnen namen.
De eerste canonieke schrijfwijze uit de concertcatalogus heeft voorrang.

Een gedeelde leesbare weergavelaag in Node en de browser verwijdert duidelijke
tour-/uitvoeringstoevoegingen en decoratieve randen. Bevestigde namen: Yousuke
Yukimatsu, U2 en New Wave. Betekenisvolle tekens zoals in AC/DC en P!nk blijven
behouden; onbekende omschrijvingen worden niet op goed geluk verwijderd.
Concert-/rapportbronnen blijven ongewijzigd. Gelijk geworden namen krijgen één
canoniek naam-ID; oorspronkelijke IDs blijven als aliassen bereikbaar. Bestaande
Redis-kliks worden bij lezen opgeteld zonder records of bewaartermijnen te wijzigen.
Klikretries behouden het oorspronkelijk aangevraagde ID en dezelfde UUID.

Publieke routes gebruiken leesbare namen zonder spaties/diakritische tekens:
/artiest/u2, /artiest/newwave en /artiest/yousukeyukimatsu. Echte naamcollisies
krijgen een korte unieke ID-suffix. Oude ID-links blijven werken en worden via
replaceState vervangen, zonder extra navigatie of klikpunt. Slugs en aliastabellen
worden niet persistent opgeslagen; de menucache houdt uitsluitend namen/IDs.

Node en Drive controleren onafhankelijk de actuele Artiestenrechten. De nieuwe
accounts-acties artist-menu, artist-ranking, artist-detail en artist-view vereisen
activering/MFA/actuele sessie. Shows- of Rapportagesrechten verlenen geen toegang.
Een directe URL/verversing is een metadataread en levert geen punt op.

Meest bekeken is gezamenlijk voor de Artiestenmodule. Iedere echte linkklik
(inclusief toetsenbord en openen in nieuw tabblad) krijgt een willekeurige UUID.
Alleen artist-view schrijft een punt. Herhalen met dezelfde UUID is atomair
idempotent; dezelfde UUID bij een ander artiest-ID wordt geweigerd.
Redis TIME bepaalt het exacte 31*24-uurvenster, niet een tijdstip uit de browser.
Ieder klikrecord bevat alleen artiest-ID en heeft een eigen TTL van 31 dagen.
De technische tijdindex bevat willekeurige UUIDs, wordt op toegang opgeschoond en
vervalt bij uitblijven van activiteit; verlopen klikrecords tellen ook bij een
nog aanwezige indexverwijzing nooit mee. Ranking leest in begrensde MGET-batches,
buiten een lange Lua-lus, en geeft alleen positieve geaggregeerde aantallen terug.
Geen accountnamen/IDs, IP's, zoektermen of persoonsanalyses in Redis of logs.

Alle artiesten staan alfabetisch; Meest bekeken sorteert aflopend op aantal en
bij gelijke aantallen alfabetisch. Maximaal vijf artiesten met minimaal één punt.
Namen/IDs worden na actuele sessie-/modulecontrole direct uit de expliciet
goedgekeurde lokale menucache hersteld. Top 5 en aantallen blijven sessiegeheugen.
Metadata en ranking vernieuwen onafhankelijk bij openen/focus/zichtbaar worden en
elke 30 seconden. Binnen dezelfde module worden verse menugegevens hergebruikt;
iedere artiestklik start niet opnieuw alle menureads. Een defecte ranking blokkeert artiestkeuze of detailreads niet.
De pagina wacht niet op klikregistratie. Die sluit aan ná de metadataread, met
één herpoging en dezelfde UUID. De bevestiging bevat meteen de bijgewerkte top 5,
zodat daarvoor geen extra authenticatie-/API-read nodig is. Oudere rankingreads
kunnen deze bevestigde stand niet overschrijven. Bij slechts een rankingstoring
blijft een succesvol geregistreerd punt bevestigd;
keepalive behoudt het kleine verzoek bij verlaten. Reads/kliktelemetrie worden
niet als een te bevestigen gebruikersformulier behandeld.

Zonder selectie staat Kies eerst een artiest gecentreerd in de fluid contentbox.
Artiestpagina bevat voorlopig alleen de naam; verdere inhoud volgt apart.
Herbruikbare submenu-links houden laadiconen ook tijdens rankingverversingen.
Nieuwe brongegevens worden op de achtergrond zichtbaar. Een eerste apparaat zonder
menucache moet de catalogus eenmaal ophalen; tijdens die read staat het bestaande
laadrondje bij Artiesten, zonder laadtekst in de contentbox.

Validatie: gedeelde catalogus- en gegenereerde Drive-validator, onafhankelijke
module/MFA-tests, sessie-/cache-/whitelisttests, echte lokale Redis-tests met
concurrente retries, 31-daags venster en TTL; browsercontroles met synthetische
responses in beide thema's op mobiel/desktop. Geen echte gebruikerskliks of
productierapporten toegevoegd. Bestaande previewomgevingen blijven alleen-lezen:
artist-view is daar geblokkeerd door de bestaande previewguard.

CI start een geïsoleerde Redis-service zonder hostpoorten. Dezelfde native test
wordt via een Redis CLI-wrapper in die container uitgevoerd. Lokaal kan deze test
worden gestart met ESMOJO_TEST_REDIS_CLI en optioneel ESMOJO_TEST_REDIS_PORT tegen
een eigen loopback-testserver; zonder die expliciete binding wordt alleen het
native integratiedeel overgeslagen. Geen productie-Redis-sleutels voor tests.
