# Dataverse onderzoeksresultaten: Hatsune Miku-proef

Eigenaar: Codex. Branch: task/dataverse-research-20261111.

Gebruiker geeft opdracht de elf geïmporteerde Markdown-resultaten uit Dataverse
aan de bestaande Hatsune Miku-testshow te koppelen en daar de AI-inhoud te
vervangen. Alleen lezen, achter bestaande account/MFA/Shows-controles.
Geen migratie, automatische schrijftaken, verwijderingen of Graph-koppeling.
Zelfgeschreven samenvattingen en beoordelingen blijven behouden.

Scope: server-side Dataverse-leesadapter, bestaande show-open/profile-read,
concept-/herkomstweergave en gerichte server/UI-tests. De precieze bestaande
showroute is expliciet Hatsune-Miku_AFAS-Live_15112026; geen koppeling op artiestnaam alleen.
Geen onderzoeksinhoud, providerantwoorden of geheimen in repository/logs.

De nieuwe gebruikersopdracht autoriseert deze beperkte leesintegratie met de
bestaande Dataverse-omgeving; vervangt de eerdere beperking tot de lege testtabel
uitsluitend voor de onderzoekstabel en deze testshow.

Aanvulling gebruiker: voor dit AFAS Live-concert mag bij uitzondering dezelfde
showpagina worden aangemaakt. Aanmaak gebeurt idempotent op expliciet openen;
geen wijzigingen aan de normale Gashouder-import of actieve Supabase-opslag.
Dezelfde tabs, eigen analyses, risico's, maatregelen en PDF-functies; Showbeheer
blijft zoals afgesproken uitsluitend voor Gashouder.

De bestaande credentials worden hergebruikt. Dataverse-schema wordt via metadata
gelezen; geen gegokte EntitySetName. Geen inhoudscache op server, wel token/schema
in tijdelijk geheugen. Browser hergebruikt de bestaande showcontext (max15min).
Laatste numerieke versie per bronbestand; conflicterende bestanden per vraag
worden afgewezen. Ontbrekende onderwerpen/fouten geven geen oude Drive-AI terug.

Controles: 129 relevante server-/geheugen-/researchtests, 18 publisher-/Apps
Script-tests, 53 workflow/PDF-tests en de uiteindelijke 91 auth/route/pilottests
slagen (sets overlappen). Browserproef in Chromium: alle11 onderwerpen,
concept/herkomst/importdatum, eigen tekst, veilige Markdown, geen extra reads.
Productiebuild, ES2020-syntaxis van53 Apps Script-bestanden en browserheaders groen.
Geen toegang tot productiegeheimen of ingelogde livepagina in deze cloudomgeving;
werkelijke Dataverse S2S-tabelrechten en live inhoud vereisen de gebruikersproef.
